package main

import (
	"context"
	"log/slog"
	"os"
	"strings"
	"sync"
	"time"

	"gopkg.in/yaml.v3"
)

type supportPromptConfig struct {
	Instructions             string   `yaml:"instructions"`
	EscalationTriggerPhrases []string `yaml:"escalation_trigger_phrases"`
	EscalationNumber         string   `yaml:"escalation_number"`
}

type agentTurn struct {
	Role string
	Text string
}

type agentState struct {
	Enabled            bool
	Speaking           bool
	Processing         bool
	PendingUtterances  []string
	History            []agentTurn
	LastUserTranscript string
	LastUserAt         time.Time
}

var (
	agentStatesMu sync.Mutex
	agentStates   = map[string]*agentState{}
)

func getAgentState(callControlID string) *agentState {
	agentStatesMu.Lock()
	defer agentStatesMu.Unlock()
	st, ok := agentStates[callControlID]
	if !ok {
		st = &agentState{}
		agentStates[callControlID] = st
	}
	return st
}

func removeAgentState(callControlID string) {
	agentStatesMu.Lock()
	defer agentStatesMu.Unlock()
	delete(agentStates, callControlID)
}

var (
	supportPromptOnce sync.Once
	supportPrompt     supportPromptConfig
)

func loadSupportPrompt() supportPromptConfig {
	// Default: safe, phone-friendly.
	fallback := supportPromptConfig{
		Instructions:             "You are a friendly and professional customer support representative for Jah and Co, an e-commerce platform. Keep answers brief and conversational for a phone call. Never use markdown or lists. If the caller asks to speak to support, offer to transfer them. If you are uncertain, say so and offer to transfer.",
		EscalationTriggerPhrases: []string{"transfer me", "speak to someone", "talk to a person", "live agent", "human agent", "real person", "connect me", "connect to support"},
		EscalationNumber:         "",
	}

	path := "prompts/support.yaml"
	b, err := os.ReadFile(path)
	if err != nil {
		slog.Warn("Support prompt not found; using fallback", "path", path, "err", err)
		return fallback
	}
	var cfg supportPromptConfig
	if err := yaml.Unmarshal(b, &cfg); err != nil {
		slog.Warn("Failed to parse support prompt; using fallback", "path", path, "err", err)
		return fallback
	}
	if strings.TrimSpace(cfg.Instructions) == "" {
		cfg.Instructions = fallback.Instructions
	}
	if len(cfg.EscalationTriggerPhrases) == 0 {
		cfg.EscalationTriggerPhrases = fallback.EscalationTriggerPhrases
	}
	return cfg
}

func getSupportPrompt() supportPromptConfig {
	supportPromptOnce.Do(func() {
		supportPrompt = loadSupportPrompt()
	})
	return supportPrompt
}

func startVirtualAgent(callControlID string) {
	st, ok := getCall(callControlID)
	if !ok || st == nil {
		return
	}
	st.Status = "in_agent"

	ag := getAgentState(callControlID)
	agentStatesMu.Lock()
	ag.Enabled = true
	ag.Speaking = true
	ag.Processing = false
	ag.PendingUtterances = nil
	ag.History = nil
	ag.LastUserTranscript = ""
	ag.LastUserAt = time.Time{}
	agentStatesMu.Unlock()

	// Start speech transcription for the inbound leg (caller speech).
	sendCommand(callControlID, "actions/transcription_start", map[string]interface{}{
		"transcription_engine": "Google",
		"transcription_tracks": "inbound",
	})

	// Greet and explain options (short, agent-first).
	sendCommand(callControlID, "actions/speak", map[string]interface{}{
		"language": "en-US",
		"voice":    cfg.TelnyxVoice,
		"payload":  cfg.IVRAgentGreetingText,
	})
}

func handleDTMFReceived(p CallPayload) {
	state, ok := getCall(p.CallControlID)
	if !ok || state == nil {
		return
	}
	if state.InVoicemail {
		return
	}
	if state.PendingLiveKitTransfer || state.LiveKitTransferred {
		return
	}

	d := strings.TrimSpace(p.Digit)
	if d == "" {
		return
	}

	slog.Info("DTMF received", "call_id", p.CallControlID, "digit", d)

	switch d {
	case "1":
		// Connect with support: route into the LiveKit dashboard queue first.
		if strings.TrimSpace(cfg.LiveKitSIPURI) != "" {
			disableVirtualAgent(p.CallControlID)
			state.PendingLiveKitTransfer = true
			markAgentSpeaking(p.CallControlID, true)
			say(p.CallControlID, cfg.IVRTransferText)
			return
		}

		// Fallback if LiveKit isn't configured: ring escalation phone.
		to := strings.TrimSpace(cfg.HumanEscalationNumber)
		if to == "" {
			disableVirtualAgent(p.CallControlID)
			startVoicemail(p.CallControlID)
			return
		}
		disableVirtualAgent(p.CallControlID)
		state.PendingTransferTo = to
		markAgentSpeaking(p.CallControlID, true)
		say(p.CallControlID, cfg.IVRTransferText)
	case "0":
		disableVirtualAgent(p.CallControlID)
		startVoicemail(p.CallControlID)
		return
	default:
		// Ignore other digits.
	}
}

func disableVirtualAgent(callControlID string) {
	ag := getAgentState(callControlID)
	agentStatesMu.Lock()
	if ag != nil {
		ag.Enabled = false
		ag.Speaking = false
		ag.Processing = false
		ag.PendingUtterances = nil
	}
	agentStatesMu.Unlock()
}

func handleTranscription(p CallPayload) {
	if !cfg.EnableVoiceAgent {
		return
	}
	state, ok := getCall(p.CallControlID)
	if !ok || state == nil {
		return
	}
	if state.InVoicemail {
		return
	}
	if state.PendingLiveKitTransfer || state.LiveKitTransferred {
		return
	}
	if p.TranscriptionData == nil || !p.TranscriptionData.IsFinal {
		return
	}

	text := strings.TrimSpace(p.TranscriptionData.Transcript)
	if text == "" {
		return
	}

	ag := getAgentState(p.CallControlID)
	if !ag.Enabled {
		return
	}

	// Basic de-dupe (Telnyx may resend finals in some cases).
	agentStatesMu.Lock()
	if strings.EqualFold(text, ag.LastUserTranscript) && time.Since(ag.LastUserAt) < 2*time.Second {
		agentStatesMu.Unlock()
		return
	}
	ag.LastUserTranscript = text
	ag.LastUserAt = time.Now()
	speaking := ag.Speaking
	processing := ag.Processing
	if speaking || processing {
		// Buffer the latest utterance; we'll process when speak ends.
		ag.PendingUtterances = append(ag.PendingUtterances, text)
		// Cap buffer size.
		if len(ag.PendingUtterances) > 3 {
			ag.PendingUtterances = ag.PendingUtterances[len(ag.PendingUtterances)-3:]
		}
		agentStatesMu.Unlock()
		return
	}
	// Process immediately.
	ag.Processing = true
	agentStatesMu.Unlock()

	go processAgentUtterance(p.CallControlID, text)
}

func onAgentSpeakEnded(callControlID string) {
	ag := getAgentState(callControlID)

	var next string
	shouldProcess := false

	agentStatesMu.Lock()
	if !ag.Enabled {
		agentStatesMu.Unlock()
		return
	}
	ag.Speaking = false
	if !ag.Processing && len(ag.PendingUtterances) > 0 {
		next = ag.PendingUtterances[len(ag.PendingUtterances)-1]
		ag.PendingUtterances = nil
		ag.Processing = true
		shouldProcess = true
	}
	agentStatesMu.Unlock()

	if shouldProcess && strings.TrimSpace(next) != "" {
		go processAgentUtterance(callControlID, next)
	}
}

func markAgentSpeaking(callControlID string, speaking bool) {
	ag := getAgentState(callControlID)
	agentStatesMu.Lock()
	if ag != nil {
		ag.Speaking = speaking
	}
	agentStatesMu.Unlock()
}

func processAgentUtterance(callControlID, userText string) {
	defer func() {
		agentStatesMu.Lock()
		if ag, ok := agentStates[callControlID]; ok {
			ag.Processing = false
		}
		agentStatesMu.Unlock()
	}()

	state, ok := getCall(callControlID)
	if !ok || state == nil || state.InVoicemail {
		return
	}

	norm := strings.ToLower(strings.TrimSpace(userText))

	// Intent: voicemail.
	if strings.Contains(norm, "voicemail") || strings.Contains(norm, "leave a message") || strings.Contains(norm, "leave message") {
		disableVirtualAgent(callControlID)
		startVoicemail(callControlID)
		return
	}

	// Intent: connect to support / live agent.
	if wantsEscalation(norm) {
		if strings.TrimSpace(cfg.LiveKitSIPURI) == "" {
			// If LiveKit isn't configured, fall back to phone escalation if present.
			to := strings.TrimSpace(cfg.HumanEscalationNumber)
			if to == "" {
				disableVirtualAgent(callControlID)
				startVoicemail(callControlID)
				return
			}
			state.PendingTransferTo = to
			markAgentSpeaking(callControlID, true)
			say(callControlID, "Please hold while I transfer your call.")
			return
		}

		disableVirtualAgent(callControlID)
		state.PendingLiveKitTransfer = true
		markAgentSpeaking(callControlID, true)
		say(callControlID, cfg.IVRTransferText)
		return
	}

	// Normal Q&A.
	agentStatesMu.Lock()
	ag, ok := agentStates[callControlID]
	var history []agentTurn
	if ok && len(ag.History) > 0 {
		history = append([]agentTurn(nil), ag.History...)
	}
	agentStatesMu.Unlock()

	// If no LLM key, fall back to a safe message.
	if strings.TrimSpace(cfg.GoogleAPIKey) == "" {
		markAgentSpeaking(callControlID, true)
		say(callControlID, "I'm sorry, I'm having trouble accessing our assistant right now. You can press 1 to reach support, or press 0 to leave a voicemail.")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 12*time.Second)
	defer cancel()

	system := getSupportPrompt().Instructions
	resp, err := generateGeminiReply(ctx, cfg.GoogleAPIKey, cfg.GoogleGenAIModel, system, history, userText)
	if err != nil {
		slog.Warn("Agent LLM error", "call_id", callControlID, "err", err)
		markAgentSpeaking(callControlID, true)
		say(callControlID, "I'm sorry, I had trouble with that. You can ask again, press 1 to reach support, or press 0 to leave a voicemail.")
		return
	}

	resp = sanitizeSpokenText(resp)
	if resp == "" {
		resp = "I can help with orders, returns, shipping, or product questions. What can I help you with today?"
	}

	// Save short history.
	agentStatesMu.Lock()
	if ag, ok := agentStates[callControlID]; ok {
		ag.History = append(ag.History, agentTurn{Role: "user", Text: userText}, agentTurn{Role: "assistant", Text: resp})
		if len(ag.History) > 12 {
			ag.History = ag.History[len(ag.History)-12:]
		}
	}
	agentStatesMu.Unlock()

	markAgentSpeaking(callControlID, true)
	say(callControlID, resp)
}

func wantsEscalation(normalizedLower string) bool {
	p := getSupportPrompt()
	for _, phrase := range p.EscalationTriggerPhrases {
		ph := strings.ToLower(strings.TrimSpace(phrase))
		if ph == "" {
			continue
		}
		if strings.Contains(normalizedLower, ph) {
			return true
		}
	}

	// Heuristic fallbacks.
	if strings.Contains(normalizedLower, "connect") && (strings.Contains(normalizedLower, "support") || strings.Contains(normalizedLower, "agent") || strings.Contains(normalizedLower, "representative")) {
		return true
	}
	if strings.Contains(normalizedLower, "speak") && strings.Contains(normalizedLower, "support") {
		return true
	}
	return false
}

func sanitizeSpokenText(s string) string {
	s = strings.TrimSpace(s)
	s = strings.ReplaceAll(s, "\n", " ")
	s = strings.ReplaceAll(s, "\r", " ")
	// Collapse repeated whitespace.
	s = strings.Join(strings.Fields(s), " ")
	return s
}

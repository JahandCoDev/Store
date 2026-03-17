package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"github.com/livekit/protocol/auth"
	"github.com/livekit/protocol/livekit"
	lksdk "github.com/livekit/server-sdk-go/v2"
)

// ─── Telnyx Webhook Types ─────────────────────────────────────────────────────

type TelnyxWebhook struct {
	Data struct {
		EventType string          `json:"event_type"`
		Payload   json.RawMessage `json:"payload"`
	} `json:"data"`
}

type CallPayload struct {
	CallControlID     string `json:"call_control_id"`
	CallSessionID     string `json:"call_session_id"`
	Direction         string `json:"direction"`
	From              string `json:"from"`
	To                string `json:"to"`
	Digits            string `json:"digits"`
	Digit             string `json:"digit"`
	RecordingURL      string `json:"recording_url"`
	HangupCause       string `json:"hangup_cause"`
	TranscriptionData *struct {
		Confidence float64 `json:"confidence"`
		IsFinal    bool    `json:"is_final"`
		Transcript string  `json:"transcript"`
	} `json:"transcription_data"`
}

// ─── Call State Machine ───────────────────────────────────────────────────────

type CallState struct {
	CallControlID          string    `json:"call_control_id"`
	CallSessionID          string    `json:"call_session_id"`
	From                   string    `json:"from"`
	LiveKitRoom            string    `json:"livekit_room,omitempty"`
	EscalationStartedAt    time.Time `json:"-"`
	EscalationLegID        string    `json:"-"`
	EscalationScheduled    bool      `json:"-"`
	EscalationInProgress   bool      `json:"-"`
	EscalationAnswered     bool      `json:"-"`
	MenuRetries            int       `json:"-"`
	InVoicemail            bool      `json:"-"`
	PendingLiveKitTransfer bool      `json:"-"`
	LiveKitTransferred     bool      `json:"-"`
	PendingTransferTo      string    `json:"-"`      // generic transfer after speak completes
	Status                 string    `json:"status"` // "ringing", "in_menu", "waiting", "in_voicemail"
	StartedAt              time.Time `json:"started_at"`
}

var (
	holdRoomsMu sync.Mutex
	holdRooms   = make(map[string]*HoldRoomSystem)
)
var (
	activeCalls   = make(map[string]*CallState)
	activeCallsMu sync.RWMutex
)

var (
	inboundBySession   = make(map[string]string)
	inboundBySessionMu sync.RWMutex
)

type OutboundLegKind string

const (
	OutboundLegLiveKit    OutboundLegKind = "livekit"
	OutboundLegEscalation OutboundLegKind = "escalation"
)

type OutboundLeg struct {
	CallControlID string
	CallSessionID string
	To            string
	Kind          OutboundLegKind
	ParentCallID  string
}

var (
	outboundLegs   = make(map[string]*OutboundLeg)
	outboundLegsMu sync.RWMutex
)

func liveKitRoomName(callerNumber string) string {
	prefix := "voice-"
	if cfg != nil && cfg.LiveKitRoomPrefix != "" {
		prefix = cfg.LiveKitRoomPrefix
	}
	return prefix + callerNumber
}

func liveKitRoomServiceURL(liveKitURL string) string {
	s := strings.TrimSpace(liveKitURL)
	s = strings.TrimSuffix(s, "/")
	if strings.HasPrefix(s, "wss://") {
		return "https://" + strings.TrimPrefix(s, "wss://")
	}
	if strings.HasPrefix(s, "ws://") {
		return "http://" + strings.TrimPrefix(s, "ws://")
	}
	return s
}

func sipUserPart(sipURI string) string {
	s := strings.TrimSpace(sipURI)
	s = strings.TrimPrefix(strings.ToLower(s), "sip:")
	// preserve original casing in user part by re-splitting on original string if possible
	if at := strings.Index(s, "@"); at >= 0 {
		return s[:at]
	}
	return ""
}

func waitForDispatchedLiveKitRoom(ctx context.Context, callerNumber string, sipCallee string) (string, error) {
	if cfg.LiveKitAPIKey == "" || cfg.LiveKitAPISecret == "" || cfg.LiveKitURL == "" {
		return "", fmt.Errorf("LiveKit credentials not configured")
	}

	roomSvc := lksdk.NewRoomServiceClient(liveKitRoomServiceURL(cfg.LiveKitURL), cfg.LiveKitAPIKey, cfg.LiveKitAPISecret)
	prefix := cfg.LiveKitRoomPrefix
	if prefix == "" {
		prefix = "voice-"
	}

	// Depending on dispatch rule type:
	// - dispatchRuleCallee => room name is based on the called number (DID) (sipCallee)
	// - other rules / older experiments => might be based on callerNumber
	var candidatePrefixes []string
	if callerNumber != "" {
		candidatePrefixes = append(candidatePrefixes, prefix+callerNumber)
	}
	if sipCallee != "" {
		candidatePrefixes = append(candidatePrefixes, prefix+sipCallee)
	}
	// Always include the bare prefix as a fallback for rules that generate unique suffixes.
	candidatePrefixes = append(candidatePrefixes, prefix)

	ticker := time.NewTicker(750 * time.Millisecond)
	defer ticker.Stop()

	deadline := time.NewTimer(25 * time.Second)
	defer deadline.Stop()

	for {
		roomsResp, err := roomSvc.ListRooms(ctx, &livekit.ListRoomsRequest{})
		if err == nil {
			for _, room := range roomsResp.Rooms {
				if room == nil {
					continue
				}
				matches := false
				for _, pfx := range candidatePrefixes {
					if strings.HasPrefix(room.Name, pfx) {
						matches = true
						break
					}
				}
				if !matches {
					continue
				}

				// Confirm there's an active SIP participant in the room (avoid stale/empty rooms).
				partsResp, pErr := roomSvc.ListParticipants(ctx, &livekit.ListParticipantsRequest{Room: room.Name})
				if pErr != nil {
					continue
				}
				for _, p := range partsResp.Participants {
					if p == nil {
						continue
					}
					id := p.Identity
					if strings.HasPrefix(id, "agent-") || strings.HasPrefix(id, "system-hold-") {
						continue
					}
					if strings.HasPrefix(id, "sip_") || (callerNumber != "" && strings.Contains(id, callerNumber)) || (sipCallee != "" && strings.Contains(id, sipCallee)) {
						return room.Name, nil
					}
				}
			}
		} else {
			slog.Warn("Failed to list LiveKit rooms while waiting for SIP dispatch", "err", err)
		}

		select {
		case <-ctx.Done():
			return "", ctx.Err()
		case <-deadline.C:
			return "", fmt.Errorf("timed out waiting for LiveKit SIP dispatch room")
		case <-ticker.C:
		}
	}
}

func storeCall(state *CallState) {
	activeCallsMu.Lock()
	defer activeCallsMu.Unlock()
	activeCalls[state.CallControlID] = state
	if state.CallSessionID != "" {
		inboundBySessionMu.Lock()
		inboundBySession[state.CallSessionID] = state.CallControlID
		inboundBySessionMu.Unlock()
	}
}

func getCall(callControlID string) (*CallState, bool) {
	activeCallsMu.RLock()
	defer activeCallsMu.RUnlock()
	s, ok := activeCalls[callControlID]
	return s, ok
}

func removeCall(callControlID string) {
	activeCallsMu.Lock()
	defer activeCallsMu.Unlock()
	if st, ok := activeCalls[callControlID]; ok {
		if st.CallSessionID != "" {
			inboundBySessionMu.Lock()
			if inboundBySession[st.CallSessionID] == callControlID {
				delete(inboundBySession, st.CallSessionID)
			}
			inboundBySessionMu.Unlock()
		}
	}
	delete(activeCalls, callControlID)
	removeAgentState(callControlID)
}

func getInboundBySession(callSessionID string) (string, bool) {
	inboundBySessionMu.RLock()
	defer inboundBySessionMu.RUnlock()
	id, ok := inboundBySession[callSessionID]
	return id, ok
}

func storeOutboundLeg(leg *OutboundLeg) {
	outboundLegsMu.Lock()
	defer outboundLegsMu.Unlock()
	outboundLegs[leg.CallControlID] = leg
}

func getOutboundLeg(callControlID string) (*OutboundLeg, bool) {
	outboundLegsMu.RLock()
	defer outboundLegsMu.RUnlock()
	leg, ok := outboundLegs[callControlID]
	return leg, ok
}

func removeOutboundLeg(callControlID string) {
	outboundLegsMu.Lock()
	defer outboundLegsMu.Unlock()
	delete(outboundLegs, callControlID)
}

// ─── Global config ────────────────────────────────────────────────────────────

var cfg *Config

// ─── Main ─────────────────────────────────────────────────────────────────────

func main() {
	_ = godotenv.Load()

	// Setup structured JSON logging
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})))

	var err error
	cfg, err = LoadConfig()
	if err != nil {
		slog.Error("Config error", "err", err)
		os.Exit(1)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/webhook", handleWebhook)
	mux.HandleFunc("/health", handleHealth)
	mux.HandleFunc("/api/active-calls", handleActiveCalls)
	mux.HandleFunc("/api/answer", handleAnswer)
	mux.HandleFunc("/api/join-room", handleJoinRoom)
	mux.HandleFunc("/api/stop-hold", handleStopHold)
	mux.HandleFunc("/api/transfer", handleTransfer)
	mux.HandleFunc("/api/end-call", handleEndCallAPI)
	mux.HandleFunc("/api/hold", handleHoldAPI)

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		slog.Info("Voice Router started", "port", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("Server error", "err", err)
			os.Exit(1)
		}
	}()

	// Graceful shutdown on SIGTERM / SIGINT
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	slog.Info("Shutting down...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("Shutdown error", "err", err)
	}
}

// ─── Health ───────────────────────────────────────────────────────────────────

func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ok"}`))
}

func handleActiveCalls(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	activeCallsMu.RLock()
	defer activeCallsMu.RUnlock()

	var waiting []CallState
	for _, call := range activeCalls {
		if call.Status == "waiting" {
			waiting = append(waiting, *call)
		}
	}
	if waiting == nil {
		waiting = []CallState{}
	}

	json.NewEncoder(w).Encode(waiting)
}

func handleJoinRoom(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	roomName := r.URL.Query().Get("room")
	agentName := r.URL.Query().Get("agent")
	if roomName == "" || agentName == "" {
		http.Error(w, `{"error":"room and agent required"}`, http.StatusBadRequest)
		return
	}

	canPublish := true
	canSubscribe := true

	at := auth.NewAccessToken(cfg.LiveKitAPIKey, cfg.LiveKitAPISecret)
	grant := &auth.VideoGrant{
		RoomJoin:       true,
		Room:           roomName,
		CanPublish:     &canPublish,
		CanPublishData: &canPublish,
		CanSubscribe:   &canSubscribe,
	}
	at.AddGrant(grant).
		SetIdentity("agent-" + agentName).
		SetValidFor(time.Hour)

	token, err := at.ToJWT()
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{
		"token": token,
		"url":   cfg.LiveKitURL,
	})
}

func handleAnswer(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	callControlID := r.URL.Query().Get("call_control_id")
	agentName := r.URL.Query().Get("agent")
	if callControlID == "" || agentName == "" {
		http.Error(w, `{"error":"call_control_id and agent required"}`, http.StatusBadRequest)
		return
	}

	state, ok := getCall(callControlID)
	if !ok || state == nil {
		http.Error(w, `{"error":"call not found"}`, http.StatusNotFound)
		return
	}

	slog.Info("Answer requested", "call_id", callControlID, "agent", agentName, "from", state.From, "known_room", state.LiveKitRoom != "")

	roomName := strings.TrimSpace(state.LiveKitRoom)
	if roomName == "" {
		ctx, cancel := context.WithTimeout(r.Context(), 25*time.Second)
		defer cancel()
		rn, err := waitForDispatchedLiveKitRoom(ctx, state.From, sipUserPart(cfg.LiveKitSIPURI))
		if err == nil && rn != "" {
			roomName = rn
			state.LiveKitRoom = rn
		} else {
			slog.Warn("Answer requested before dispatched room known; falling back to deterministic room", "call_id", callControlID, "err", err)
			roomName = liveKitRoomName(state.From)
		}
	}

	slog.Info("Answer resolved room", "call_id", callControlID, "agent", agentName, "room", roomName)

	canPublish := true
	canSubscribe := true

	at := auth.NewAccessToken(cfg.LiveKitAPIKey, cfg.LiveKitAPISecret)
	grant := &auth.VideoGrant{
		RoomJoin:       true,
		Room:           roomName,
		CanPublish:     &canPublish,
		CanPublishData: &canPublish,
		CanSubscribe:   &canSubscribe,
	}
	at.AddGrant(grant).
		SetIdentity("agent-" + agentName).
		SetValidFor(time.Hour)

	token, err := at.ToJWT()
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{
		"token": token,
		"url":   cfg.LiveKitURL,
		"room":  roomName,
	})
}

func handleStopHold(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	callControlID := r.URL.Query().Get("call_control_id")
	if callControlID == "" {
		http.Error(w, `{"error":"call_control_id required"}`, http.StatusBadRequest)
		return
	}

	slog.Info("Stop-hold requested", "call_id", callControlID)

	var stopped bool
	var hadSystem bool
	var sysToClose *HoldRoomSystem

	holdRoomsMu.Lock()
	if sys, ok := holdRooms[callControlID]; ok {
		hadSystem = true
		delete(holdRooms, callControlID)
		sysToClose = sys
		stopped = true
	}
	holdRoomsMu.Unlock()

	if sysToClose != nil {
		sysToClose.Close()
	}

	slog.Info("Stop-hold complete", "call_id", callControlID, "had_hold", hadSystem, "hold_stopped", stopped)

	if state, ok := getCall(callControlID); ok {
		state.Status = "answered"
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"ok":           true,
		"had_hold":     hadSystem,
		"hold_stopped": stopped,
	})
}

// ─── Webhook Handler ──────────────────────────────────────────────────────────

func handleWebhook(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		slog.Error("Failed to read webhook body", "err", err)
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Telnyx requires a 200 OK fast — write it before any processing
	w.WriteHeader(http.StatusOK)

	var webhook TelnyxWebhook
	if err := json.Unmarshal(body, &webhook); err != nil {
		slog.Error("Failed to parse webhook", "err", err)
		return
	}

	var payload CallPayload
	if err := json.Unmarshal(webhook.Data.Payload, &payload); err != nil {
		slog.Error("Failed to parse call payload", "err", err)
		return
	}

	if payload.CallControlID == "" {
		return
	}

	slog.Info("Webhook received",
		"event", webhook.Data.EventType,
		"call_id", payload.CallControlID,
		"session_id", payload.CallSessionID,
		"direction", payload.Direction,
		"from", payload.From,
		"to", payload.To,
	)

	switch webhook.Data.EventType {
	case "call.initiated":
		handleCallInitiated(payload)

	case "call.answered":
		handleCallAnswered(payload)

	case "call.gather.ended":
		handleGatherEnded(payload)

	case "call.dtmf.received":
		handleDTMFReceived(payload)

	case "call.transcription":
		handleTranscription(payload)

	case "call.speak.ended":
		handleSpeakEnded(payload)

	case "call.recording.saved":
		handleRecordingSaved(payload)

	case "call.hangup":
		handleCallHangup(payload)

	case "call.bridged":
		handleCallBridged(payload)

	default:
		slog.Info("Unhandled event type", "event", webhook.Data.EventType)
	}
}

// ─── Call Event Handlers ──────────────────────────────────────────────────────

func handleCallInitiated(p CallPayload) {
	if p.Direction == "outgoing" {
		handleOutboundInitiated(p)
		return
	}
	if strings.HasPrefix(p.To, "sip:") {
		// Telnyx creates a separate call_control_id for the SIP transfer leg.
		// We must ignore ALL subsequent events for this call id.
		storeOutboundLeg(&OutboundLeg{
			CallControlID: p.CallControlID,
			CallSessionID: p.CallSessionID,
			To:            p.To,
			Kind:          OutboundLegLiveKit,
		})
		slog.Info("Ignoring LiveKit SIP transfer leg", "call_id", p.CallControlID, "to", p.To)
		return
	}

	slog.Info("Call initiated", "from", p.From, "to", p.To)
	sendCommand(p.CallControlID, "actions/answer", nil)
}

func handleCallAnswered(p CallPayload) {
	if leg, ok := getOutboundLeg(p.CallControlID); ok {
		// Never run IVR on outbound legs.
		if leg.Kind == OutboundLegLiveKit {
			return
		}
		if leg.Kind == OutboundLegEscalation {
			handleOutboundAnswered(p)
			return
		}
	}

	if p.Direction == "outgoing" {
		handleOutboundAnswered(p)
		return
	}
	if strings.HasPrefix(p.To, "sip:") {
		// Defensive: never run IVR on SIP legs.
		slog.Info("Ignoring SIP leg answered", "call_id", p.CallControlID, "to", p.To)
		return
	}

	slog.Info("Call answered", "from", p.From)

	state := &CallState{
		CallControlID: p.CallControlID,
		CallSessionID: p.CallSessionID,
		From:          p.From,
		Status:        "in_menu",
		StartedAt:     time.Now(),
	}
	storeCall(state)

	if !cfg.IsBusinessHours() {
		slog.Info("After hours — routing to voicemail", "call_id", p.CallControlID)
		playAfterHoursAndVoicemail(p.CallControlID)
		return
	}

	if cfg.EnableVoiceAgent {
		startVirtualAgent(p.CallControlID)
		return
	}
	playMainMenu(p.CallControlID)
}

func handleOutboundInitiated(p CallPayload) {
	// LiveKit SIP outbound leg: ignore entirely (we don't control it).
	if strings.HasPrefix(p.To, "sip:") {
		slog.Info("Ignoring outbound SIP transfer leg", "call_id", p.CallControlID, "to", p.To)
		return
	}

	parentID, ok := getInboundBySession(p.CallSessionID)
	if !ok {
		slog.Info("Outbound leg has no tracked inbound session", "call_id", p.CallControlID, "session_id", p.CallSessionID, "to", p.To)
		return
	}

	kind := OutboundLegKind("unknown")
	if strings.TrimSpace(p.To) == strings.TrimSpace(cfg.HumanEscalationNumber) {
		kind = OutboundLegEscalation
	}

	leg := &OutboundLeg{
		CallControlID: p.CallControlID,
		CallSessionID: p.CallSessionID,
		To:            p.To,
		Kind:          kind,
		ParentCallID:  parentID,
	}
	storeOutboundLeg(leg)

	if kind == OutboundLegEscalation {
		if st, ok := getCall(parentID); ok {
			st.EscalationLegID = p.CallControlID
		}
	}
}

func handleOutboundAnswered(p CallPayload) {
	leg, ok := getOutboundLeg(p.CallControlID)
	if !ok {
		// Unknown outbound leg; ignore.
		return
	}
	if leg.Kind != OutboundLegEscalation {
		return
	}

	st, ok := getCall(leg.ParentCallID)
	if !ok {
		return
	}

	slog.Info("Escalation phone answered", "parent_call_id", leg.ParentCallID, "leg_call_id", p.CallControlID, "to", leg.To)
	st.EscalationAnswered = true
	st.EscalationInProgress = false
	st.Status = "answered"

	// Stop any hold music system if it is still running.
	holdRoomsMu.Lock()
	if sys, ok := holdRooms[leg.ParentCallID]; ok {
		sys.Close()
		delete(holdRooms, leg.ParentCallID)
	}
	holdRoomsMu.Unlock()
}

func handleCallBridged(p CallPayload) {
	// Useful for debugging state; we don't need to act on this yet.
	if st, ok := getCall(p.CallControlID); ok {
		slog.Info("Call bridged", "call_id", p.CallControlID, "status", st.Status)
		if st.EscalationInProgress && !st.EscalationAnswered {
			// Bridged means the caller is now connected to the escalation destination.
			st.EscalationAnswered = true
			st.EscalationInProgress = false
			st.Status = "answered"
		}
	}
}

func scheduleEscalation(callControlID string) {
	st, ok := getCall(callControlID)
	if !ok {
		return
	}
	if st.EscalationScheduled || cfg.HumanEscalationNumber == "" {
		return
	}
	st.EscalationScheduled = true

	wait := time.Duration(cfg.EscalationWaitSecs) * time.Second
	ring := time.Duration(cfg.EscalationRingSecs) * time.Second

	go func() {
		t := time.NewTimer(wait)
		defer t.Stop()
		<-t.C

		state, ok := getCall(callControlID)
		if !ok {
			return
		}
		if state.InVoicemail || state.Status != "waiting" {
			return
		}

		slog.Info("Escalation timer fired", "call_id", callControlID, "to", cfg.HumanEscalationNumber)
		state.EscalationInProgress = true
		state.EscalationStartedAt = time.Now()
		state.Status = "escalating"

		// Stop hold music before transferring out.
		holdRoomsMu.Lock()
		if sys, ok := holdRooms[callControlID]; ok {
			sys.Close()
			delete(holdRooms, callControlID)
		}
		holdRoomsMu.Unlock()

		// Transfer the original inbound call to the human escalation phone.
		sendCommand(callControlID, "actions/transfer", map[string]interface{}{
			"to": cfg.HumanEscalationNumber,
		})

		// If the escalation leg isn't answered within ring timeout, route caller to voicemail.
		go func() {
			t2 := time.NewTimer(ring)
			defer t2.Stop()
			<-t2.C

			state, ok := getCall(callControlID)
			if !ok {
				return
			}
			if !state.EscalationInProgress || state.EscalationAnswered || state.InVoicemail {
				return
			}

			slog.Info("Escalation timed out — routing to voicemail", "call_id", callControlID)
			state.EscalationInProgress = false
			startVoicemail(callControlID)
		}()
	}()
}

func playMainMenu(callControlID string) {
	sendCommand(callControlID, "actions/gather_using_speak", map[string]interface{}{
		"language":                   "en-US",
		"voice":                      cfg.TelnyxVoice,
		"payload":                    cfg.IVRMainMenuText,
		"minimum_digits":             1,
		"maximum_digits":             1,
		"valid_digits":               "01",
		"timeout_millis":             8000,
		"inter_digit_timeout_millis": 5000,
	})
}

func handleGatherEnded(p CallPayload) {
	state, ok := getCall(p.CallControlID)
	if !ok {
		slog.Warn("Gather ended for unknown call", "call_id", p.CallControlID)
		return
	}

	digits := p.Digits
	slog.Info("Caller pressed digit", "digit", digits, "call_id", p.CallControlID)

	switch digits {
	case "1":
		// Transfer to LiveKit AI Support Agent
		if cfg.LiveKitSIPURI == "" {
			slog.Warn("LIVEKIT_SIP_URI not configured — falling back to voicemail")
			startVoicemail(p.CallControlID)
			return
		}
		state.PendingLiveKitTransfer = true
		say(p.CallControlID, cfg.IVRTransferText)

	case "0":
		// Voicemail
		startVoicemail(p.CallControlID)

	default:
		// No input or invalid — retry menu
		state.MenuRetries++
		if state.MenuRetries >= 2 {
			slog.Info("Max menu retries reached — routing to voicemail", "call_id", p.CallControlID)
			startVoicemail(p.CallControlID)
			return
		}
		playMainMenu(p.CallControlID)
	}
}

func handleSpeakEnded(p CallPayload) {
	state, ok := getCall(p.CallControlID)
	if !ok {
		return
	}

	// Generic transfer requested after the most recent speak completes.
	if to := strings.TrimSpace(state.PendingTransferTo); to != "" {
		state.PendingTransferTo = ""
		slog.Info("Transferring call after speak", "call_id", p.CallControlID, "to", to)
		sendCommand(p.CallControlID, "actions/transfer", map[string]interface{}{"to": to})
		return
	}

	// Voice agent: mark agent as done speaking, flush buffered user input.
	if cfg.EnableVoiceAgent {
		onAgentSpeakEnded(p.CallControlID)
	}

	if state.InVoicemail || cfg.LiveKitSIPURI == "" || !state.PendingLiveKitTransfer || state.LiveKitTransferred {
		return
	}
	state.PendingLiveKitTransfer = false
	state.LiveKitTransferred = true
	state.Status = "waiting"
	state.LiveKitRoom = ""

	sipTo := strings.TrimSpace(cfg.LiveKitSIPURI)
	if sipTo == "" {
		slog.Warn("LIVEKIT_SIP_URI not configured — falling back to voicemail")
		startVoicemail(p.CallControlID)
		return
	}

	slog.Info("Transferring call to LiveKit SIP", "sip", sipTo)
	sendCommand(p.CallControlID, "actions/transfer", map[string]interface{}{
		"to": sipTo,
	})

	// Start escalation timer once caller is in the waiting state.
	scheduleEscalation(p.CallControlID)

	// Start hold music only after the SIP participant is actually in the LiveKit room
	// created by the SIP dispatch rule.
	go func(callControlID, caller string) {
		// If the call already hung up, bail.
		if _, ok := getCall(callControlID); !ok {
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		roomName, err := waitForDispatchedLiveKitRoom(ctx, caller, sipUserPart(cfg.LiveKitSIPURI))
		if err != nil {
			slog.Error("LiveKit SIP transfer did not result in a dispatched room", "call_id", callControlID, "from", caller, "err", err, "sip_user", sipUserPart(cfg.LiveKitSIPURI))
			return
		}

		state, ok := getCall(callControlID)
		if !ok {
			return
		}
		state.LiveKitRoom = roomName

		holdRoomsMu.Lock()
		if _, exists := holdRooms[callControlID]; exists {
			holdRoomsMu.Unlock()
			return
		}
		holdRoomsMu.Unlock()

		bridge, bErr := NewHoldRoomSystem(roomName, callControlID, cfg)
		if bErr != nil {
			slog.Error("Failed to start hold music in dispatched room", "call_id", callControlID, "room", roomName, "err", bErr)
			return
		}

		holdRoomsMu.Lock()
		holdRooms[callControlID] = bridge
		holdRoomsMu.Unlock()
		go bridge.Start()
	}(p.CallControlID, state.From)
}

func handleRecordingSaved(p CallPayload) {
	slog.Info("Voicemail recording saved", "url", p.RecordingURL, "from", p.From)

	state, _ := getCall(p.CallControlID)
	callerNum := p.From
	if state != nil {
		callerNum = state.From
	}

	if cfg.VoicemailTo == "" {
		slog.Warn("VOICEMAIL_EMAIL not set — skipping email notification")
		return
	}

	err := sendVoicemailEmail(cfg.VoicemailTo, callerNum, p.RecordingURL, time.Now())
	if err != nil {
		slog.Error("Failed to send voicemail email", "err", err)
	} else {
		slog.Info("Voicemail email sent", "to", cfg.VoicemailTo)
	}
}

func handleCallHangup(p CallPayload) {
	slog.Info("Call ended", "call_id", p.CallControlID, "cause", p.HangupCause)
	if leg, ok := getOutboundLeg(p.CallControlID); ok {
		// If the escalation leg hung up before being answered, route parent call to voicemail.
		if leg.Kind == OutboundLegEscalation {
			if st, ok := getCall(leg.ParentCallID); ok {
				if st.EscalationInProgress && !st.EscalationAnswered && !st.InVoicemail {
					slog.Info("Escalation leg ended — routing parent to voicemail", "parent_call_id", leg.ParentCallID, "leg_call_id", p.CallControlID, "cause", p.HangupCause)
					st.EscalationInProgress = false
					startVoicemail(leg.ParentCallID)
				}
			}
		}
		if leg.Kind == OutboundLegLiveKit {
			removeOutboundLeg(p.CallControlID)
			return
		}
		removeOutboundLeg(p.CallControlID)
		return
	}

	removeCall(p.CallControlID)

	holdRoomsMu.Lock()
	if sys, ok := holdRooms[p.CallControlID]; ok {
		slog.Info("Cleaning up active hold room for dropped call", "call_id", p.CallControlID)
		sys.Close()
		delete(holdRooms, p.CallControlID)
	}
	holdRoomsMu.Unlock()
}

// ─── Voicemail Helpers ────────────────────────────────────────────────────────

func playAfterHoursAndVoicemail(callControlID string) {
	// Play after-hours message then start recording
	if state, ok := getCall(callControlID); ok {
		state.InVoicemail = true
	}
	sendCommand(callControlID, "actions/speak", map[string]interface{}{
		"language": "en-US",
		"voice":    cfg.TelnyxVoice,
		"payload":  cfg.IVRAfterHoursText,
	})
	// Recording starts after speak.ended — handled via speak_ended if InVoicemail=true
	// But for after-hours we chain it directly
	startVoicemailRecording(callControlID)
}

func startVoicemail(callControlID string) {
	if state, ok := getCall(callControlID); ok {
		state.InVoicemail = true
	}
	sendCommand(callControlID, "actions/speak", map[string]interface{}{
		"language": "en-US",
		"voice":    cfg.TelnyxVoice,
		"payload":  cfg.IVRVoicemailText,
	})
	startVoicemailRecording(callControlID)
}

func startVoicemailRecording(callControlID string) {
	sendCommand(callControlID, "actions/record_start", map[string]interface{}{
		"format":            "mp3",
		"channels":          "single",
		"play_beep":         true,
		"time_limit_secs":   120,
		"silence_secs":      5,
		"terminating_digit": "#",
	})
}

// ─── Telnyx API Helpers ───────────────────────────────────────────────────────

func say(callControlID, text string) {
	sendCommand(callControlID, "actions/speak", map[string]interface{}{
		"language": "en-US",
		"voice":    cfg.TelnyxVoice,
		"payload":  text,
	})
}

func sendCommand(callControlID, action string, payload map[string]interface{}) {
	if payload == nil {
		payload = map[string]interface{}{}
	}

	url := fmt.Sprintf("https://api.telnyx.com/v2/calls/%s/%s", callControlID, action)
	jsonData, err := json.Marshal(payload)
	if err != nil {
		slog.Error("Failed to marshal command payload", "action", action, "err", err)
		return
	}

	req, err := http.NewRequest(http.MethodPost, url, bytes.NewBuffer(jsonData))
	if err != nil {
		slog.Error("Failed to create Telnyx request", "action", action, "err", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+cfg.TelnyxAPIKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		slog.Error("Telnyx API request failed", "action", action, "err", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(resp.Body)
		slog.Error("Telnyx API error",
			"action", action,
			"status", resp.StatusCode,
			"body", string(respBody),
		)
		return
	}

	slog.Info("Telnyx command sent", "action", action, "call_id", callControlID)
}

// ─── Transfer Endpoint ────────────────────────────────────────────────────────

func handleTransfer(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		CallControlID string `json:"call_control_id"`
		Extension     string `json:"extension"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		slog.Error("Failed to decode transfer request", "err", err)
		http.Error(w, `{"error":"Invalid request format"}`, http.StatusBadRequest)
		return
	}

	if req.CallControlID == "" || req.Extension == "" {
		http.Error(w, `{"error":"Missing call_control_id or extension"}`, http.StatusBadRequest)
		return
	}

	slog.Info("Transfer request received", "call_id", req.CallControlID, "extension", req.Extension)

	// Format destination based on simple heuristics
	destination := req.Extension
	if len(destination) == 10 {
		destination = "+1" + destination
	}

	sendCommand(req.CallControlID, "actions/transfer", map[string]interface{}{
		"to": destination,
	})

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"success"}`))
}

// ─── End Call and Hold APIs ──────────────────────────────────────────────────

func handleEndCallAPI(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	var req struct {
		CallControlID string `json:"call_control_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err == nil && req.CallControlID != "" {
		sendCommand(req.CallControlID, "actions/hangup", nil)
		slog.Info("Admin ended call", "call_id", req.CallControlID)
	}

	w.WriteHeader(http.StatusOK)
}

func handleHoldAPI(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	var req struct {
		CallControlID string `json:"call_control_id"`
		Hold          bool   `json:"hold"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err == nil && req.CallControlID != "" {
		slog.Info("Admin toggled hold", "call_id", req.CallControlID, "hold", req.Hold)

		if req.Hold {
			if state, ok := getCall(req.CallControlID); ok {
				state.Status = "held"
				roomName := state.LiveKitRoom
				if roomName == "" {
					roomName = liveKitRoomName(state.From)
				}

				holdSys, err := NewHoldRoomSystem(roomName, req.CallControlID, cfg)
				if err == nil {
					holdRoomsMu.Lock()
					holdRooms[req.CallControlID] = holdSys
					holdRoomsMu.Unlock()
					go holdSys.Start()
				}
			}
		} else {
			// Stop hold music
			if state, ok := getCall(req.CallControlID); ok {
				state.Status = "answered"
			}
			holdRoomsMu.Lock()
			if sys, ok := holdRooms[req.CallControlID]; ok {
				sys.Close()
				delete(holdRooms, req.CallControlID)
			}
			holdRoomsMu.Unlock()
		}
	}
	w.WriteHeader(http.StatusOK)
}

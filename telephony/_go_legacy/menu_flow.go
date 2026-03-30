package main

import (
	"context"
	"log/slog"
	"strings"
	"time"
)

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

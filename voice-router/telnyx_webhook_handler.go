package main

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
)

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

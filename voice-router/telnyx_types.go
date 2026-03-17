package main

import "encoding/json"

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

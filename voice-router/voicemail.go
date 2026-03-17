package main

import (
	"log/slog"
	"time"
)

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

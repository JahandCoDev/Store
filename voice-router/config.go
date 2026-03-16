package main

import (
	"fmt"
	"log/slog"
	"os"
	"strconv"
	"strings"
	"time"
)

// Config holds all runtime configuration loaded from environment variables.
type Config struct {
	// Server
	Port string

	// Telnyx
	TelnyxAPIKey    string
	TelnyxPublicKey string // Used for HMAC webhook signature verification

	// LiveKit
	LiveKitAPIKey    string
	LiveKitAPISecret string
	LiveKitURL       string // e.g. wss://yourproject.livekit.cloud
	// LiveKitSIPURI is the SIP URI Telnyx will transfer the call to.
	// In most SIP trunk setups this should look like: sip:+E164@<yourproject>.sip.livekit.cloud
	LiveKitSIPURI string
	// LiveKitRoomPrefix is used when searching for LiveKit rooms created by dispatch rules.
	// It should match the dispatch rule's room prefix (e.g. "voice-").
	LiveKitRoomPrefix string

	// Google AI (Gemini Multimodal Live)
	GoogleAPIKey string

	// Human Escalation
	HumanEscalationNumber string // e.g. +14073082412
	EscalationWaitSecs    int    // seconds a caller can wait before escalating
	EscalationRingSecs    int    // seconds to ring escalation phone before voicemail

	// Business Hours (Mon–Fri, 08:00–17:00 EST)
	BusinessOpen  string // "08:00"
	BusinessClose string // "17:00"
	BusinessTZ    string // "America/New_York"
	BusinessDays  []time.Weekday

	// Voicemail Email
	VoicemailTo  string
	SMTPHost     string
	SMTPPort     string
	SMTPUser     string
	SMTPPass     string
	SMTPFromName string
	SMTPFromAddr string

	// IVR copy (overridable)
	TelnyxVoice       string
	IVRMainMenuText   string
	IVRAfterHoursText string
	IVRVoicemailText  string
	IVRTransferText   string
}

// LoadConfig reads environment variables and returns a Config.
func LoadConfig() (*Config, error) {
	cfg := &Config{
		Port:                  getEnvOrDefault("PORT", "8080"),
		TelnyxAPIKey:          os.Getenv("TELNYX_API_KEY"),
		TelnyxPublicKey:       os.Getenv("TELNYX_PUBLIC_KEY"),
		HumanEscalationNumber: getEnvOrDefault("HUMAN_ESCALATION_NUMBER", "+14073082412"),
		EscalationWaitSecs:    getEnvIntOrDefault("ESCALATION_WAIT_SECS", 90),
		EscalationRingSecs:    getEnvIntOrDefault("ESCALATION_RING_SECS", 25),
		BusinessOpen:          getEnvOrDefault("BUSINESS_HOURS_OPEN", "08:00"),
		BusinessClose:         getEnvOrDefault("BUSINESS_HOURS_CLOSE", "17:00"),
		BusinessTZ:            getEnvOrDefault("BUSINESS_HOURS_TZ", "America/New_York"),
		VoicemailTo:           os.Getenv("VOICEMAIL_EMAIL"),
		SMTPHost:              getEnvOrDefault("SMTP_HOST", "smtp.gmail.com"),
		SMTPPort:              getEnvOrDefault("SMTP_PORT", "587"),
		SMTPUser:              os.Getenv("SMTP_USER"),
		SMTPPass:              os.Getenv("SMTP_PASS"),
		SMTPFromName:          getEnvOrDefault("SMTP_FROM_NAME", "Store Phone System"),
		SMTPFromAddr:          getEnvOrDefault("SMTP_FROM_ADDR", os.Getenv("SMTP_USER")),

		TelnyxVoice: getEnvOrDefault("TELNYX_VOICE", "male"),

		// LiveKit
		LiveKitAPIKey:     os.Getenv("LIVEKIT_API_KEY"),
		LiveKitAPISecret:  os.Getenv("LIVEKIT_API_SECRET"),
		LiveKitURL:        os.Getenv("LIVEKIT_URL"),
		LiveKitSIPURI:     os.Getenv("LIVEKIT_SIP_URI"),
		LiveKitRoomPrefix: getEnvOrDefault("LIVEKIT_ROOM_PREFIX", "voice-"),

		// Google AI
		GoogleAPIKey: os.Getenv("GOOGLE_API_KEY"),
		IVRMainMenuText: getEnvOrDefault("IVR_MAIN_MENU_TEXT",
			"Thank you for calling the Store. "+
				"Press 1 to speak with our support team. "+
				"Press 0 to leave a voicemail."),
		IVRAfterHoursText: getEnvOrDefault("IVR_AFTER_HOURS_TEXT",
			"Thank you for calling the Store. Our office is currently closed. "+
				"Our hours are Monday through Friday, 8 AM to 5 PM Eastern Time. "+
				"Please leave a message after the tone and we will get back to you the next business day."),
		IVRVoicemailText: getEnvOrDefault("IVR_VOICEMAIL_TEXT",
			"Please leave your message after the tone. Press the pound key when finished."),
		IVRTransferText: getEnvOrDefault("IVR_TRANSFER_TEXT",
			"Please hold while we connect you with our support team."),
	}

	// Parse business days
	daysStr := getEnvOrDefault("BUSINESS_HOURS_DAYS", "Mon,Tue,Wed,Thu,Fri")
	cfg.BusinessDays = parseDays(daysStr)

	// Validate required fields
	if cfg.TelnyxAPIKey == "" {
		return nil, fmt.Errorf("TELNYX_API_KEY is required")
	}
	if cfg.LiveKitAPIKey == "" || cfg.LiveKitAPISecret == "" || cfg.LiveKitURL == "" {
		slog.Warn("LiveKit credentials not fully set — AI agent features may fail")
	}
	if cfg.GoogleAPIKey == "" {
		slog.Warn("GOOGLE_API_KEY not set — Gemini Multimodal Live will be disabled")
	}
	if cfg.VoicemailTo == "" {
		slog.Warn("VOICEMAIL_EMAIL not set — voicemail recordings will not be emailed")
	}

	return cfg, nil
}

// IsBusinessHours returns true if the current moment falls within configured business hours.
func (c *Config) IsBusinessHours() bool {
	loc, err := time.LoadLocation(c.BusinessTZ)
	if err != nil {
		slog.Error("Invalid timezone, defaulting to UTC", "tz", c.BusinessTZ, "err", err)
		loc = time.UTC
	}
	now := time.Now().In(loc)

	// Check day of week
	dayMatch := false
	for _, d := range c.BusinessDays {
		if now.Weekday() == d {
			dayMatch = true
			break
		}
	}
	if !dayMatch {
		return false
	}

	// Check time of day
	openH, openM := parseHHMM(c.BusinessOpen)
	closeH, closeM := parseHHMM(c.BusinessClose)

	// Extended hours / 24-hour mode override
	if openH == 0 && openM == 0 && (closeH == 24 || closeH == 0 || (closeH == 23 && closeM == 59)) {
		return true
	}

	open := time.Date(now.Year(), now.Month(), now.Day(), openH, openM, 0, 0, loc)
	close := time.Date(now.Year(), now.Month(), now.Day(), closeH, closeM, 0, 0, loc)

	// Make the logic inclusive for exact start times
	return (now.Equal(open) || now.After(open)) && now.Before(close)
}

// ---- helpers ----

func getEnvOrDefault(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}

func getEnvIntOrDefault(key string, defaultVal int) int {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return defaultVal
	}
	if n, err := strconv.Atoi(v); err == nil {
		return n
	}
	return defaultVal
}

func parseDays(s string) []time.Weekday {
	dayMap := map[string]time.Weekday{
		"sun": time.Sunday, "mon": time.Monday, "tue": time.Tuesday,
		"wed": time.Wednesday, "thu": time.Thursday, "fri": time.Friday,
		"sat": time.Saturday,
	}
	var result []time.Weekday
	for _, part := range strings.Split(s, ",") {
		key := strings.ToLower(strings.TrimSpace(part))
		if d, ok := dayMap[key]; ok {
			result = append(result, d)
		}
	}
	if len(result) == 0 {
		// Default Mon–Fri
		result = []time.Weekday{
			time.Monday, time.Tuesday, time.Wednesday, time.Thursday, time.Friday,
		}
	}
	return result
}

func parseHHMM(s string) (int, int) {
	parts := strings.Split(s, ":")
	if len(parts) != 2 {
		return 0, 0
	}
	h, m := 0, 0
	fmt.Sscanf(parts[0], "%d", &h)
	fmt.Sscanf(parts[1], "%d", &m)
	return h, m
}

package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"
)

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

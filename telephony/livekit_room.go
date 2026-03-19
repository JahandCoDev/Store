package main

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/livekit/protocol/livekit"
	lksdk "github.com/livekit/server-sdk-go/v2"
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

	var candidatePrefixes []string
	if callerNumber != "" {
		candidatePrefixes = append(candidatePrefixes, prefix+callerNumber)
	}
	if sipCallee != "" {
		candidatePrefixes = append(candidatePrefixes, prefix+sipCallee)
	}
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

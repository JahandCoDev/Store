package main

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"sync"

	lksdk "github.com/livekit/server-sdk-go/v2"
	"github.com/pion/webrtc/v4"
)

// HoldRoomSystem handles the holding room logic.
type HoldRoomSystem struct {
	ctx           context.Context
	cancel        context.CancelFunc
	room          *lksdk.Room
	mu            sync.Mutex
	isFinished    bool
	callControlID string
	cfg           *Config
}

// NewHoldRoomSystem creates a new wait room for a caller.
func NewHoldRoomSystem(roomName, callControlID string, cfg *Config) (*HoldRoomSystem, error) {
	ctx, cancel := context.WithCancel(context.Background())

	roomCB := &lksdk.RoomCallback{
		ParticipantCallback: lksdk.ParticipantCallback{
			OnTrackSubscribed: func(track *webrtc.TrackRemote, pub *lksdk.RemoteTrackPublication, rp *lksdk.RemoteParticipant) {
				slog.Info("Caller track subscribed", "participant", rp.Identity())
			},
		},
	}

	room, err := lksdk.ConnectToRoom(cfg.LiveKitURL, lksdk.ConnectInfo{
		APIKey:              cfg.LiveKitAPIKey,
		APISecret:           cfg.LiveKitAPISecret,
		RoomName:            roomName,
		ParticipantIdentity: "system-hold-" + callControlID,
		ParticipantName:     "Hold System",
	}, roomCB)

	if err != nil {
		cancel()
		return nil, fmt.Errorf("failed to connect to LiveKit: %w", err)
	}

	sys := &HoldRoomSystem{
		ctx:           ctx,
		cancel:        cancel,
		room:          room,
		callControlID: callControlID,
		cfg:           cfg,
	}

	// Stop hold music when a new participant (agent) joins
	roomCB.OnParticipantConnected = func(p *lksdk.RemoteParticipant) {
		identity := p.Identity()
		slog.Info("Participant joined the hold room", "participant", identity)
		if !strings.HasPrefix(identity, "agent-") {
			return
		}
		slog.Info("Agent joined the hold room — stopping hold music", "agent", identity)
		sys.Close() // this will stop the music and disconnect the hold system

		// Update call status to answered
		if state, ok := getCall(callControlID); ok {
			state.Status = "answered"
		}
	}

	return sys, nil
}

// Start plays hold music in the room.
func (h *HoldRoomSystem) Start() {
	slog.Info("Starting Hold Room", "room", h.room.Name())

	state, ok := getCall(h.callControlID)
	if ok {
		state.Status = "waiting"
	}

	files := []string{"hold01.ogg", "hold02.ogg"}
	loopingReader := NewLoopingFileReader(files)

	track, err := lksdk.NewLocalReaderTrack(loopingReader, webrtc.MimeTypeOpus)
	if err != nil {
		slog.Error("Failed to create looping reader track", "err", err)
		return
	}

	_, err = h.room.LocalParticipant.PublishTrack(track, &lksdk.TrackPublicationOptions{
		Name: "hold_music",
	})
	if err != nil {
		slog.Warn("Failed to publish hold music", "err", err)
		h.Close()
		return
	}

	slog.Info("Publishing continuous hold music track...")
	<-h.ctx.Done()
}

func (h *HoldRoomSystem) Close() {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.isFinished {
		return
	}
	h.isFinished = true
	h.cancel()
	h.room.Disconnect()
	slog.Info("Hold Room system disconnected")
}

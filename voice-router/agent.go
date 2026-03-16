package main

import (
	"context"
	"fmt"
	"log/slog"
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
		slog.Info("Agent joined the hold room!", "agent", p.Identity())
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
	var playTrack func(index int)
	var currentTrackPub *lksdk.LocalTrackPublication

	playTrack = func(index int) {
		h.mu.Lock()
		if h.isFinished {
			h.mu.Unlock()
			return
		}

		if currentTrackPub != nil {
			h.room.LocalParticipant.UnpublishTrack(currentTrackPub.SID())
			currentTrackPub = nil
		}
		h.mu.Unlock()

		file := files[index%len(files)]
		slog.Info("Playing hold music", "file", file)

		track, err := lksdk.NewLocalFileTrack(file, lksdk.ReaderTrackWithOnWriteComplete(func() {
			slog.Info("Finished playing hold file, queuing next", "file", file)
			playTrack(index + 1)
		}))

		if err == nil {
			pub, err := h.room.LocalParticipant.PublishTrack(track, &lksdk.TrackPublicationOptions{
				Name: "hold_music",
			})
			if err != nil {
				slog.Warn("Failed to publish hold music", "err", err)
			} else {
				h.mu.Lock()
				currentTrackPub = pub
				h.mu.Unlock()
			}
		} else {
			slog.Warn("Could not load hold_music file", "err", err, "file", file)
		}
	}

	playTrack(0)
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

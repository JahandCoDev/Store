package main

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"os"
	"strings"
	"sync"
	"time"

	lksdk "github.com/livekit/server-sdk-go/v2"
	"github.com/pion/webrtc/v4"
	"github.com/pion/webrtc/v4/pkg/media"
	"github.com/pion/webrtc/v4/pkg/media/oggreader"
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

	track, err := webrtc.NewTrackLocalStaticSample(
		webrtc.RTPCodecCapability{MimeType: webrtc.MimeTypeOpus},
		"audio",
		"hold_music",
	)
	if err != nil {
		slog.Error("Failed to create hold music track", "err", err)
		h.Close()
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

	const opusSampleRate = 48000
	for {
		for _, filename := range files {
			if err := streamOggOpusFile(h.ctx, track, filename, opusSampleRate); err != nil {
				if err == context.Canceled {
					return
				}
				slog.Warn("Hold music stream error", "file", filename, "err", err)
				// If a file fails, try the next one.
			}
			select {
			case <-h.ctx.Done():
				return
			default:
			}
		}
	}
}

func streamOggOpusFile(ctx context.Context, track *webrtc.TrackLocalStaticSample, filename string, sampleRate int) error {
	file, err := os.Open(filename)
	if err != nil {
		return err
	}
	defer file.Close()

	ogg, _, err := oggreader.NewWith(file)
	if err != nil {
		return err
	}

	var lastGranule uint64
	for {
		select {
		case <-ctx.Done():
			return context.Canceled
		default:
		}

		pageData, pageHeader, err := ogg.ParseNextPage()
		if err != nil {
			if err == io.EOF {
				return nil
			}
			return err
		}

		granule := pageHeader.GranulePosition
		var sampleCount uint64
		if granule > lastGranule {
			sampleCount = granule - lastGranule
		}
		lastGranule = granule

		duration := time.Duration(sampleCount) * time.Second / time.Duration(sampleRate)
		if duration <= 0 {
			// Fallback to a reasonable pacing to avoid tight loops on metadata pages.
			duration = 20 * time.Millisecond
		}

		if err := track.WriteSample(media.Sample{Data: pageData, Duration: duration}); err != nil {
			return err
		}
		time.Sleep(duration)
	}
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

package main

import (
	"context"
	"errors"
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
		
		if strings.HasPrefix(identity, "agent-") {
			slog.Info("Agent joined the hold room — stopping hold music", "agent", identity)
			sys.Close() // this will stop the music and disconnect the hold system

			// Update call status to answered
			if state, ok := getCall(callControlID); ok {
				state.Status = "answered"
			}
		}
	}

	return sys, nil
}

// Start plays hold music in the room.
func (h *HoldRoomSystem) Start() {
	slog.Info("Starting Hold Room", "room", h.room.Name())

	if state, ok := getCall(h.callControlID); ok {
		state.Status = "waiting"
	}

	// 1. Use LiveKit's Native Sample Track
	track, err := lksdk.NewLocalSampleTrack(webrtc.RTPCodecCapability{
		MimeType:  webrtc.MimeTypeOpus,
		ClockRate: 48000,
		Channels:  2,
	})
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

	files := []string{"hold01.ogg", "hold02.ogg"}
	const opusSampleRate = 48000

	for {
		for _, filename := range files {
			// Prevent starting a new file if the agent already joined and closed the room
			if h.ctx.Err() != nil {
				return
			}
			
			slog.Info("Playing hold file", "file", filename)
			if err := streamOggOpusFile(h.ctx, track, filename, opusSampleRate); err != nil {
				if errors.Is(err, context.Canceled) {
					return
				}
				slog.Warn("Hold music stream error", "file", filename, "err", err)
			}
		}
	}
}

func streamOggOpusFile(ctx context.Context, track *lksdk.LocalSampleTrack, filename string, sampleRate int) error {
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
	
	// 2. Establish a precise clock for audio pacing
	nextFireTime := time.Now()

	for {
		if ctx.Err() != nil {
			return context.Canceled
		}

		pageData, pageHeader, err := ogg.ParseNextPage()
		if err != nil {
			if err == io.EOF {
				return nil // File is finished, return naturally to loop to the next file
			}
			return err
		}

		granule := pageHeader.GranulePosition
		
		// 3. FIX: Drop OGG Header Pages
		// If granule is 0, this is the OpusHead or OpusTags metadata page. Do not send to WebRTC.
		if granule == 0 {
			continue
		}

		var sampleCount uint64
		if granule > lastGranule {
			sampleCount = granule - lastGranule
		}
		lastGranule = granule

		duration := time.Duration((float64(sampleCount) / float64(sampleRate)) * float64(time.Second))

		if duration > 0 {
			err = track.WriteSample(media.Sample{
				Data:     pageData,
				Duration: duration,
			}, nil)
			if err != nil {
				return err
			}

			// 4. FIX: Precise Pacer instead of time.Sleep
			nextFireTime = nextFireTime.Add(duration)
			sleepDuration := time.Until(nextFireTime)
			
			if sleepDuration > 0 {
				select {
				case <-time.After(sleepDuration):
					// Paced correctly
				case <-ctx.Done():
					return context.Canceled
				}
			} else {
				// If the CPU fell behind, reset the clock to prevent a massive burst of delayed packets
				nextFireTime = time.Now()
			}
		}
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
package main

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/livekit/protocol/auth"
)

func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ok"}`))
}

func handleActiveCalls(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	activeCallsMu.RLock()
	defer activeCallsMu.RUnlock()

	var waiting []CallState
	for _, call := range activeCalls {
		if call.Status == "waiting" {
			waiting = append(waiting, *call)
		}
	}
	if waiting == nil {
		waiting = []CallState{}
	}

	_ = json.NewEncoder(w).Encode(waiting)
}

func handleJoinRoom(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	roomName := r.URL.Query().Get("room")
	agentName := r.URL.Query().Get("agent")
	if roomName == "" || agentName == "" {
		http.Error(w, `{"error":"room and agent required"}`, http.StatusBadRequest)
		return
	}

	canPublish := true
	canSubscribe := true

	at := auth.NewAccessToken(cfg.LiveKitAPIKey, cfg.LiveKitAPISecret)
	grant := &auth.VideoGrant{
		RoomJoin:       true,
		Room:           roomName,
		CanPublish:     &canPublish,
		CanPublishData: &canPublish,
		CanSubscribe:   &canSubscribe,
	}
	at.AddGrant(grant).
		SetIdentity("agent-" + agentName).
		SetValidFor(time.Hour)

	token, err := at.ToJWT()
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	_ = json.NewEncoder(w).Encode(map[string]string{
		"token": token,
		"url":   cfg.LiveKitURL,
	})
}

func handleAnswer(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	callControlID := r.URL.Query().Get("call_control_id")
	agentName := r.URL.Query().Get("agent")
	if callControlID == "" || agentName == "" {
		http.Error(w, `{"error":"call_control_id and agent required"}`, http.StatusBadRequest)
		return
	}

	state, ok := getCall(callControlID)
	if !ok || state == nil {
		http.Error(w, `{"error":"call not found"}`, http.StatusNotFound)
		return
	}

	slog.Info("Answer requested", "call_id", callControlID, "agent", agentName, "from", state.From, "known_room", state.LiveKitRoom != "")

	roomName := strings.TrimSpace(state.LiveKitRoom)
	if roomName == "" {
		ctx, cancel := context.WithTimeout(r.Context(), 25*time.Second)
		defer cancel()
		rn, err := waitForDispatchedLiveKitRoom(ctx, state.From, sipUserPart(cfg.LiveKitSIPURI))
		if err == nil && rn != "" {
			roomName = rn
			state.LiveKitRoom = rn
		} else {
			slog.Warn("Answer requested before dispatched room known; falling back to deterministic room", "call_id", callControlID, "err", err)
			roomName = liveKitRoomName(state.From)
		}
	}

	slog.Info("Answer resolved room", "call_id", callControlID, "agent", agentName, "room", roomName)

	canPublish := true
	canSubscribe := true

	at := auth.NewAccessToken(cfg.LiveKitAPIKey, cfg.LiveKitAPISecret)
	grant := &auth.VideoGrant{
		RoomJoin:       true,
		Room:           roomName,
		CanPublish:     &canPublish,
		CanPublishData: &canPublish,
		CanSubscribe:   &canSubscribe,
	}
	at.AddGrant(grant).
		SetIdentity("agent-" + agentName).
		SetValidFor(time.Hour)

	token, err := at.ToJWT()
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	_ = json.NewEncoder(w).Encode(map[string]string{
		"token": token,
		"url":   cfg.LiveKitURL,
		"room":  roomName,
	})
}

func handleStopHold(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	callControlID := r.URL.Query().Get("call_control_id")
	if callControlID == "" {
		http.Error(w, `{"error":"call_control_id required"}`, http.StatusBadRequest)
		return
	}

	slog.Info("Stop-hold requested", "call_id", callControlID)

	var stopped bool
	var hadSystem bool
	var sysToClose *HoldRoomSystem

	holdRoomsMu.Lock()
	if sys, ok := holdRooms[callControlID]; ok {
		hadSystem = true
		delete(holdRooms, callControlID)
		sysToClose = sys
		stopped = true
	}
	holdRoomsMu.Unlock()

	if sysToClose != nil {
		sysToClose.Close()
	}

	slog.Info("Stop-hold complete", "call_id", callControlID, "had_hold", hadSystem, "hold_stopped", stopped)

	if state, ok := getCall(callControlID); ok {
		state.Status = "answered"
	}

	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"ok":           true,
		"had_hold":     hadSystem,
		"hold_stopped": stopped,
	})
}

func handleTransfer(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		CallControlID string `json:"call_control_id"`
		Extension     string `json:"extension"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		slog.Error("Failed to decode transfer request", "err", err)
		http.Error(w, `{"error":"Invalid request format"}`, http.StatusBadRequest)
		return
	}

	if req.CallControlID == "" || req.Extension == "" {
		http.Error(w, `{"error":"Missing call_control_id or extension"}`, http.StatusBadRequest)
		return
	}

	slog.Info("Transfer request received", "call_id", req.CallControlID, "extension", req.Extension)

	destination := req.Extension
	if len(destination) == 10 {
		destination = "+1" + destination
	}

	sendCommand(req.CallControlID, "actions/transfer", map[string]interface{}{
		"to": destination,
	})

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"success"}`))
}

func handleEndCallAPI(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	var req struct {
		CallControlID string `json:"call_control_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err == nil && req.CallControlID != "" {
		sendCommand(req.CallControlID, "actions/hangup", nil)
		slog.Info("Admin ended call", "call_id", req.CallControlID)
	}

	w.WriteHeader(http.StatusOK)
}

func handleHoldAPI(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	var req struct {
		CallControlID string `json:"call_control_id"`
		Hold          bool   `json:"hold"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err == nil && req.CallControlID != "" {
		slog.Info("Admin toggled hold", "call_id", req.CallControlID, "hold", req.Hold)

		if req.Hold {
			if state, ok := getCall(req.CallControlID); ok {
				state.Status = "held"
				roomName := state.LiveKitRoom
				if roomName == "" {
					roomName = liveKitRoomName(state.From)
				}

				holdSys, err := NewHoldRoomSystem(roomName, req.CallControlID, cfg)
				if err == nil {
					holdRoomsMu.Lock()
					holdRooms[req.CallControlID] = holdSys
					holdRoomsMu.Unlock()
					go holdSys.Start()
				}
			}
		} else {
			if state, ok := getCall(req.CallControlID); ok {
				state.Status = "answered"
			}
			holdRoomsMu.Lock()
			if sys, ok := holdRooms[req.CallControlID]; ok {
				sys.Close()
				delete(holdRooms, req.CallControlID)
			}
			holdRoomsMu.Unlock()
		}
	}
	w.WriteHeader(http.StatusOK)
}

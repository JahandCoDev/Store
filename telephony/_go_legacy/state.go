package main

import (
	"sync"
	"time"
)

// ─── Call State Machine ───────────────────────────────────────────────────────

type CallState struct {
	CallControlID          string    `json:"call_control_id"`
	CallSessionID          string    `json:"call_session_id"`
	From                   string    `json:"from"`
	LiveKitRoom            string    `json:"livekit_room,omitempty"`
	EscalationStartedAt    time.Time `json:"-"`
	EscalationLegID        string    `json:"-"`
	EscalationScheduled    bool      `json:"-"`
	EscalationInProgress   bool      `json:"-"`
	EscalationAnswered     bool      `json:"-"`
	MenuRetries            int       `json:"-"`
	InVoicemail            bool      `json:"-"`
	PendingLiveKitTransfer bool      `json:"-"`
	LiveKitTransferred     bool      `json:"-"`
	PendingTransferTo      string    `json:"-"`      // generic transfer after speak completes
	Status                 string    `json:"status"` // "ringing", "in_menu", "waiting", "in_voicemail"
	StartedAt              time.Time `json:"started_at"`
}

var (
	holdRoomsMu sync.Mutex
	holdRooms   = make(map[string]*HoldRoomSystem)
)

var (
	activeCalls   = make(map[string]*CallState)
	activeCallsMu sync.RWMutex
)

var (
	inboundBySession   = make(map[string]string)
	inboundBySessionMu sync.RWMutex
)

type OutboundLegKind string

const (
	OutboundLegLiveKit    OutboundLegKind = "livekit"
	OutboundLegEscalation OutboundLegKind = "escalation"
)

type OutboundLeg struct {
	CallControlID string
	CallSessionID string
	To            string
	Kind          OutboundLegKind
	ParentCallID  string
}

var (
	outboundLegs   = make(map[string]*OutboundLeg)
	outboundLegsMu sync.RWMutex
)

func storeCall(state *CallState) {
	activeCallsMu.Lock()
	defer activeCallsMu.Unlock()
	activeCalls[state.CallControlID] = state
	if state.CallSessionID != "" {
		inboundBySessionMu.Lock()
		inboundBySession[state.CallSessionID] = state.CallControlID
		inboundBySessionMu.Unlock()
	}
}

func getCall(callControlID string) (*CallState, bool) {
	activeCallsMu.RLock()
	defer activeCallsMu.RUnlock()
	s, ok := activeCalls[callControlID]
	return s, ok
}

func removeCall(callControlID string) {
	activeCallsMu.Lock()
	defer activeCallsMu.Unlock()
	if st, ok := activeCalls[callControlID]; ok {
		if st.CallSessionID != "" {
			inboundBySessionMu.Lock()
			if inboundBySession[st.CallSessionID] == callControlID {
				delete(inboundBySession, st.CallSessionID)
			}
			inboundBySessionMu.Unlock()
		}
	}
	delete(activeCalls, callControlID)
	removeAgentState(callControlID)
}

func getInboundBySession(callSessionID string) (string, bool) {
	inboundBySessionMu.RLock()
	defer inboundBySessionMu.RUnlock()
	id, ok := inboundBySession[callSessionID]
	return id, ok
}

func storeOutboundLeg(leg *OutboundLeg) {
	outboundLegsMu.Lock()
	defer outboundLegsMu.Unlock()
	outboundLegs[leg.CallControlID] = leg
}

func getOutboundLeg(callControlID string) (*OutboundLeg, bool) {
	outboundLegsMu.RLock()
	defer outboundLegsMu.RUnlock()
	leg, ok := outboundLegs[callControlID]
	return leg, ok
}

func removeOutboundLeg(callControlID string) {
	outboundLegsMu.Lock()
	defer outboundLegsMu.Unlock()
	delete(outboundLegs, callControlID)
}

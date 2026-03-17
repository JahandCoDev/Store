package main

import (
	"log/slog"
	"strings"
	"time"
)

// ─── Call Event Handlers ──────────────────────────────────────────────────────

func handleCallInitiated(p CallPayload) {
	if p.Direction == "outgoing" {
		handleOutboundInitiated(p)
		return
	}
	if strings.HasPrefix(p.To, "sip:") {
		// Telnyx creates a separate call_control_id for the SIP transfer leg.
		// We must ignore ALL subsequent events for this call id.
		storeOutboundLeg(&OutboundLeg{
			CallControlID: p.CallControlID,
			CallSessionID: p.CallSessionID,
			To:            p.To,
			Kind:          OutboundLegLiveKit,
		})
		slog.Info("Ignoring LiveKit SIP transfer leg", "call_id", p.CallControlID, "to", p.To)
		return
	}

	slog.Info("Call initiated", "from", p.From, "to", p.To)
	sendCommand(p.CallControlID, "actions/answer", nil)
}

func handleCallAnswered(p CallPayload) {
	if leg, ok := getOutboundLeg(p.CallControlID); ok {
		// Never run IVR on outbound legs.
		if leg.Kind == OutboundLegLiveKit {
			return
		}
		if leg.Kind == OutboundLegEscalation {
			handleOutboundAnswered(p)
			return
		}
	}

	if p.Direction == "outgoing" {
		handleOutboundAnswered(p)
		return
	}
	if strings.HasPrefix(p.To, "sip:") {
		// Defensive: never run IVR on SIP legs.
		slog.Info("Ignoring SIP leg answered", "call_id", p.CallControlID, "to", p.To)
		return
	}

	slog.Info("Call answered", "from", p.From)

	state := &CallState{
		CallControlID: p.CallControlID,
		CallSessionID: p.CallSessionID,
		From:          p.From,
		Status:        "in_menu",
		StartedAt:     time.Now(),
	}
	storeCall(state)

	if !cfg.IsBusinessHours() {
		slog.Info("After hours — routing to voicemail", "call_id", p.CallControlID)
		playAfterHoursAndVoicemail(p.CallControlID)
		return
	}

	if cfg.EnableVoiceAgent {
		startVirtualAgent(p.CallControlID)
		return
	}
	playMainMenu(p.CallControlID)
}

func handleOutboundInitiated(p CallPayload) {
	// LiveKit SIP outbound leg: ignore entirely (we don't control it).
	if strings.HasPrefix(p.To, "sip:") {
		slog.Info("Ignoring outbound SIP transfer leg", "call_id", p.CallControlID, "to", p.To)
		return
	}

	parentID, ok := getInboundBySession(p.CallSessionID)
	if !ok {
		slog.Info("Outbound leg has no tracked inbound session", "call_id", p.CallControlID, "session_id", p.CallSessionID, "to", p.To)
		return
	}

	kind := OutboundLegKind("unknown")
	if strings.TrimSpace(p.To) == strings.TrimSpace(cfg.HumanEscalationNumber) {
		kind = OutboundLegEscalation
	}

	leg := &OutboundLeg{
		CallControlID: p.CallControlID,
		CallSessionID: p.CallSessionID,
		To:            p.To,
		Kind:          kind,
		ParentCallID:  parentID,
	}
	storeOutboundLeg(leg)

	if kind == OutboundLegEscalation {
		if st, ok := getCall(parentID); ok {
			st.EscalationLegID = p.CallControlID
		}
	}
}

func handleOutboundAnswered(p CallPayload) {
	leg, ok := getOutboundLeg(p.CallControlID)
	if !ok {
		// Unknown outbound leg; ignore.
		return
	}
	if leg.Kind != OutboundLegEscalation {
		return
	}

	st, ok := getCall(leg.ParentCallID)
	if !ok {
		return
	}

	slog.Info("Escalation phone answered", "parent_call_id", leg.ParentCallID, "leg_call_id", p.CallControlID, "to", leg.To)
	st.EscalationAnswered = true
	st.EscalationInProgress = false
	st.Status = "answered"

	// Stop any hold music system if it is still running.
	holdRoomsMu.Lock()
	if sys, ok := holdRooms[leg.ParentCallID]; ok {
		sys.Close()
		delete(holdRooms, leg.ParentCallID)
	}
	holdRoomsMu.Unlock()
}

func handleCallBridged(p CallPayload) {
	// Useful for debugging state; we don't need to act on this yet.
	if st, ok := getCall(p.CallControlID); ok {
		slog.Info("Call bridged", "call_id", p.CallControlID, "status", st.Status)
		if st.EscalationInProgress && !st.EscalationAnswered {
			// Bridged means the caller is now connected to the escalation destination.
			st.EscalationAnswered = true
			st.EscalationInProgress = false
			st.Status = "answered"
		}
	}
}

func handleCallHangup(p CallPayload) {
	slog.Info("Call ended", "call_id", p.CallControlID, "cause", p.HangupCause)
	if leg, ok := getOutboundLeg(p.CallControlID); ok {
		// If the escalation leg hung up before being answered, route parent call to voicemail.
		if leg.Kind == OutboundLegEscalation {
			if st, ok := getCall(leg.ParentCallID); ok {
				if st.EscalationInProgress && !st.EscalationAnswered && !st.InVoicemail {
					slog.Info("Escalation leg ended — routing parent to voicemail", "parent_call_id", leg.ParentCallID, "leg_call_id", p.CallControlID, "cause", p.HangupCause)
					st.EscalationInProgress = false
					startVoicemail(leg.ParentCallID)
				}
			}
		}
		if leg.Kind == OutboundLegLiveKit {
			removeOutboundLeg(p.CallControlID)
			return
		}
		removeOutboundLeg(p.CallControlID)
		return
	}

	removeCall(p.CallControlID)

	holdRoomsMu.Lock()
	if sys, ok := holdRooms[p.CallControlID]; ok {
		slog.Info("Cleaning up active hold room for dropped call", "call_id", p.CallControlID)
		sys.Close()
		delete(holdRooms, p.CallControlID)
	}
	holdRoomsMu.Unlock()
}

package main

import (
	"log/slog"
	"time"
)

func scheduleEscalation(callControlID string) {
	st, ok := getCall(callControlID)
	if !ok {
		return
	}
	if st.EscalationScheduled || cfg.HumanEscalationNumber == "" {
		return
	}
	st.EscalationScheduled = true

	wait := time.Duration(cfg.EscalationWaitSecs) * time.Second
	ring := time.Duration(cfg.EscalationRingSecs) * time.Second

	go func() {
		t := time.NewTimer(wait)
		defer t.Stop()
		<-t.C

		state, ok := getCall(callControlID)
		if !ok {
			return
		}
		if state.InVoicemail || state.Status != "waiting" {
			return
		}

		slog.Info("Escalation timer fired", "call_id", callControlID, "to", cfg.HumanEscalationNumber)
		state.EscalationInProgress = true
		state.EscalationStartedAt = time.Now()
		state.Status = "escalating"

		// Stop hold music before transferring out.
		holdRoomsMu.Lock()
		if sys, ok := holdRooms[callControlID]; ok {
			sys.Close()
			delete(holdRooms, callControlID)
		}
		holdRoomsMu.Unlock()

		// Transfer the original inbound call to the human escalation phone.
		sendCommand(callControlID, "actions/transfer", map[string]interface{}{
			"to": cfg.HumanEscalationNumber,
		})

		// If the escalation leg isn't answered within ring timeout, route caller to voicemail.
		go func() {
			t2 := time.NewTimer(ring)
			defer t2.Stop()
			<-t2.C

			state, ok := getCall(callControlID)
			if !ok {
				return
			}
			if !state.EscalationInProgress || state.EscalationAnswered || state.InVoicemail {
				return
			}

			slog.Info("Escalation timed out — routing to voicemail", "call_id", callControlID)
			state.EscalationInProgress = false
			startVoicemail(callControlID)
		}()
	}()
}

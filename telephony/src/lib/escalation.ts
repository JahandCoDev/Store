// src/lib/escalation.ts
import { getConfig } from "./config";
import { getCall, getHoldRoom, removeHoldRoom } from "./state";
import { sendCommand } from "./telnyx";
import { startVoicemail } from "./voicemail";

export function scheduleEscalation(callControlId: string): void {
  const cfg = getConfig();
  const state = getCall(callControlId);
  if (!state) return;
  if (state.escalationScheduled || !cfg.humanEscalationNumber) return;
  state.escalationScheduled = true;

  const waitMs = cfg.escalationWaitSecs * 1000;
  const ringMs = cfg.escalationRingSecs * 1000;

  setTimeout(() => {
    const st = getCall(callControlId);
    if (!st || st.inVoicemail || st.status !== "waiting") return;

    console.log(`[escalation] timer fired for ${callControlId}`);
    st.escalationInProgress = true;
    st.escalationStartedAt = new Date();
    st.status = "escalating";

    // Stop hold room if active
    const holdCtrl = getHoldRoom(callControlId);
    if (holdCtrl) {
      holdCtrl.abort();
      removeHoldRoom(callControlId);
    }

    sendCommand(callControlId, "actions/transfer", { to: cfg.humanEscalationNumber });

    // Ring timeout
    setTimeout(() => {
      const st2 = getCall(callControlId);
      if (!st2 || !st2.escalationInProgress || st2.escalationAnswered || st2.inVoicemail) return;
      console.log(`[escalation] timed out — routing to voicemail for ${callControlId}`);
      st2.escalationInProgress = false;
      startVoicemail(callControlId);
    }, ringMs);
  }, waitMs);
}

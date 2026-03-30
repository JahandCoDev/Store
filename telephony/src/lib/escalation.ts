// telephony/src/lib/escalation.ts
// Converted from escalation.go

import { sendCommand } from "./telnyxClient";
import { getConfig } from "./config";
import { getCall } from "./state";
import { holdRooms } from "./holdRoomSystem";
import { startVoicemail } from "./voicemail";

export function scheduleEscalation(callControlID: string): void {
  const cfg = getConfig();
  const st = getCall(callControlID);
  if (!st) return;
  if (st.escalationScheduled || !cfg.humanEscalationNumber) return;
  st.escalationScheduled = true;

  const waitMs = cfg.escalationWaitSecs * 1_000;
  const ringMs = cfg.escalationRingSecs * 1_000;

  setTimeout(() => {
    const state = getCall(callControlID);
    if (!state) return;
    if (state.inVoicemail || state.status !== "waiting") return;

    console.log("[escalation] Timer fired", { call_id: callControlID, to: cfg.humanEscalationNumber });
    state.escalationInProgress = true;
    state.escalationStartedAt = new Date();
    state.status = "escalating";

    // Stop hold music before transferring
    const sys = holdRooms.get(callControlID);
    if (sys) { sys.close(); holdRooms.delete(callControlID); }

    sendCommand(callControlID, "actions/transfer", { to: cfg.humanEscalationNumber });

    // Ring timeout → voicemail
    setTimeout(() => {
      const s2 = getCall(callControlID);
      if (!s2) return;
      if (!s2.escalationInProgress || s2.escalationAnswered || s2.inVoicemail) return;

      console.log("[escalation] Timed out — routing to voicemail", { call_id: callControlID });
      s2.escalationInProgress = false;
      startVoicemail(callControlID);
    }, ringMs);
  }, waitMs);
}

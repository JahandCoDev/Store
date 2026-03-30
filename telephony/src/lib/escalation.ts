// src/lib/escalation.ts
import { getConfig } from "./config";
import { getCall, getHoldRoom, removeHoldRoom } from "./state";
import { sendCommand } from "./telnyx";
import { startVoicemail } from "./voicemail";
import {
  dialHumanToRoom,
  pollForHumanAnswer,
  removeHumanParticipant,
  stopHoldMusic,
} from "./livekit";

export function scheduleEscalation(callControlId: string): void {
  const cfg = getConfig();
  const state = getCall(callControlId);
  if (!state) return;
  if (state.escalationScheduled || !cfg.humanEscalationNumber) return;
  state.escalationScheduled = true;

  const waitMs = cfg.escalationWaitSecs * 1000;
  const ringMs = cfg.escalationRingSecs * 1000;

  setTimeout(() => {
    void (async () => {
      const st = getCall(callControlId);
      if (!st || st.inVoicemail || st.status !== "waiting") return;

      console.log(`[escalation] timer fired for ${callControlId}`);
      st.escalationInProgress = true;
      st.escalationStartedAt = new Date();
      st.status = "escalating";

      // Stop hold music ingress before connecting human
      if (st.holdMusicIngressId) {
        await stopHoldMusic(st.holdMusicIngressId);
        st.holdMusicIngressId = undefined;
      }

      // Stop hold room abort controller
      const holdCtrl = getHoldRoom(callControlId);
      if (holdCtrl) {
        holdCtrl.abort();
        removeHoldRoom(callControlId);
      }

      // Try LiveKit outbound dial first (human joins caller's room directly)
      const usedLiveKit =
        st.livekitRoom
          ? await dialHumanToRoom(st.livekitRoom, cfg.humanEscalationNumber)
          : false;

      if (usedLiveKit && st.livekitRoom) {
        const roomName = st.livekitRoom;
        // Poll until human answers or ring timeout
        pollForHumanAnswer(roomName, ringMs, () => {
          const st2 = getCall(callControlId);
          if (!st2) return;
          st2.escalationAnswered = true;
          st2.escalationInProgress = false;
          st2.status = "answered";
          console.log(`[escalation] human answered in LiveKit room ${roomName}`);
        }).then(() => {
          // After poll resolves (human answered OR timed out), check if still unanswered
          const st2 = getCall(callControlId);
          if (!st2 || st2.escalationAnswered || st2.inVoicemail) return;
          console.log(`[escalation] LiveKit ring timed out — routing to voicemail`);
          st2.escalationInProgress = false;
          void removeHumanParticipant(roomName);
          startVoicemail(callControlId);
        });
      } else {
        // Telnyx fallback: bridge inbound call directly to human's number
        sendCommand(callControlId, "actions/transfer", { to: cfg.humanEscalationNumber });

        // Ring timeout
        setTimeout(() => {
          const st2 = getCall(callControlId);
          if (!st2 || !st2.escalationInProgress || st2.escalationAnswered || st2.inVoicemail)
            return;
          console.log(`[escalation] Telnyx ring timed out — routing to voicemail for ${callControlId}`);
          st2.escalationInProgress = false;
          startVoicemail(callControlId);
        }, ringMs);
      }
    })();
  }, waitMs);
}

// src/lib/menu.ts
import { getConfig } from "./config";
import { getCall, storeHoldRoom, removeHoldRoom } from "./state";
import { sendCommand, say } from "./telnyx";
import { startVoicemail } from "./voicemail";
import { scheduleEscalation } from "./escalation";
import { waitForDispatchedLiveKitRoom, startHoldMusic } from "./livekit";
import { sendCallNotification } from "./push";

export function playMainMenu(callControlId: string): void {
  const cfg = getConfig();
  sendCommand(callControlId, "actions/gather_using_speak", {
    language: "en-US",
    voice: cfg.telnyxVoice,
    payload: cfg.ivrMainMenuText,
    minimum_digits: 1,
    maximum_digits: 1,
    valid_digits: "01",
    timeout_millis: 8000,
    inter_digit_timeout_millis: 5000,
  });
}

export function handleGatherEnded(callControlId: string, digits: string): void {
  const cfg = getConfig();
  const state = getCall(callControlId);
  if (!state) return;

  switch (digits) {
    case "1":
      if (!cfg.liveKitSipUri) {
        startVoicemail(callControlId);
        return;
      }
      state.pendingLiveKitTransfer = true;
      say(callControlId, cfg.ivrTransferText);
      break;
    case "0":
      startVoicemail(callControlId);
      break;
    default:
      state.menuRetries++;
      if (state.menuRetries >= 2) {
        startVoicemail(callControlId);
        return;
      }
      playMainMenu(callControlId);
  }
}

export function handleSpeakEnded(callControlId: string): void {
  const state = getCall(callControlId);
  if (!state) return;
  const cfg = getConfig();

  if (state.pendingTransferTo) {
    const to = state.pendingTransferTo;
    state.pendingTransferTo = undefined;
    sendCommand(callControlId, "actions/transfer", { to });
    return;
  }

  // LiveKit transfer check runs regardless of voice agent setting
  if (
    state.inVoicemail ||
    !cfg.liveKitSipUri ||
    !state.pendingLiveKitTransfer ||
    state.liveKitTransferred
  )
    return;

  state.pendingLiveKitTransfer = false;
  state.liveKitTransferred = true;
  state.status = "waiting";
  state.livekitRoom = undefined;

  sendCommand(callControlId, "actions/transfer", { to: cfg.liveKitSipUri });
  scheduleEscalation(callControlId);

  // Notify admins: call is now waiting in the queue
  sendCallNotification(state.from).catch(() => {});

  // Wait for dispatched LiveKit room then track it
  const controller = new AbortController();
  storeHoldRoom(callControlId, controller);

  waitForDispatchedLiveKitRoom(state.from, controller.signal)
    .then(async (roomName) => {
      const st = getCall(callControlId);
      if (!st || !roomName) return;
      st.livekitRoom = roomName;
      removeHoldRoom(callControlId);
      console.log(`[menu] LiveKit room resolved: ${roomName} for call ${callControlId}`);
      // Start looping hold music in the room
      const ingressId = await startHoldMusic(roomName);
      if (ingressId) st.holdMusicIngressId = ingressId;
    })
    .catch(() => {
      removeHoldRoom(callControlId);
    });
}


// telephony/src/lib/menuFlow.ts
// Converted from menu_flow.go

import { sendCommand, say } from "./telnyxClient";
import { getConfig } from "./config";
import { getCall } from "./state";
import { startVoicemail } from "./voicemail";
import { scheduleEscalation } from "./escalation";
import { HoldRoomSystem, holdRooms } from "./holdRoomSystem";
import { waitForDispatchedLiveKitRoom, liveKitRoomName, sipUserPart } from "./livekitRoom";
import { onAgentSpeakEnded } from "./virtualAgent";
import type { CallPayload } from "../types/telnyx";

export function playMainMenu(callControlID: string): void {
  const cfg = getConfig();
  sendCommand(callControlID, "actions/gather_using_speak", {
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

export function handleGatherEnded(p: CallPayload): void {
  const cfg = getConfig();
  const state = getCall(p.call_control_id);
  if (!state) {
    console.warn("[menu] Gather ended for unknown call", { call_id: p.call_control_id });
    return;
  }

  const digits = p.digits ?? "";
  console.log("[menu] Caller pressed digit", { digit: digits, call_id: p.call_control_id });

  switch (digits) {
    case "1":
      if (!cfg.liveKitSIPURI) {
        console.warn("[menu] LIVEKIT_SIP_URI not configured — falling back to voicemail");
        startVoicemail(p.call_control_id);
        return;
      }
      state.pendingLiveKitTransfer = true;
      say(p.call_control_id, cfg.ivrTransferText);
      break;

    case "0":
      startVoicemail(p.call_control_id);
      break;

    default:
      state.menuRetries = (state.menuRetries ?? 0) + 1;
      if ((state.menuRetries ?? 0) >= 2) {
        console.log("[menu] Max retries — routing to voicemail", { call_id: p.call_control_id });
        startVoicemail(p.call_control_id);
        return;
      }
      playMainMenu(p.call_control_id);
  }
}

export function handleSpeakEnded(p: CallPayload): void {
  const cfg = getConfig();
  const state = getCall(p.call_control_id);
  if (!state) return;

  // Generic transfer after speak
  if (state.pendingTransferTo?.trim()) {
    const to = state.pendingTransferTo;
    state.pendingTransferTo = "";
    console.log("[menu] Transferring after speak", { call_id: p.call_control_id, to });
    sendCommand(p.call_control_id, "actions/transfer", { to });
    return;
  }

  // Voice agent: flush buffered utterances
  if (cfg.enableVoiceAgent) {
    onAgentSpeakEnded(p.call_control_id);
  }

  if (
    state.inVoicemail ||
    !cfg.liveKitSIPURI ||
    !state.pendingLiveKitTransfer ||
    state.liveKitTransferred
  ) {
    return;
  }

  state.pendingLiveKitTransfer = false;
  state.liveKitTransferred = true;
  state.status = "waiting";
  state.livekit_room = "";

  const sipTo = cfg.liveKitSIPURI.trim();
  if (!sipTo) {
    console.warn("[menu] LIVEKIT_SIP_URI not configured — falling back to voicemail");
    startVoicemail(p.call_control_id);
    return;
  }

  console.log("[menu] Transferring to LiveKit SIP", { sip: sipTo });
  sendCommand(p.call_control_id, "actions/transfer", { to: sipTo });

  scheduleEscalation(p.call_control_id);

  // Start hold room monitoring once caller is in LiveKit
  const callControlID = p.call_control_id;
  const callerFrom = state.from;

  void (async () => {
    const st = getCall(callControlID);
    if (!st) return;

    try {
      const ac = new AbortController();
      const roomName = await waitForDispatchedLiveKitRoom(
        ac.signal,
        callerFrom,
        sipUserPart(cfg.liveKitSIPURI)
      );

      const s2 = getCall(callControlID);
      if (!s2) return;
      s2.livekit_room = roomName;

      if (holdRooms.has(callControlID)) return;

      const bridge = new HoldRoomSystem(roomName, callControlID);
      holdRooms.set(callControlID, bridge);
      bridge.start();
    } catch (err) {
      console.error("[menu] LiveKit SIP room not found", { call_id: callControlID, err });
    }
  })();
}

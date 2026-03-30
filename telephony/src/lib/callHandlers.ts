// telephony/src/lib/callHandlers.ts
// Converted from telnyx_call_handlers.go

import { sendCommand } from "./telnyxClient";
import { getConfig, isBusinessHours } from "./config";
import {
  getCall,
  storeCall,
  removeCall,
  getOutboundLeg,
  storeOutboundLeg,
  removeOutboundLeg,
  getInboundBySession,
  type OutboundLegKind,
} from "./state";
import { holdRooms } from "./holdRoomSystem";
import { playMainMenu, handleGatherEnded, handleSpeakEnded } from "./menuFlow";
import { handleRecordingSaved, playAfterHoursAndVoicemail, startVoicemail } from "./voicemail";
import { startVirtualAgent, handleDTMFReceived, handleTranscription } from "./virtualAgent";
import type { CallPayload } from "../types/telnyx";
import { sendPushNotification } from "./pushNotifications";

export function handleCallInitiated(p: CallPayload): void {
  if (p.direction === "outgoing") {
    handleOutboundInitiated(p);
    return;
  }
  if (p.to?.startsWith("sip:")) {
    storeOutboundLeg({
      callControlID: p.call_control_id,
      callSessionID: p.call_session_id,
      to: p.to,
      kind: "livekit" as OutboundLegKind,
      parentCallID: "",
    });
    console.log("[call] Ignoring LiveKit SIP transfer leg", { call_id: p.call_control_id, to: p.to });
    return;
  }

  console.log("[call] Call initiated", { from: p.from, to: p.to });
  sendCommand(p.call_control_id, "actions/answer", {});

  // Push notification: incoming call
  void sendPushNotification({
    title: "Incoming Call",
    body: `Call from ${p.from}`,
    tag: `call-${p.call_control_id}`,
    data: { call_control_id: p.call_control_id, from: p.from },
  });
}

export function handleCallAnswered(p: CallPayload): void {
  const cfg = getConfig();
  const leg = getOutboundLeg(p.call_control_id);

  if (leg) {
    if (leg.kind === "livekit") return;
    if (leg.kind === "escalation") { handleOutboundAnswered(p); return; }
  }

  if (p.direction === "outgoing") { handleOutboundAnswered(p); return; }
  if (p.to?.startsWith("sip:")) {
    console.log("[call] Ignoring SIP leg answered", { call_id: p.call_control_id, to: p.to });
    return;
  }

  console.log("[call] Call answered", { from: p.from });

  const state = {
    call_control_id: p.call_control_id,
    call_session_id: p.call_session_id,
    from: p.from,
    status: "in_menu",
    started_at: new Date().toISOString(),
  };
  storeCall(state);

  if (!isBusinessHours()) {
    console.log("[call] After hours — voicemail", { call_id: p.call_control_id });
    playAfterHoursAndVoicemail(p.call_control_id);
    return;
  }

  if (cfg.enableVoiceAgent) {
    startVirtualAgent(p.call_control_id);
    return;
  }
  playMainMenu(p.call_control_id);
}

function handleOutboundInitiated(p: CallPayload): void {
  const cfg = getConfig();
  if (p.to?.startsWith("sip:")) {
    console.log("[call] Ignoring outbound SIP leg", { call_id: p.call_control_id, to: p.to });
    return;
  }

  const parentID = getInboundBySession(p.call_session_id);
  if (!parentID) {
    console.log("[call] Outbound has no tracked inbound session", { call_id: p.call_control_id });
    return;
  }

  let kind: OutboundLegKind = "unknown";
  if (p.to?.trim() === cfg.humanEscalationNumber.trim()) kind = "escalation";

  storeOutboundLeg({
    callControlID: p.call_control_id,
    callSessionID: p.call_session_id,
    to: p.to,
    kind,
    parentCallID: parentID,
  });

  if (kind === "escalation") {
    const st = getCall(parentID);
    if (st) st.escalationLegID = p.call_control_id;
  }
}

function handleOutboundAnswered(p: CallPayload): void {
  const leg = getOutboundLeg(p.call_control_id);
  if (!leg || leg.kind !== "escalation") return;

  const st = getCall(leg.parentCallID);
  if (!st) return;

  console.log("[call] Escalation phone answered", { parent: leg.parentCallID, leg: p.call_control_id });
  st.escalationAnswered = true;
  st.escalationInProgress = false;
  st.status = "answered";

  const sys = holdRooms.get(leg.parentCallID);
  if (sys) { sys.close(); holdRooms.delete(leg.parentCallID); }
}

export function handleCallBridged(p: CallPayload): void {
  const st = getCall(p.call_control_id);
  if (st) {
    console.log("[call] Call bridged", { call_id: p.call_control_id, status: st.status });
    if (st.escalationInProgress && !st.escalationAnswered) {
      st.escalationAnswered = true;
      st.escalationInProgress = false;
      st.status = "answered";
    }
  }
}

export function handleCallHangup(p: CallPayload): void {
  console.log("[call] Call ended", { call_id: p.call_control_id, cause: p.hangup_cause });

  const leg = getOutboundLeg(p.call_control_id);
  if (leg) {
    if (leg.kind === "escalation") {
      const st = getCall(leg.parentCallID);
      if (st && st.escalationInProgress && !st.escalationAnswered && !st.inVoicemail) {
        console.log("[call] Escalation leg ended — routing parent to voicemail", { parent: leg.parentCallID });
        st.escalationInProgress = false;
        startVoicemail(leg.parentCallID);
      }
    }
    removeOutboundLeg(p.call_control_id);
    return;
  }

  removeCall(p.call_control_id);

  const sys = holdRooms.get(p.call_control_id);
  if (sys) {
    console.log("[call] Cleaning up hold room for dropped call", { call_id: p.call_control_id });
    sys.close();
    holdRooms.delete(p.call_control_id);
  }
}

// Re-export handlers used by the webhook route
export { handleGatherEnded, handleSpeakEnded, handleRecordingSaved, handleDTMFReceived, handleTranscription };

// src/app/api/webhook/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import type { CallPayload, TelnyxWebhook } from "@/lib/telnyx";
import { sendCommand, say } from "@/lib/telnyx";
import {
  storeCall,
  getCall,
  removeCall,
  storeOutboundLeg,
  getOutboundLeg,
  removeOutboundLeg,
  getInboundBySession,
  getHoldRoom,
  removeHoldRoom,
  CallState,
} from "@/lib/state";
import { getConfig, isBusinessHours } from "@/lib/config";
import { playMainMenu, handleGatherEnded, handleSpeakEnded } from "@/lib/menu";
import {
  startVoicemail,
  playAfterHoursAndVoicemail,
  handleRecordingSaved,
} from "@/lib/voicemail";
import { startVirtualAgent, handleTranscription, onAgentSpeakEnded } from "@/lib/agent";
import { scheduleEscalation } from "@/lib/escalation";
import { stopHoldMusic } from "@/lib/livekit";
import { log } from "@/lib/log";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: string;
  try {
    body = await req.text();
  } catch {
    return new NextResponse("bad request", { status: 400 });
  }

  let webhook: TelnyxWebhook;
  try {
    webhook = JSON.parse(body) as TelnyxWebhook;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const payload = webhook.data?.payload as CallPayload;
  if (!payload?.call_control_id) return NextResponse.json({ ok: true });

  log.info("webhook event", {
    event: webhook.data.event_type,
    call_id: payload.call_control_id,
    from: payload.from,
  });

  // Handle async so we respond fast
  handleWebhookEvent(webhook.data.event_type, payload).catch((err) => {
    log.error("webhook handler error", { event: webhook.data.event_type, call_id: payload.call_control_id, error: String(err) });
  });

  return NextResponse.json({ ok: true });
}

async function handleWebhookEvent(eventType: string, p: CallPayload): Promise<void> {
  switch (eventType) {
    case "call.initiated":
      handleCallInitiated(p);
      break;
    case "call.answered":
      await handleCallAnswered(p);
      break;
    case "call.gather.ended":
      handleGatherEnded(p.call_control_id, p.digits || "");
      break;
    case "call.dtmf.received":
      handleDTMFReceived(p);
      break;
    case "call.transcription": {
      const td = p.transcription_data;
      if (td) handleTranscription(p.call_control_id, td.transcript, td.is_final);
      break;
    }
    case "call.speak.ended":
      handleSpeakEndedWrapper(p);
      break;
    case "call.recording.saved":
      await handleRecordingSaved(p.call_control_id, p.recording_url || "", p.from);
      break;
    case "call.hangup":
      handleCallHangup(p);
      break;
    case "call.bridged":
      handleCallBridged(p);
      break;
    case "call.speak.started":
      // no-op — informational event, no action needed
      break;
    default:
      log.warn("webhook unhandled event", { event: eventType, call_id: p.call_control_id });
  }
}

function handleCallInitiated(p: CallPayload): void {
  if (p.direction === "outgoing") {
    handleOutboundInitiated(p);
    return;
  }
  if (p.to?.startsWith("sip:")) {
    storeOutboundLeg({
      callControlId: p.call_control_id,
      callSessionId: p.call_session_id,
      to: p.to,
      kind: "livekit",
      parentCallId: "",
    });
    return;
  }
  sendCommand(p.call_control_id, "actions/answer", {});
}

async function handleCallAnswered(p: CallPayload): Promise<void> {
  const leg = getOutboundLeg(p.call_control_id);
  if (leg) {
    if (leg.kind === "livekit") return;
    if (leg.kind === "escalation") {
      handleOutboundAnswered(p);
      return;
    }
  }
  if (p.direction === "outgoing") {
    handleOutboundAnswered(p);
    return;
  }
  if (p.to?.startsWith("sip:")) return;

  const cfg = getConfig();
  const state: CallState = {
    callControlId: p.call_control_id,
    callSessionId: p.call_session_id,
    from: p.from,
    status: "in_menu",
    startedAt: new Date(),
    escalationScheduled: false,
    escalationInProgress: false,
    escalationAnswered: false,
    menuRetries: 0,
    inVoicemail: false,
    pendingLiveKitTransfer: false,
    liveKitTransferred: false,
  };
  storeCall(state);

  if (!isBusinessHours()) {
    playAfterHoursAndVoicemail(p.call_control_id);
    return;
  }

  if (cfg.enableVoiceAgent) {
    await Promise.resolve(startVirtualAgent(p.call_control_id));
  } else {
    playMainMenu(p.call_control_id);
  }
}

function handleOutboundInitiated(p: CallPayload): void {
  if (p.to?.startsWith("sip:")) return;
  const parentId = getInboundBySession(p.call_session_id);
  if (!parentId) return;

  const cfg = getConfig();
  const kind =
    p.to?.trim() === cfg.humanEscalationNumber?.trim() ? "escalation" : "unknown";
  storeOutboundLeg({
    callControlId: p.call_control_id,
    callSessionId: p.call_session_id,
    to: p.to,
    kind,
    parentCallId: parentId,
  });

  if (kind === "escalation") {
    const st = getCall(parentId);
    if (st) st.escalationLegId = p.call_control_id;
  }
}

function handleOutboundAnswered(p: CallPayload): void {
  const leg = getOutboundLeg(p.call_control_id);
  if (!leg || leg.kind !== "escalation") return;
  const st = getCall(leg.parentCallId);
  if (!st) return;
  st.escalationAnswered = true;
  st.escalationInProgress = false;
  st.status = "answered";
  const holdCtrl = getHoldRoom(leg.parentCallId);
  if (holdCtrl) {
    holdCtrl.abort();
    removeHoldRoom(leg.parentCallId);
  }
}

function handleCallBridged(p: CallPayload): void {
  const st = getCall(p.call_control_id);
  if (st?.escalationInProgress && !st.escalationAnswered) {
    st.escalationAnswered = true;
    st.escalationInProgress = false;
    st.status = "answered";
  }
}

function handleCallHangup(p: CallPayload): void {
  const leg = getOutboundLeg(p.call_control_id);
  if (leg) {
    if (leg.kind === "escalation") {
      const st = getCall(leg.parentCallId);
      if (st?.escalationInProgress && !st.escalationAnswered && !st.inVoicemail) {
        st.escalationInProgress = false;
        startVoicemail(leg.parentCallId);
      }
    }
    removeOutboundLeg(p.call_control_id);
    return;
  }
  const st = getCall(p.call_control_id);
  if (st?.holdMusicIngressId) {
    stopHoldMusic(st.holdMusicIngressId).catch(() => {});
  }
  removeCall(p.call_control_id);
  const holdCtrl = getHoldRoom(p.call_control_id);
  if (holdCtrl) {
    holdCtrl.abort();
    removeHoldRoom(p.call_control_id);
  }
}

function handleDTMFReceived(p: CallPayload): void {
  const cfg = getConfig();
  if (!cfg.enableVoiceAgent) return;
  const digit = p.digit || p.digits || "";
  if (digit === "1" && cfg.liveKitSipUri) {
    const st = getCall(p.call_control_id);
    if (!st) return;
    st.pendingLiveKitTransfer = true;
    say(p.call_control_id, cfg.ivrTransferText);
  } else if (digit === "0") {
    startVoicemail(p.call_control_id);
  }
}

function handleSpeakEndedWrapper(p: CallPayload): void {
  const cfg = getConfig();
  // Always call onAgentSpeakEnded if voice agent is enabled (flushes pending utterances)
  if (cfg.enableVoiceAgent) {
    onAgentSpeakEnded(p.call_control_id);
  }
  // Always run menu speak-ended logic (handles pendingTransferTo and LiveKit transfer)
  handleSpeakEnded(p.call_control_id);
}

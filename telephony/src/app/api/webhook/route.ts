// telephony/src/app/api/webhook/route.ts
// Converted from telnyx_webhook_handler.go

import { NextRequest, NextResponse } from "next/server";
import type { TelnyxWebhook } from "@/types/telnyx";
import {
  handleCallInitiated,
  handleCallAnswered,
  handleCallBridged,
  handleCallHangup,
  handleGatherEnded,
  handleSpeakEnded,
  handleRecordingSaved,
  handleDTMFReceived,
  handleTranscription,
} from "@/lib/callHandlers";

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Telnyx requires a 200 OK fast — we'll process asynchronously
  let webhook: TelnyxWebhook;
  try {
    webhook = (await req.json()) as TelnyxWebhook;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const { event_type, payload } = webhook.data;
  if (!payload?.call_control_id) {
    return NextResponse.json({ ok: true });
  }

  console.log("[webhook]", {
    event: event_type,
    call_id: payload.call_control_id,
    session_id: payload.call_session_id,
    direction: payload.direction,
    from: payload.from,
    to: payload.to,
  });

  // Process asynchronously so Telnyx gets 200 immediately
  setImmediate(() => {
    try {
      switch (event_type) {
        case "call.initiated":
          handleCallInitiated(payload);
          break;
        case "call.answered":
          handleCallAnswered(payload);
          break;
        case "call.gather.ended":
          handleGatherEnded(payload);
          break;
        case "call.dtmf.received":
          handleDTMFReceived(payload);
          break;
        case "call.transcription":
          handleTranscription(payload);
          break;
        case "call.speak.ended":
          handleSpeakEnded(payload);
          break;
        case "call.recording.saved":
          void handleRecordingSaved(payload);
          break;
        case "call.hangup":
          handleCallHangup(payload);
          break;
        case "call.bridged":
          handleCallBridged(payload);
          break;
        default:
          console.log("[webhook] Unhandled event", { event: event_type });
      }
    } catch (err) {
      console.error("[webhook] Handler error", { event: event_type, err });
    }
  });

  return NextResponse.json({ ok: true });
}

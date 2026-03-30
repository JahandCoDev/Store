// src/lib/telnyx.ts
import { getConfig } from "./config";
import { log } from "./log";

export interface TelnyxWebhook {
  data: {
    event_type: string;
    payload: unknown;
  };
}

export interface CallPayload {
  call_control_id: string;
  call_session_id: string;
  direction: string;
  from: string;
  to: string;
  digits?: string;
  digit?: string;
  recording_url?: string;
  hangup_cause?: string;
  transcription_data?: {
    confidence: number;
    is_final: boolean;
    transcript: string;
  };
}

export async function sendCommand(
  callControlId: string,
  action: string,
  payload: Record<string, unknown> = {}
): Promise<void> {
  const cfg = getConfig();
  const url = `https://api.telnyx.com/v2/calls/${callControlId}/${action}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${cfg.telnyxApiKey}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.text();
      log.error("telnyx command failed", { action, call_id: callControlId, http_status: res.status, body });
    } else {
      log.info("telnyx command sent", { action, call_id: callControlId });
    }
  } catch (err) {
    log.error("telnyx fetch error", { action, call_id: callControlId, error: String(err) });
  }
}

export async function say(callControlId: string, text: string): Promise<void> {
  const cfg = getConfig();
  await sendCommand(callControlId, "actions/speak", {
    language: "en-US",
    voice: cfg.telnyxVoice,
    payload: text,
  });
}

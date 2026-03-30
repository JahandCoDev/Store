// src/lib/telnyx.ts
import { getConfig } from "./config";

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
      console.error(`[telnyx] ${action} error ${res.status}: ${body}`);
    } else {
      console.log(`[telnyx] command sent: ${action} call_id=${callControlId}`);
    }
  } catch (err) {
    console.error(`[telnyx] ${action} fetch failed:`, err);
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

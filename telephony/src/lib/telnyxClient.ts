// telephony/src/lib/telnyxClient.ts
// Converted from telnyx_client.go

import { getConfig } from "./config";

export function say(callControlID: string, text: string): void {
  const cfg = getConfig();
  sendCommand(callControlID, "actions/speak", {
    language: "en-US",
    voice: cfg.telnyxVoice,
    payload: text,
  });
}

export function sendCommand(
  callControlID: string,
  action: string,
  payload: Record<string, unknown> = {}
): void {
  const cfg = getConfig();
  const url = `https://api.telnyx.com/v2/calls/${callControlID}/${action}`;

  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${cfg.telnyxAPIKey}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  })
    .then(async (resp) => {
      if (!resp.ok) {
        const body = await resp.text().catch(() => "");
        console.error("[telnyx] API error", { action, status: resp.status, body });
      } else {
        console.log("[telnyx] command sent", { action, callControlID });
      }
    })
    .catch((err) => {
      console.error("[telnyx] request failed", { action, err });
    });
}

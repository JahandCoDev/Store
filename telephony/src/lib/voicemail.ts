// telephony/src/lib/voicemail.ts
// Converted from voicemail.go

import { sendCommand } from "./telnyxClient";
import { getCall } from "./state";
import { sendVoicemailEmail } from "./email";
import { getConfig } from "./config";
import type { CallPayload } from "../types/telnyx";

export function playAfterHoursAndVoicemail(callControlID: string): void {
  const cfg = getConfig();
  const st = getCall(callControlID);
  if (st) st.inVoicemail = true;

  sendCommand(callControlID, "actions/speak", {
    language: "en-US",
    voice: cfg.telnyxVoice,
    payload: cfg.ivrAfterHoursText,
  });
  startVoicemailRecording(callControlID);
}

export function startVoicemail(callControlID: string): void {
  const cfg = getConfig();
  const st = getCall(callControlID);
  if (st) st.inVoicemail = true;

  sendCommand(callControlID, "actions/speak", {
    language: "en-US",
    voice: cfg.telnyxVoice,
    payload: cfg.ivrVoicemailText,
  });
  startVoicemailRecording(callControlID);
}

export function startVoicemailRecording(callControlID: string): void {
  sendCommand(callControlID, "actions/record_start", {
    format: "mp3",
    channels: "single",
    play_beep: true,
    time_limit_secs: 120,
    silence_secs: 5,
    terminating_digit: "#",
  });
}

export async function handleRecordingSaved(p: CallPayload): Promise<void> {
  const cfg = getConfig();
  console.log("[voicemail] Recording saved", { url: p.recording_url, from: p.from });

  const state = getCall(p.call_control_id);
  const callerNum = state?.from ?? p.from;

  if (!cfg.voicemailTo) {
    console.warn("[voicemail] VOICEMAIL_EMAIL not set — skipping email");
    return;
  }

  try {
    await sendVoicemailEmail(cfg.voicemailTo, callerNum, p.recording_url ?? "", new Date());
    console.log("[voicemail] Email sent", { to: cfg.voicemailTo });
  } catch (err) {
    console.error("[voicemail] Failed to send email", err);
  }
}

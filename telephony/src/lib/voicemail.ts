// src/lib/voicemail.ts
import { getConfig } from "./config";
import { sendCommand, say } from "./telnyx";
import { getCall } from "./state";
import { sendVoicemailEmail } from "./email";

export function startVoicemail(callControlId: string): void {
  const state = getCall(callControlId);
  if (state) state.inVoicemail = true;
  const cfg = getConfig();
  say(callControlId, cfg.ivrVoicemailText);
  startVoicemailRecording(callControlId);
}

export function startVoicemailRecording(callControlId: string): void {
  sendCommand(callControlId, "actions/record_start", {
    format: "mp3",
    channels: "single",
    play_beep: true,
    time_limit_secs: 120,
    silence_secs: 5,
    terminating_digit: "#",
  });
}

export function playAfterHoursAndVoicemail(callControlId: string): void {
  const state = getCall(callControlId);
  if (state) state.inVoicemail = true;
  const cfg = getConfig();
  sendCommand(callControlId, "actions/speak", {
    language: "en-US",
    voice: cfg.telnyxVoice,
    payload: cfg.ivrAfterHoursText,
  });
  startVoicemailRecording(callControlId);
}

export async function handleRecordingSaved(
  callControlId: string,
  recordingUrl: string,
  from: string
): Promise<void> {
  const cfg = getConfig();
  if (!cfg.voicemailTo) {
    console.warn("[voicemail] VOICEMAIL_EMAIL not set");
    return;
  }
  try {
    await sendVoicemailEmail(cfg.voicemailTo, from, recordingUrl, new Date());
    console.log("[voicemail] email sent");
  } catch (err) {
    console.error("[voicemail] failed to send email:", err);
  }
}

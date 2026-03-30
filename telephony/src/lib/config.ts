// telephony/src/lib/config.ts
// Converted from config.go

export interface Config {
  // Server
  port: string;

  // Telnyx
  telnyxAPIKey: string;
  telnyxPublicKey: string;

  // LiveKit
  liveKitAPIKey: string;
  liveKitAPISecret: string;
  liveKitURL: string;
  liveKitSIPURI: string;
  liveKitRoomPrefix: string;

  // Google AI (Gemini)
  googleAPIKey: string;
  googleGenAIModel: string;

  // Human Escalation
  humanEscalationNumber: string;
  escalationWaitSecs: number;
  escalationRingSecs: number;

  // Business Hours
  businessOpen: string;
  businessClose: string;
  businessTZ: string;
  businessDays: number[]; // 0=Sun, 1=Mon, ...6=Sat

  // Voicemail Email
  voicemailTo: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  smtpFromName: string;
  smtpFromAddr: string;

  // IVR copy
  telnyxVoice: string;
  ivrMainMenuText: string;
  ivrAfterHoursText: string;
  ivrVoicemailText: string;
  ivrTransferText: string;

  // Voice Agent
  enableVoiceAgent: boolean;
  ivrAgentGreetingText: string;
}

function getEnv(key: string, defaultVal = ""): string {
  return process.env[key]?.trim() || defaultVal;
}

function getEnvInt(key: string, defaultVal: number): number {
  const v = process.env[key]?.trim();
  if (!v) return defaultVal;
  const n = parseInt(v, 10);
  return isNaN(n) ? defaultVal : n;
}

function parseDays(s: string): number[] {
  const dayMap: Record<string, number> = {
    sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
  };
  const result: number[] = [];
  for (const part of s.split(",")) {
    const key = part.trim().toLowerCase();
    if (key in dayMap) result.push(dayMap[key]);
  }
  return result.length ? result : [1, 2, 3, 4, 5]; // Mon–Fri
}

let _cfg: Config | null = null;

export function getConfig(): Config {
  if (_cfg) return _cfg;

  // Human escalation number
  let humanEsc = "";
  if ("HUMAN_ESCALATION_NUMBER" in process.env) {
    const v = process.env.HUMAN_ESCALATION_NUMBER!.trim();
    if (!["", "none", "disabled", "null"].includes(v.toLowerCase())) {
      humanEsc = v;
    }
  } else {
    humanEsc = "+14073082412";
  }

  _cfg = {
    port: getEnv("PORT", "3000"),
    telnyxAPIKey: getEnv("TELNYX_API_KEY"),
    telnyxPublicKey: getEnv("TELNYX_PUBLIC_KEY"),
    humanEscalationNumber: humanEsc,
    escalationWaitSecs: getEnvInt("ESCALATION_WAIT_SECS", 90),
    escalationRingSecs: getEnvInt("ESCALATION_RING_SECS", 25),
    businessOpen: getEnv("BUSINESS_HOURS_OPEN", "08:00"),
    businessClose: getEnv("BUSINESS_HOURS_CLOSE", "17:00"),
    businessTZ: getEnv("BUSINESS_HOURS_TZ", "America/New_York"),
    businessDays: parseDays(getEnv("BUSINESS_HOURS_DAYS", "Mon,Tue,Wed,Thu,Fri")),
    voicemailTo: getEnv("VOICEMAIL_EMAIL"),
    smtpHost: getEnv("SMTP_HOST", "smtp.gmail.com"),
    smtpPort: getEnv("SMTP_PORT", "587"),
    smtpUser: getEnv("SMTP_USER"),
    smtpPass: getEnv("SMTP_PASS"),
    smtpFromName: getEnv("SMTP_FROM_NAME", "Store Phone System"),
    smtpFromAddr: getEnv("SMTP_FROM_ADDR") || getEnv("SMTP_USER"),
    telnyxVoice: getEnv("TELNYX_VOICE", "male"),
    liveKitAPIKey: getEnv("LIVEKIT_API_KEY"),
    liveKitAPISecret: getEnv("LIVEKIT_API_SECRET"),
    liveKitURL: getEnv("LIVEKIT_URL"),
    liveKitSIPURI: getEnv("LIVEKIT_SIP_URI"),
    liveKitRoomPrefix: getEnv("LIVEKIT_ROOM_PREFIX", "voice-"),
    googleAPIKey: getEnv("GOOGLE_API_KEY"),
    googleGenAIModel: getEnv("GOOGLE_GENAI_MODEL", "gemini-2.0-flash"),
    ivrMainMenuText: getEnv(
      "IVR_MAIN_MENU_TEXT",
      "Thank you for calling the Store. Press 1 to speak with our support team. Press 0 to leave a voicemail."
    ),
    ivrAfterHoursText: getEnv(
      "IVR_AFTER_HOURS_TEXT",
      "Thank you for calling the Store. Our office is currently closed. Our hours are Monday through Friday, 8 AM to 5 PM Eastern Time. Please leave a message after the tone and we will get back to you the next business day."
    ),
    ivrVoicemailText: getEnv(
      "IVR_VOICEMAIL_TEXT",
      "Please leave your message after the tone. Press the pound key when finished."
    ),
    ivrTransferText: getEnv(
      "IVR_TRANSFER_TEXT",
      "Please hold while we connect you with our support team."
    ),
    enableVoiceAgent:
      getEnv("ENABLE_VOICE_AGENT", "true").toLowerCase() !== "false",
    ivrAgentGreetingText: getEnv(
      "IVR_AGENT_GREETING_TEXT",
      "Hi, thanks for calling Jah and Co. I'm the virtual support assistant. You can ask me a question, press 1 to reach support, or press 0 to leave a voicemail."
    ),
  };

  return _cfg;
}

function parseHHMM(s: string): [number, number] {
  const parts = s.split(":");
  if (parts.length !== 2) return [0, 0];
  return [parseInt(parts[0], 10) || 0, parseInt(parts[1], 10) || 0];
}

export function isBusinessHours(): boolean {
  const cfg = getConfig();
  try {
    const now = new Date(
      new Date().toLocaleString("en-US", { timeZone: cfg.businessTZ })
    );
    const dow = now.getDay();
    if (!cfg.businessDays.includes(dow)) return false;

    const [openH, openM] = parseHHMM(cfg.businessOpen);
    const [closeH, closeM] = parseHHMM(cfg.businessClose);

    // Extended hours override
    if (openH === 0 && openM === 0 && (closeH >= 23 || closeH === 0)) {
      return true;
    }

    const nowMins = now.getHours() * 60 + now.getMinutes();
    const openMins = openH * 60 + openM;
    const closeMins = closeH * 60 + closeM;
    return nowMins >= openMins && nowMins < closeMins;
  } catch {
    return true; // default open on TZ error
  }
}

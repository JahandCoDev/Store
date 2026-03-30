// src/lib/config.ts
export interface AppConfig {
  port: string;
  telnyxApiKey: string;
  telnyxPublicKey: string;
  liveKitApiKey: string;
  liveKitApiSecret: string;
  liveKitUrl: string;
  liveKitSipUri: string;
  liveKitRoomPrefix: string;
  googleApiKey: string;
  humanEscalationNumber: string;
  escalationWaitSecs: number;
  escalationRingSecs: number;
  businessOpen: string;
  businessClose: string;
  businessTz: string;
  businessDays: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  voicemailTo: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  smtpFromName: string;
  smtpFromAddr: string;
  telnyxVoice: string;
  ivrMainMenuText: string;
  ivrAfterHoursText: string;
  ivrVoicemailText: string;
  ivrTransferText: string;
  enableVoiceAgent: boolean;
  ivrAgentGreetingText: string;
  googleGenAiModel: string;
  vapidPublicKey: string;
  vapidPrivateKey: string;
  vapidSubject: string;
}

function getEnv(key: string, defaultVal = ""): string {
  return process.env[key] || defaultVal;
}
function getEnvInt(key: string, defaultVal: number): number {
  const v = process.env[key];
  if (!v) return defaultVal;
  const n = parseInt(v, 10);
  return isNaN(n) ? defaultVal : n;
}
function parseDays(s: string): number[] {
  const map: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
  return s
    .split(",")
    .map((d) => map[d.trim().toLowerCase()])
    .filter((d) => d !== undefined);
}

let _config: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (_config) return _config;

  let humanEsc = "";
  const raw = process.env.HUMAN_ESCALATION_NUMBER;
  if (raw !== undefined) {
    const v = raw.trim();
    if (!["", "none", "disabled", "null"].includes(v.toLowerCase())) {
      humanEsc = v;
    }
  } else {
    humanEsc = "";
  }

  _config = {
    port: getEnv("PORT", "8080"),
    telnyxApiKey: getEnv("TELNYX_API_KEY"),
    telnyxPublicKey: getEnv("TELNYX_PUBLIC_KEY"),
    liveKitApiKey: getEnv("LIVEKIT_API_KEY"),
    liveKitApiSecret: getEnv("LIVEKIT_API_SECRET"),
    liveKitUrl: getEnv("LIVEKIT_URL"),
    liveKitSipUri: getEnv("LIVEKIT_SIP_URI"),
    liveKitRoomPrefix: getEnv("LIVEKIT_ROOM_PREFIX", "voice-"),
    googleApiKey: getEnv("GOOGLE_API_KEY"),
    humanEscalationNumber: humanEsc,
    escalationWaitSecs: getEnvInt("ESCALATION_WAIT_SECS", 90),
    escalationRingSecs: getEnvInt("ESCALATION_RING_SECS", 25),
    businessOpen: getEnv("BUSINESS_HOURS_OPEN", "08:00"),
    businessClose: getEnv("BUSINESS_HOURS_CLOSE", "17:00"),
    businessTz: getEnv("BUSINESS_HOURS_TZ", "America/New_York"),
    businessDays: parseDays(getEnv("BUSINESS_HOURS_DAYS", "Mon,Tue,Wed,Thu,Fri")),
    voicemailTo: getEnv("VOICEMAIL_EMAIL"),
    smtpHost: getEnv("SMTP_HOST", "mail.jahdev.me"),
    smtpPort: getEnv("SMTP_PORT", "587"),
    smtpUser: getEnv("SMTP_USER"),
    smtpPass: getEnv("SMTP_PASS"),
    smtpFromName: getEnv("SMTP_FROM_NAME", "Jah and Co Phone"),
    smtpFromAddr: getEnv("SMTP_FROM_ADDR", getEnv("SMTP_USER")),
    telnyxVoice: getEnv("TELNYX_VOICE", "Telnyx.Qwen3TTS.8d06e22f-00e2-4ab2-a813-035d75080055"),
    ivrMainMenuText: getEnv(
      "IVR_MAIN_MENU_TEXT",
      "This is Jah and Co! Thank you for your call. Please press 1 to connect with us. Press 0 to leave a voicemail."
    ),
    ivrAfterHoursText: getEnv(
      "IVR_AFTER_HOURS_TEXT",
      "Thank you for calling Jah and Co. We are currently closed. Our hours are Monday through Friday, 8 AM to 5 PM Eastern Time. Please leave a message after the tone and we will get back to you the next business day."
    ),
    ivrVoicemailText: getEnv(
      "IVR_VOICEMAIL_TEXT",
      "Please leave your message after the tone and we will get back to you as soon as possible. Thank you!"
    ),
    ivrTransferText: getEnv(
      "IVR_TRANSFER_TEXT",
      "Please hold while we connect you with support."
    ),
    enableVoiceAgent: getEnv("ENABLE_VOICE_AGENT", "true").toLowerCase() !== "false",
    ivrAgentGreetingText: getEnv(
      "IVR_AGENT_GREETING_TEXT",
      "Hi, thanks for calling Jah and Co. I'm the virtual support assistant. You can ask me a question, press 1 to reach support, or press 0 to leave a voicemail."
    ),
    googleGenAiModel: getEnv("GOOGLE_GENAI_MODEL", "gemini-2.0-flash"),
    vapidPublicKey: getEnv("VAPID_PUBLIC_KEY"),
    vapidPrivateKey: getEnv("VAPID_PRIVATE_KEY"),
    vapidSubject: getEnv("VAPID_SUBJECT"),
  };
  return _config;
}

export function isBusinessHours(): boolean {
  const cfg = getConfig();
  const tz = cfg.businessTz;
  const now = new Date();
  const nowInTz = new Date(now.toLocaleString("en-US", { timeZone: tz }));
  const day = nowInTz.getDay();
  if (!cfg.businessDays.includes(day)) return false;
  const [openH, openM] = cfg.businessOpen.split(":").map(Number);
  const [closeH, closeM] = cfg.businessClose.split(":").map(Number);
  const nowMins = nowInTz.getHours() * 60 + nowInTz.getMinutes();
  const openMins = openH * 60 + openM;
  const closeMins = closeH * 60 + closeM;
  return nowMins >= openMins && nowMins < closeMins;
}

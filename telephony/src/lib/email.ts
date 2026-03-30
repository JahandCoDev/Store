// src/lib/email.ts
import nodemailer from "nodemailer";
import { getConfig } from "./config";

function formatCallerNumber(number: string): string {
  const digits = number.replace(/\D/g, "");
  const d = digits.length === 11 && digits[0] === "1" ? digits.slice(1) : digits;
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return number;
}

export async function sendVoicemailEmail(
  to: string,
  callerNumber: string,
  recordingUrl: string,
  receivedAt: Date
): Promise<void> {
  const cfg = getConfig();
  const formatted = formatCallerNumber(callerNumber);
  const dateStr = receivedAt.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone: "America/New_York",
  });

  const transport = nodemailer.createTransport({
    host: cfg.smtpHost,
    port: parseInt(cfg.smtpPort),
    auth: { user: cfg.smtpUser, pass: cfg.smtpPass },
  });

  await transport.sendMail({
    from: `"${cfg.smtpFromName}" <${cfg.smtpFromAddr}>`,
    to,
    subject: `New Voicemail from ${formatted}`,
    text: `You have received a new voicemail.\n\nCaller:     ${formatted}\nReceived:   ${dateStr}\n\nRecording:\n${recordingUrl}\n\n--\nJah and Co Phone System\nThis is an automated notification. Do not reply to this email.`,
  });
  console.log(`[email] voicemail sent to ${to}`);
}

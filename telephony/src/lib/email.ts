// telephony/src/lib/email.ts
// Converted from email.go

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
  recordingURL: string,
  receivedAt: Date
): Promise<void> {
  const cfg = getConfig();
  const formatted = receivedAt.toLocaleString("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });

  const subject = `New Voicemail from ${formatCallerNumber(callerNumber)}`;
  const body = `You have received a new voicemail.

Caller:     ${formatCallerNumber(callerNumber)}
Received:   ${formatted}

Recording:
${recordingURL}

--
Jah and Co Phone System
This is an automated notification. Do not reply to this email.
`;

  const transporter = nodemailer.createTransport({
    host: cfg.smtpHost,
    port: parseInt(cfg.smtpPort, 10),
    secure: cfg.smtpPort === "465",
    auth: { user: cfg.smtpUser, pass: cfg.smtpPass },
  });

  await transporter.sendMail({
    from: `"${cfg.smtpFromName}" <${cfg.smtpFromAddr}>`,
    to,
    subject,
    text: body,
  });

  console.log("[email] Voicemail email sent", { to });
}

import nodemailer from "nodemailer";

import { buildManualEmailHtml, buildManualEmailText, type ManualEmailTemplateOptions } from "@/lib/email/manualEmailTemplate";

type MailTransportConfig = {
  host: string;
  port: number;
  secure: boolean;
  auth?: {
    user: string;
    pass: string;
  };
  from: string;
};

function isEmailLike(value: string | undefined) {
  return Boolean(value && /.+@.+\..+/.test(value));
}

function getTransportConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const portValue = process.env.SMTP_PORT?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from =
    process.env.STOREFRONT_FROM_EMAIL?.trim() ||
    process.env.QUOTE_FROM_EMAIL?.trim() ||
    (isEmailLike(user) ? user : undefined);

  const missing: string[] = [];
  if (!host) missing.push("SMTP_HOST");
  if (!portValue) missing.push("SMTP_PORT");
  if (!from) missing.push("STOREFRONT_FROM_EMAIL or QUOTE_FROM_EMAIL or SMTP_USER");

  if (missing.length > 0) {
    return { error: `SMTP not configured: missing ${missing.join(", ")}` } as const;
  }

  const port = Number(portValue);
  if (!Number.isFinite(port)) {
    return { error: "SMTP not configured: SMTP_PORT is not a valid number" } as const;
  }

  if (!host || !from) {
    return { error: "SMTP not configured: missing required mail values after validation" } as const;
  }

  return {
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
    from,
  } satisfies MailTransportConfig;
}

export async function sendStorefrontTemplateEmail(params: {
  to: string;
  subject: string;
  template: ManualEmailTemplateOptions;
  replyTo?: string;
}) {
  const config = getTransportConfig();
  if ("error" in config) {
    return { ok: false as const, error: config.error };
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });

  try {
    await transporter.sendMail({
      from: config.from,
      to: params.to,
      replyTo: params.replyTo,
      subject: params.subject,
      text: buildManualEmailText({ title: params.template.title, intro: params.template.intro, footerNote: params.template.footerNote }),
      html: buildManualEmailHtml(params.template),
    });

    return { ok: true as const, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email error";
    return { ok: false as const, error: message };
  }
}

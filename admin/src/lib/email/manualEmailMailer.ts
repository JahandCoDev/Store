import nodemailer from "nodemailer";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isEmailLike(value: string | undefined) {
  return Boolean(value && /.+@.+\..+/.test(value));
}

function stripHtml(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type ManualEmailInput = {
  to: string;
  subject: string;
  title: string;
  bodyHtml: string;
  templateId?: ManualEmailTemplateId;
  previewText?: string;
  badge?: string;
  intro?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
  signatureName?: string;
  signatureTitle?: string;
  replyTo?: string;
};

export type ManualEmailTemplateId = "base" | "dev-store";

export type ManualEmailTemplateDefinition = {
  id: ManualEmailTemplateId;
  label: string;
  description: string;
};

const TEMPLATE_DEFINITIONS: Record<ManualEmailTemplateId, ManualEmailTemplateDefinition> = {
  base: {
    id: "base",
    label: "Base",
    description: "General-purpose branded email wrapper for non-dev messages.",
  },
  "dev-store": {
    id: "dev-store",
    label: "Dev Store",
    description: "The dark dev-store themed email wrapper used for JahandCo web/dev outreach.",
  },
};

export function getManualEmailTemplatesForShop(shopId: string): ManualEmailTemplateDefinition[] {
  if (shopId === "jahandco-dev") {
    return [TEMPLATE_DEFINITIONS.base, TEMPLATE_DEFINITIONS["dev-store"]];
  }

  return [TEMPLATE_DEFINITIONS.base];
}

export function isManualEmailTemplateAllowed(shopId: string, templateId: string | undefined): templateId is ManualEmailTemplateId {
  const normalized = templateId === "dev-store" ? "dev-store" : "base";
  return getManualEmailTemplatesForShop(shopId).some((template) => template.id === normalized);
}

function resolveTemplateId(shopId: string, templateId: string | undefined): ManualEmailTemplateId {
  const normalized = templateId === "dev-store" ? "dev-store" : "base";
  if (isManualEmailTemplateAllowed(shopId, normalized)) return normalized;
  return "base";
}

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

function getTransportConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const portValue = process.env.SMTP_PORT?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const configuredFrom = process.env.QUOTE_FROM_EMAIL?.trim();
  const from = configuredFrom || (isEmailLike(user) ? user : undefined);

  const missing: string[] = [];
  if (!host) missing.push("SMTP_HOST");
  if (!portValue) missing.push("SMTP_PORT");
  if (!from) missing.push("QUOTE_FROM_EMAIL or SMTP_USER");

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

export function buildManualEmailHtml({
  title,
  bodyHtml,
  templateId = "base",
  previewText,
  badge = "JahandCo",
  intro,
  ctaLabel,
  ctaUrl,
  footerNote = "Reply directly to this email if you want to continue the conversation.",
  signatureName = "JahandCo",
  signatureTitle = "JahandCo",
}: Omit<ManualEmailInput, "to" | "subject" | "replyTo">) {
  const safeTitle = escapeHtml(title);
  const safeBadge = escapeHtml(badge);
  const safeIntro = intro ? escapeHtml(intro) : null;
  const safeFooterNote = escapeHtml(footerNote);
  const safeSignatureName = escapeHtml(signatureName);
  const safeSignatureTitle = escapeHtml(signatureTitle);
  const safePreviewText = previewText ? escapeHtml(previewText) : safeTitle;
  const ctaBlock = ctaLabel && ctaUrl
    ? `
        <div style="margin-top:28px;">
          <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:14px 22px;border-radius:14px;background:linear-gradient(135deg, rgba(96,165,250,0.96), rgba(52,211,153,0.96) 55%, rgba(167,139,250,0.96));color:#ffffff;font-size:14px;font-weight:700;letter-spacing:0.02em;text-decoration:none;">${escapeHtml(ctaLabel)}</a>
        </div>
      `
    : "";

  if (templateId === "base") {
    return `
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${safePreviewText}</div>
      <div style="margin:0;padding:24px 12px;background:#f3f6fb;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#1f2937;">
        <div style="max-width:700px;margin:0 auto;border:1px solid rgba(15,23,42,0.08);border-radius:24px;overflow:hidden;background:#ffffff;box-shadow:0 24px 60px rgba(15,23,42,0.08);">
          <div style="padding:28px 32px 22px;border-bottom:1px solid rgba(15,23,42,0.08);background:linear-gradient(135deg,#eff6ff 0%,#ecfeff 60%,#f5f3ff 100%);">
            <div style="display:inline-block;padding:8px 14px;border-radius:999px;background:#e0f2fe;border:1px solid #bae6fd;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#0f172a;">${safeBadge}</div>
            <h1 style="margin:18px 0 12px;font-size:30px;line-height:1.15;color:#0f172a;">${safeTitle}</h1>
            ${safeIntro ? `<p style="margin:0;color:#475569;font-size:16px;line-height:1.7;">${safeIntro}</p>` : ""}
          </div>
          <div style="padding:28px 32px;">
            <div style="padding:24px;border-radius:20px;background:#f8fafc;border:1px solid rgba(148,163,184,0.2);color:#334155;font-size:15px;line-height:1.8;">
              ${bodyHtml}
              ${ctaBlock}
            </div>
            <div style="margin-top:24px;padding:18px 20px;border-radius:18px;background:#eef2ff;border:1px solid rgba(129,140,248,0.18);color:#475569;font-size:14px;line-height:1.7;">
              ${safeFooterNote}
            </div>
            <div style="margin-top:24px;color:#0f172a;font-size:14px;line-height:1.7;">
              <div style="font-weight:600;">${safeSignatureName}</div>
              <div style="color:#64748b;">${safeSignatureTitle}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${safePreviewText}</div>
    <div style="margin:0;padding:32px 16px;background:radial-gradient(circle at top left, rgba(52,211,153,0.18), transparent 24%),radial-gradient(circle at top right, rgba(59,130,246,0.22), transparent 28%),radial-gradient(circle at center, rgba(167,139,250,0.18), transparent 34%),linear-gradient(180deg,#050b16 0%,#0b1730 100%);font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#e5eefb;">
      <div style="max-width:700px;margin:0 auto;border:1px solid rgba(148,163,184,0.18);border-radius:28px;overflow:hidden;background:rgba(7,17,31,0.92);box-shadow:0 24px 80px rgba(0,0,0,0.35);">
        <div style="padding:32px 32px 24px;border-bottom:1px solid rgba(148,163,184,0.12);background:radial-gradient(circle at top left, rgba(34,197,94,0.18), transparent 36%),radial-gradient(circle at top right, rgba(59,130,246,0.2), transparent 40%),radial-gradient(circle at center, rgba(167,139,250,0.14), transparent 46%),rgba(7,17,31,0.9);">
          <div style="display:inline-block;padding:8px 14px;border-radius:999px;background:rgba(103,232,249,0.12);border:1px solid rgba(103,232,249,0.18);font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#dff8ff;">${safeBadge}</div>
          <h1 style="margin:18px 0 12px;font-size:32px;line-height:1.15;color:#f8fafc;">${safeTitle}</h1>
          ${safeIntro ? `<p style="margin:0;color:#cbd5e1;font-size:16px;line-height:1.7;">${safeIntro}</p>` : ""}
        </div>
        <div style="padding:28px 32px;">
          <div style="padding:24px 24px;border-radius:22px;background:linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.68));border:1px solid rgba(148,163,184,0.12);color:#dbe7f5;font-size:15px;line-height:1.8;">
            ${bodyHtml}
            ${ctaBlock}
          </div>
          <div style="margin-top:28px;padding:18px 20px;border-radius:18px;background:linear-gradient(180deg,rgba(34,197,94,0.12),rgba(59,130,246,0.1));border:1px solid rgba(148,163,184,0.12);color:#cbd5e1;font-size:14px;line-height:1.7;">
            ${safeFooterNote}
          </div>
          <div style="margin-top:24px;color:#e2e8f0;font-size:14px;line-height:1.7;">
            <div style="font-weight:600;">${safeSignatureName}</div>
            <div style="color:#94a3b8;">${safeSignatureTitle}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function buildManualEmailText({
  title,
  bodyHtml,
  intro,
  ctaLabel,
  ctaUrl,
  footerNote = "Reply directly to this email if you want to continue the conversation.",
  signatureName = "JahandCo",
  signatureTitle = "JahandCo",
}: Omit<ManualEmailInput, "to" | "subject" | "previewText" | "badge" | "replyTo">) {
  return [
    title,
    "",
    intro ?? "",
    "",
    stripHtml(bodyHtml),
    ctaLabel && ctaUrl ? `\n${ctaLabel}: ${ctaUrl}` : "",
    "",
    footerNote,
    "",
    signatureName,
    signatureTitle,
  ].filter(Boolean).join("\n");
}

export async function sendManualEmail(input: ManualEmailInput) {
  const config = getTransportConfig();
  if ("error" in config) {
    return { ok: false, error: config.error } as const;
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
      to: input.to,
      replyTo: input.replyTo,
      subject: input.subject,
      text: buildManualEmailText(input),
      html: buildManualEmailHtml(input),
    });

    return { ok: true } as const;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown email error",
    } as const;
  }
}

export function normalizeManualEmailTemplateId(shopId: string, templateId: string | undefined) {
  return resolveTemplateId(shopId, templateId);
}
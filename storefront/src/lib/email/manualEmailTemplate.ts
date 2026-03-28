function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export type ManualEmailTemplateOptions = {
  title: string;
  bodyHtml: string;
  previewText?: string;
  badge?: string;
  intro?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
  unsubscribeText?: string;
  unsubscribeUrl?: string;
  unsubscribeLabel?: string;
  signatureName?: string;
  signatureTitle?: string;
};

export function buildManualEmailHtml({
  title,
  bodyHtml,
  previewText,
  badge = "JahandCo",
  intro,
  ctaLabel,
  ctaUrl,
  footerNote = "Reply directly to this email if you want to continue the conversation.",
  unsubscribeText = "To unsubscribe from non-essential emails, reply with UNSUBSCRIBE.",
  unsubscribeUrl,
  unsubscribeLabel = "Unsubscribe",
  signatureName = "JahandCo",
  signatureTitle = "JahandCo",
}: ManualEmailTemplateOptions) {
  const safeTitle = escapeHtml(title);
  const safeBadge = escapeHtml(badge);
  const safeIntro = intro ? escapeHtml(intro) : null;
  const safeFooterNote = escapeHtml(footerNote);
  const safeUnsubscribeText = unsubscribeText ? escapeHtml(unsubscribeText) : null;
  const safeUnsubscribeLabel = escapeHtml(unsubscribeLabel);
  const safeUnsubscribeUrl = unsubscribeUrl ? escapeHtml(unsubscribeUrl) : null;
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
            ${safeUnsubscribeText || safeUnsubscribeUrl ? `
              <div style="margin-top:10px;color:#94a3b8;font-size:12px;line-height:1.7;">
                ${safeUnsubscribeText ? `<div>${safeUnsubscribeText}</div>` : ""}
                ${safeUnsubscribeUrl ? `<div style="margin-top:6px;"><a href="${safeUnsubscribeUrl}" style="color:#c7d2fe;text-decoration:underline;">${safeUnsubscribeLabel}</a></div>` : ""}
              </div>
            ` : ""}
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
  intro,
  footerNote = "Reply directly to this email if you want to continue the conversation.",
  unsubscribeText = "To unsubscribe from non-essential emails, reply with UNSUBSCRIBE.",
}: Pick<ManualEmailTemplateOptions, "title" | "intro" | "footerNote" | "unsubscribeText">) {
  return [title, "", intro ?? "", "", footerNote, unsubscribeText].filter(Boolean).join("\n");
}
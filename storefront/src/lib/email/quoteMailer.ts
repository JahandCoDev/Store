import { existsSync } from "fs";
import path from "path";

import nodemailer from "nodemailer";

import { formatQuoteAddOns } from "@/lib/dev/quoteSubmission";

type QuoteMailPayload = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  selectedPlan?: string | null;
  projectType: string;
  budgetRange: string;
  timeline: string;
  addOns: string[];
  details: string;
  createdAt: Date;
};

type QuoteMailBranding = {
  signatureImageSrc?: string;
  signatureImageCid?: string;
  signatureName: string;
  signatureTitle?: string;
};

type MailAttachment = {
  filename: string;
  path: string;
  cid: string;
};

type MailTransportConfig = {
  host: string;
  port: number;
  secure: boolean;
  auth?: {
    user: string;
    pass: string;
  };
  from: string;
  to: string;
};

function isEmailLike(value: string | undefined) {
  return Boolean(value && /.+@.+\..+/.test(value));
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function nl2br(value: string) {
  return escapeHtml(value).replace(/\n/g, "<br />");
}

function buildCustomerConfirmationHtml(payload: QuoteMailPayload, submittedAt: string) {
  const branding = getBrandingConfig();
  const name = escapeHtml(payload.name);
  const projectType = escapeHtml(payload.projectType);
  const budgetRange = escapeHtml(payload.budgetRange);
  const timeline = escapeHtml(payload.timeline);
  const selectedPlan = escapeHtml(payload.selectedPlan || "Not selected");
  const phone = escapeHtml(payload.phone || "Not provided");
  const details = nl2br(payload.details);
  const addOnsHtml = payload.addOns.length
    ? payload.addOns
        .map((item) => `<span style="display:inline-block;margin:0 8px 8px 0;padding:8px 12px;border-radius:999px;background:rgba(103,232,249,0.12);border:1px solid rgba(103,232,249,0.18);color:#dff8ff;font-size:13px;">${escapeHtml(item)}</span>`)
        .join("")
    : '<span style="color:#94a3b8;font-size:13px;">No add-ons selected</span>';
  const signatureBlock = branding.signatureImageSrc
    ? `
        <div style="margin-top:20px;">
          <img src="${escapeHtml(branding.signatureImageSrc)}" alt="${escapeHtml(branding.signatureName)} signature" style="display:block;max-width:220px;height:auto;" />
          <div style="margin-top:8px;color:#e2e8f0;font-size:14px;font-weight:600;">${escapeHtml(branding.signatureName)}</div>
          ${branding.signatureTitle ? `<div style="color:#94a3b8;font-size:13px;">${escapeHtml(branding.signatureTitle)}</div>` : ""}
        </div>
      `
    : `
        <div style="margin-top:20px;color:#e2e8f0;font-size:14px;line-height:1.7;">
          <div style="font-weight:600;">${escapeHtml(branding.signatureName)}</div>
          ${branding.signatureTitle ? `<div style="color:#94a3b8;">${escapeHtml(branding.signatureTitle)}</div>` : ""}
        </div>
      `;

  return `
    <div style="margin:0;padding:32px 16px;background:radial-gradient(circle at top left, rgba(52,211,153,0.18), transparent 24%),radial-gradient(circle at top right, rgba(59,130,246,0.22), transparent 28%),radial-gradient(circle at center, rgba(167,139,250,0.18), transparent 34%),linear-gradient(180deg,#050b16 0%,#0b1730 100%);font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#e5eefb;">
      <div style="max-width:680px;margin:0 auto;border:1px solid rgba(148,163,184,0.18);border-radius:28px;overflow:hidden;background:rgba(7,17,31,0.92);box-shadow:0 24px 80px rgba(0,0,0,0.35);">
        <div style="padding:32px 32px 24px;border-bottom:1px solid rgba(148,163,184,0.12);background:radial-gradient(circle at top left, rgba(34,197,94,0.18), transparent 36%),radial-gradient(circle at top right, rgba(59,130,246,0.2), transparent 40%),radial-gradient(circle at center, rgba(167,139,250,0.14), transparent 46%),rgba(7,17,31,0.9);">
          <div style="display:inline-block;padding:8px 14px;border-radius:999px;background:rgba(103,232,249,0.12);border:1px solid rgba(103,232,249,0.18);font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#dff8ff;">JahandCo Quote Request</div>
          <h1 style="margin:18px 0 12px;font-size:32px;line-height:1.15;color:#f8fafc;">Thanks, ${name}. Your project request is in.</h1>
          <p style="margin:0;color:#cbd5e1;font-size:16px;line-height:1.7;">I received your submission and will review it personally. You can reply directly to this email any time if you want to add links, examples, or extra notes before I follow up.</p>
        </div>

        <div style="padding:28px 32px;">
          <div style="margin-bottom:24px;padding:20px 22px;border-radius:20px;background:linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.68));border:1px solid rgba(148,163,184,0.12);">
            <div style="font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#8be9ff;margin-bottom:12px;">Submission Summary</div>
            <table role="presentation" width="100%" style="border-collapse:collapse;">
              <tr>
                <td style="padding:0 0 10px;color:#94a3b8;font-size:14px;">Submitted</td>
                <td style="padding:0 0 10px;color:#f8fafc;font-size:14px;text-align:right;">${escapeHtml(submittedAt)}</td>
              </tr>
              <tr>
                <td style="padding:0 0 10px;color:#94a3b8;font-size:14px;">Project type</td>
                <td style="padding:0 0 10px;color:#f8fafc;font-size:14px;text-align:right;">${projectType}</td>
              </tr>
              <tr>
                <td style="padding:0 0 10px;color:#94a3b8;font-size:14px;">Budget</td>
                <td style="padding:0 0 10px;color:#f8fafc;font-size:14px;text-align:right;">${budgetRange}</td>
              </tr>
              <tr>
                <td style="padding:0 0 10px;color:#94a3b8;font-size:14px;">Timeline</td>
                <td style="padding:0 0 10px;color:#f8fafc;font-size:14px;text-align:right;">${timeline}</td>
              </tr>
              <tr>
                <td style="padding:0 0 10px;color:#94a3b8;font-size:14px;">Selected plan</td>
                <td style="padding:0 0 10px;color:#f8fafc;font-size:14px;text-align:right;">${selectedPlan}</td>
              </tr>
              <tr>
                <td style="padding:0;color:#94a3b8;font-size:14px;">Phone</td>
                <td style="padding:0;color:#f8fafc;font-size:14px;text-align:right;">${phone}</td>
              </tr>
            </table>
          </div>

          <div style="margin-bottom:24px;">
            <div style="font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#8be9ff;margin-bottom:12px;">Requested Add-Ons</div>
            <div>${addOnsHtml}</div>
          </div>

          <div style="margin-bottom:24px;padding:20px 22px;border-radius:20px;background:rgba(15,23,42,0.68);border:1px solid rgba(148,163,184,0.12);">
            <div style="font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#8be9ff;margin-bottom:12px;">Your Notes</div>
            <div style="color:#dbe7f5;font-size:15px;line-height:1.7;">${details}</div>
          </div>

          <div style="padding:18px 20px;border-radius:18px;background:linear-gradient(180deg,rgba(34,197,94,0.12),rgba(59,130,246,0.1));border:1px solid rgba(148,163,184,0.12);">
            <div style="font-size:14px;font-weight:700;color:#f8fafc;margin-bottom:8px;">What happens next</div>
            <div style="color:#cbd5e1;font-size:15px;line-height:1.7;">I’ll review the scope, check what makes the most sense for your timeline and budget, and follow up with a clear response instead of a vague sales email.</div>
          </div>
          ${signatureBlock}
        </div>

        <div style="padding:22px 32px;border-top:1px solid rgba(148,163,184,0.12);color:#94a3b8;font-size:13px;line-height:1.7;">
          JahandCo<br />
          Reply to this email if you want to add anything before the follow-up.
        </div>
      </div>
    </div>
  `;
}

function getBrandingConfig(): QuoteMailBranding {
  const attachment = getSignatureAttachment();

  return {
    signatureImageSrc: attachment?.cid
      ? `cid:${attachment.cid}`
      : process.env.QUOTE_SIGNATURE_IMAGE_URL?.trim() || undefined,
    signatureImageCid: attachment?.cid,
    signatureName: process.env.QUOTE_SIGNATURE_NAME?.trim() || "JahandCo",
    signatureTitle: process.env.QUOTE_SIGNATURE_TITLE?.trim() || "JahandCo",
  };
}

function getSignatureAttachment(): MailAttachment | null {
  const configuredPath = process.env.QUOTE_SIGNATURE_IMAGE_PATH?.trim();
  const candidates = [
    configuredPath,
    path.resolve(process.cwd(), "public/signature.PNG"),
    path.resolve(process.cwd(), "public/signature.png"),
  ].filter((value): value is string => Boolean(value));

  const signaturePath = candidates.find((candidate) => existsSync(candidate));
  if (!signaturePath) return null;

  return {
    filename: path.basename(signaturePath),
    path: signaturePath,
    cid: "jahandco-quote-signature",
  };
}

function buildAdminNotificationHtml(payload: QuoteMailPayload, submittedAt: string, addOns: string) {
  const items = [
    ["Submission ID", payload.id],
    ["Name", payload.name],
    ["Email", payload.email],
    ["Phone", payload.phone || "Not provided"],
    ["Plan", payload.selectedPlan || "Not selected"],
    ["Project Type", payload.projectType],
    ["Budget", payload.budgetRange],
    ["Timeline", payload.timeline],
    ["Add-ons", addOns],
    ["Submitted", submittedAt],
  ];

  return `
    <div style="font:14px/1.6 Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#111827;">
      <h2 style="margin:0 0 16px;">New quote request</h2>
      <table role="presentation" style="border-collapse:collapse;">
        ${items
          .map(
            ([label, value]) => `
              <tr>
                <td style="padding:6px 16px 6px 0;font-weight:600;vertical-align:top;">${escapeHtml(label)}</td>
                <td style="padding:6px 0;vertical-align:top;">${escapeHtml(value)}</td>
              </tr>
            `,
          )
          .join("")}
      </table>
      <div style="margin-top:18px;font-weight:600;">Project details</div>
      <div style="margin-top:8px;white-space:normal;">${nl2br(payload.details)}</div>
    </div>
  `;
}

function getTransportConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const portValue = process.env.SMTP_PORT?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const quoteFrom = process.env.QUOTE_FROM_EMAIL?.trim();
  const quoteTo = process.env.QUOTE_TO_EMAIL?.trim();
  const from = quoteFrom || (isEmailLike(user) ? user : undefined);
  const to = quoteTo || from;

  const missing: string[] = [];
  if (!host) missing.push("SMTP_HOST");
  if (!portValue) missing.push("SMTP_PORT");
  if (!from) missing.push("QUOTE_FROM_EMAIL or SMTP_USER");
  if (!to) missing.push("QUOTE_TO_EMAIL or QUOTE_FROM_EMAIL or SMTP_USER");

  if (missing.length > 0) {
    return { error: `SMTP not configured: missing ${missing.join(", ")}` } as const;
  }

  const port = Number(portValue);
  if (!Number.isFinite(port)) {
    return { error: "SMTP not configured: SMTP_PORT is not a valid number" } as const;
  }

  if (!host || !from || !to) {
    return { error: "SMTP not configured: missing required mail values after validation" } as const;
  }

  return {
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
    from,
    to,
  } satisfies MailTransportConfig;
}

export async function sendQuoteSubmissionEmails(payload: QuoteMailPayload) {
  const config = getTransportConfig();
  if ("error" in config) {
    return { adminNotified: false, customerAcknowledged: false, error: config.error };
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });

  const submittedAt = payload.createdAt.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const addOns = formatQuoteAddOns(payload.addOns);
  const signatureAttachment = getSignatureAttachment();
  const adminText = [
    `Submission ID: ${payload.id}`,
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    `Phone: ${payload.phone || "Not provided"}`,
    `Plan: ${payload.selectedPlan || "Not selected"}`,
    `Project Type: ${payload.projectType}`,
    `Budget: ${payload.budgetRange}`,
    `Timeline: ${payload.timeline}`,
    `Add-ons: ${addOns}`,
    `Submitted: ${submittedAt}`,
    "",
    payload.details,
  ].join("\n");

  const customerText = [
    `Hello ${payload.name},`,
    "",
    "Thank you for reaching out to JahandCo.",
    "I received your request and will review it personally before following up with you.",
    "",
    `Submitted: ${submittedAt}`,
    `Project type: ${payload.projectType}`,
    `Budget range: ${payload.budgetRange}`,
    `Timeline: ${payload.timeline}`,
    `Selected plan: ${payload.selectedPlan || "Not selected"}`,
    `Phone: ${payload.phone || "Not provided"}`,
    `Add-ons: ${addOns}`,
    "",
    "Your notes:",
    payload.details,
    "",
    "If there is anything else you'd like to add, or have any questions, feel free to reply to this email.",
    "",
    "JahandCo",
  ].join("\n");

  try {
    await transporter.sendMail({
      from: config.from,
      to: config.to,
      replyTo: payload.email,
      subject: `New JahandCo quote request from ${payload.name}`,
      text: adminText,
      html: buildAdminNotificationHtml(payload, submittedAt, addOns),
    });

    await transporter.sendMail({
      from: config.from,
      to: payload.email,
      subject: "We received your JahandCo project request",
      text: customerText,
      html: buildCustomerConfirmationHtml(payload, submittedAt),
      attachments: signatureAttachment ? [signatureAttachment] : undefined,
    });

    return { adminNotified: true, customerAcknowledged: true, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email error";
    return { adminNotified: false, customerAcknowledged: false, error: message };
  }
}
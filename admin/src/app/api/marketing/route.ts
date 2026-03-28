import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  buildManualEmailHtml,
  getManualEmailTemplatesForShop,
  isManualEmailTemplateAllowed,
  normalizeManualEmailTemplateId,
  sendManualEmail,
  type ManualEmailInput,
  type ManualEmailSection,
} from "@/lib/email/manualEmailMailer";

type MarketingRequestBody = Partial<ManualEmailInput> & {
  action?: "preview" | "send";
};

async function requireAdminAndShopAccess() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string; email?: string | null } | undefined;

  if (!session || !user?.id || user.role !== "ADMIN") return null;

  return { email: user.email ?? null };
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeSections(value: unknown): ManualEmailSection[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap<ManualEmailSection>((entry, index) => {
    if (!isRecord(entry) || typeof entry.type !== "string") return [];

    const id = normalizeString(entry.id) || `section-${index + 1}`;
    switch (entry.type) {
      case "heading":
        return [
          {
            id,
            type: "heading",
            content: normalizeString(entry.content),
            align: entry.align === "center" ? "center" : "left",
          } satisfies ManualEmailSection,
        ];
      case "text":
        return [
          {
            id,
            type: "text",
            content: normalizeString(entry.content),
          } satisfies ManualEmailSection,
        ];
      case "divider":
        return [{ id, type: "divider" } satisfies ManualEmailSection];
      case "spacer":
        return [
          {
            id,
            type: "spacer",
            size: typeof entry.size === "number" ? entry.size : Number(entry.size ?? 24) || 24,
          } satisfies ManualEmailSection,
        ];
      case "button":
        return [
          {
            id,
            type: "button",
            label: normalizeString(entry.label),
            url: normalizeString(entry.url),
            align: entry.align === "center" ? "center" : "left",
          } satisfies ManualEmailSection,
        ];
      default:
        return [];
    }
  });
}

function normalizeBody(body: MarketingRequestBody, replyTo: string | undefined): ManualEmailInput {
  return {
    to: normalizeString(body.to),
    subject: normalizeString(body.subject),
    title: normalizeString(body.title),
    bodyHtml: typeof body.bodyHtml === "string" ? body.bodyHtml.trim() : "",
    sections: normalizeSections(body.sections),
    previewText: normalizeString(body.previewText) || undefined,
    badge: normalizeString(body.badge) || undefined,
    intro: normalizeString(body.intro) || undefined,
    ctaLabel: normalizeString(body.ctaLabel) || undefined,
    ctaUrl: normalizeString(body.ctaUrl) || undefined,
    footerNote: normalizeString(body.footerNote) || undefined,
    signatureName: normalizeString(body.signatureName) || undefined,
    signatureTitle: normalizeString(body.signatureTitle) || undefined,
    replyTo,
  };
}

function validateInput(input: ManualEmailInput, action: "preview" | "send") {
  if (!input.subject) return "Subject is required";
  if (!input.title) return "Title is required";
  if (!(input.sections && input.sections.length > 0) && !input.bodyHtml) return "Add at least one content section";
  if (action === "send" && (!input.to || !/.+@.+\..+/.test(input.to))) return "A valid recipient email is required";
  if (input.ctaLabel && !input.ctaUrl) return "CTA URL is required when CTA label is provided";
  if (input.ctaUrl && !input.ctaLabel) return "CTA label is required when CTA URL is provided";
  if ((input.sections ?? []).some((section) => section.type === "button" && (!section.label || !section.url))) {
    return "Button sections require both a label and a URL";
  }
  return null;
}

export async function POST(req: Request) {
  const access = await requireAdminAndShopAccess();
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as MarketingRequestBody;
  const action = body.action === "send" ? "send" : "preview";
  const input = normalizeBody(body, access.email ?? undefined);
  const templateId = normalizeManualEmailTemplateId(normalizeString(body.templateId) || undefined);
  input.templateId = templateId;
  const validationError = validateInput(input, action);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  if (!isManualEmailTemplateAllowed(templateId)) {
    return NextResponse.json({ error: "Selected template is not available" }, { status: 400 });
  }

  if (action === "preview") {
    return NextResponse.json({ html: buildManualEmailHtml(input) });
  }

  const result = await sendManualEmail(input);
  if (!result.ok) {
    return NextResponse.json({ error: result.error || "Failed to send email" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, to: input.to });
}

export async function GET() {
  const access = await requireAdminAndShopAccess();
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({
    templates: getManualEmailTemplatesForShop(),
  });
}
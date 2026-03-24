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
} from "@/lib/email/manualEmailMailer";
import prisma from "@/lib/prisma";
import { resolveCoreShopIdFromCookie } from "@/lib/serviceAuth";

type MarketingRequestBody = Partial<ManualEmailInput> & {
  action?: "preview" | "send";
};

async function requireAdminAndShopAccess() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string; email?: string | null } | undefined;

  if (!session || !user?.id || user.role !== "ADMIN") return null;

  const shopId = await resolveCoreShopIdFromCookie();
  const membership = await prisma.shopUser.findUnique({
    where: { shopId_userId: { shopId, userId: user.id } },
    select: { id: true },
  });

  if (!membership) return null;
  return { shopId, email: user.email ?? null };
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeBody(body: MarketingRequestBody, replyTo: string | undefined): ManualEmailInput {
  return {
    to: normalizeString(body.to),
    subject: normalizeString(body.subject),
    title: normalizeString(body.title),
    bodyHtml: typeof body.bodyHtml === "string" ? body.bodyHtml.trim() : "",
    templateId: normalizeString(body.templateId) || undefined,
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
  if (!input.bodyHtml) return "Body HTML is required";
  if (action === "send" && (!input.to || !/.+@.+\..+/.test(input.to))) return "A valid recipient email is required";
  if (input.ctaLabel && !input.ctaUrl) return "CTA URL is required when CTA label is provided";
  if (input.ctaUrl && !input.ctaLabel) return "CTA label is required when CTA URL is provided";
  return null;
}

export async function POST(req: Request) {
  const access = await requireAdminAndShopAccess();
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as MarketingRequestBody;
  const action = body.action === "send" ? "send" : "preview";
  const input = normalizeBody(body, access.email ?? undefined);
  const templateId = normalizeManualEmailTemplateId(access.shopId, input.templateId);
  input.templateId = templateId;
  const validationError = validateInput(input, action);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  if (!isManualEmailTemplateAllowed(access.shopId, templateId)) {
    return NextResponse.json({ error: "Selected template is not available for this shop" }, { status: 400 });
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
    shopId: access.shopId,
    templates: getManualEmailTemplatesForShop(access.shopId),
  });
}
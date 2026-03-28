import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { sendStorefrontTemplateEmail } from "@/lib/email/storefrontMailer";

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = normalizeEmail(session?.user?.email);
  if (!session?.user || !email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: unknown = await req.json().catch(() => ({}));
  const bodyObj = isRecord(body) ? body : null;

  const shirtSize = asString(bodyObj?.shirtSize).trim();
  const shirtColor = asString(bodyObj?.shirtColor).trim();
  const galleryDesignRef = asString(bodyObj?.galleryDesignRef).trim();
  const basedOnStyleProfile = asBoolean(bodyObj?.basedOnStyleProfile);
  const notes = asString(bodyObj?.notes).trim();

  if (!shirtSize) return NextResponse.json({ error: "shirtSize is required" }, { status: 400 });
  if (!shirtColor) return NextResponse.json({ error: "shirtColor is required" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, firstName: true, styleSurvey: { select: { id: true } } },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!user.styleSurvey) {
    return NextResponse.json({ error: "Style survey required" }, { status: 412 });
  }

  const created = await prisma.customDesignRequest.create({
    data: {
      userId: user.id,
      shirtSize,
      shirtColor,
      galleryDesignRef: galleryDesignRef || null,
      basedOnStyleProfile,
      notes: notes || null,
    },
    select: { id: true },
  });

  void sendStorefrontTemplateEmail({
    to: email,
    subject: "Custom design request received",
    template: {
      badge: "JahandCo",
      title: "Request received",
      intro: "Thanks — we received your custom design request. We’ll email you when a draft is ready for review.",
      bodyHtml: `
        <div>
          <p style="margin:0;">Shirt size: ${escapeHtml(shirtSize)}</p>
          <p style="margin:0;">Shirt color: ${escapeHtml(shirtColor)}</p>
          ${galleryDesignRef ? `<p style="margin:0;">Gallery selection: ${escapeHtml(galleryDesignRef)}</p>` : ""}
          ${basedOnStyleProfile ? `<p style="margin:0;">Based on Style Profile: Yes</p>` : ""}
        </div>
      `,
      footerNote: "Reply to this email if you want to add details.",
      signatureName: "JahandCo",
      signatureTitle: "JahandCo",
    },
  });

  return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
}

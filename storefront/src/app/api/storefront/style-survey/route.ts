import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "../../../../../generated/prisma/client";

import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { generateUserDisplayId } from "@/lib/displayId";
import { sendStorefrontTemplateEmail } from "@/lib/email/storefrontMailer";

export const runtime = "nodejs";

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function pickString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = normalizeEmail(session?.user?.email);
  if (!session?.user || !email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email },
    include: { styleSurvey: true },
  });

  return NextResponse.json({ submission: user?.styleSurvey ?? null });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = normalizeEmail(session?.user?.email);
  if (!session?.user || !email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: unknown = await req.json().catch(() => ({}));
  const bodyObj = isRecord(body) ? body : null;

  const answersObj = bodyObj && isRecord(bodyObj.answers) ? bodyObj.answers : null;
  if (!answersObj) return NextResponse.json({ error: "answers must be an object" }, { status: 400 });

  const version = bodyObj ? pickString(bodyObj.version) : null;

  const displayId = await generateUserDisplayId(prisma, { email });
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, displayId },
    update: {},
    select: { id: true },
  });

  const existing = await prisma.styleSurveySubmission.findUnique({ where: { userId: user.id } });
  if (existing) {
    return NextResponse.json({ error: "Already submitted", submission: existing }, { status: 409 });
  }

  const submission = await prisma.styleSurveySubmission.create({
    data: {
      userId: user.id,
      answers: answersObj as Prisma.InputJsonValue,
      version,
      submittedAt: new Date(),
    },
  });

  // Best-effort transactional email (do not block submission)
  void sendStorefrontTemplateEmail({
    to: email,
    subject: "We received your Style Survey",
    template: {
      badge: "JahandCo",
      title: "Style Survey received",
      intro: "Thanks for submitting your Style Survey. We’ll use your answers to personalize your experience.",
      bodyHtml: "<p style=\"margin:0;\">You can return any time to review your Style Profile and request a custom design draft.</p>",
      footerNote: "Reply to this email if you need to update anything.",
      signatureName: "JahandCo",
      signatureTitle: "JahandCo",
    },
  });

  return NextResponse.json({ submission }, { status: 201 });
}

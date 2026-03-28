import { NextResponse } from "next/server";
import { hash } from "bcryptjs";

import prisma from "@/lib/prisma";
import { generateUserDisplayId } from "@/lib/displayId";
import { sendStorefrontTemplateEmail } from "@/lib/email/storefrontMailer";

export const runtime = "nodejs";

type Body = {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
};

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeDateOfBirth(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  const firstName = normalizeName(body.firstName);
  const lastName = normalizeName(body.lastName);
  const phone = normalizePhone(body.phone);
  const dateOfBirth = normalizeDateOfBirth(body.dateOfBirth);

  if (typeof body.dateOfBirth === "string" && body.dateOfBirth.trim() && !dateOfBirth) {
    return new NextResponse("dateOfBirth must be a valid date", { status: 400 });
  }

  if (!email) return new NextResponse("Email is required", { status: 400 });
  if (password.length < 8) return new NextResponse("Password must be at least 8 characters", { status: 400 });

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser && existingUser.password) {
    return new NextResponse("Account already exists", { status: 409 });
  }

  const passwordHash = await hash(password, 10);

  const displayId = await generateUserDisplayId(prisma, { email, firstName, lastName });

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      displayId,
      email,
      firstName,
      lastName,
      phone,
      dateOfBirth,
      password: passwordHash,
      role: "CUSTOMER",
    },
    update: {
      displayId,
      firstName: existingUser?.firstName ?? firstName,
      lastName: existingUser?.lastName ?? lastName,
      phone: existingUser?.phone ?? phone,
      dateOfBirth: existingUser?.dateOfBirth ?? dateOfBirth,
      password: passwordHash,
    },
    select: { id: true, email: true, role: true },
  });

  // Best-effort welcome email (do not block registration)
  void sendStorefrontTemplateEmail({
    to: email,
    subject: "Welcome to JahandCo",
    template: {
      badge: "JahandCo",
      title: "Welcome",
      intro: "Your account is ready. You can now submit your Style Survey and request custom design drafts.",
      bodyHtml: "<p style=\"margin:0;\">If you ever need help, just reply to this email.</p>",
      footerNote: "Reply directly to this email if you want to continue the conversation.",
      signatureName: "JahandCo",
      signatureTitle: "JahandCo",
    },
  });

  return NextResponse.json({ ok: true, user });
}

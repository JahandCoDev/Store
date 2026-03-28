import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { generateUserDisplayId } from "@/lib/displayId";

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = normalizeEmail(session?.user?.email);
  if (!session?.user || !email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const displayId = await generateUserDisplayId(prisma, { email });

  const customer = await prisma.user.upsert({
    where: { email },
    create: { email, displayId },
    update: {},
    include: {
      addresses: { orderBy: { createdAt: "desc" } },
      styleSurvey: true,
    },
  });

  return NextResponse.json(customer);
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  const email = normalizeEmail(session?.user?.email);
  if (!session?.user || !email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: unknown = await req.json().catch(() => ({}));
  const bodyObj = isRecord(body) ? body : null;

  const data: { firstName?: string | null; lastName?: string | null; phone?: string | null; dateOfBirth?: Date | null } = {};
  if (bodyObj && typeof bodyObj.firstName === "string") data.firstName = bodyObj.firstName.trim() || null;
  if (bodyObj && typeof bodyObj.lastName === "string") data.lastName = bodyObj.lastName.trim() || null;
  if (bodyObj && typeof bodyObj.phone === "string") data.phone = bodyObj.phone.trim() || null;
  if (bodyObj && typeof bodyObj.dateOfBirth === "string") {
    const trimmed = bodyObj.dateOfBirth.trim();
    const dateOfBirth = trimmed ? new Date(trimmed) : null;
    if (dateOfBirth && Number.isNaN(dateOfBirth.getTime())) {
      return NextResponse.json({ error: "dateOfBirth must be a valid date" }, { status: 400 });
    }
    data.dateOfBirth = dateOfBirth;
  }

  const displayId = await generateUserDisplayId(prisma, {
    email,
    firstName: data.firstName ?? undefined,
    lastName: data.lastName ?? undefined,
  });

  const updated = await prisma.user.upsert({
    where: { email },
    create: { email, displayId, ...data },
    update: {
      ...data,
      ...(data.firstName || data.lastName ? { displayId } : {}),
    },
    include: {
      addresses: { orderBy: { createdAt: "desc" } },
      styleSurvey: true,
    },
  });

  return NextResponse.json(updated);
}

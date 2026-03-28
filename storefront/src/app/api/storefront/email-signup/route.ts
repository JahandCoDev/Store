import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { generateUserDisplayId } from "@/lib/displayId";

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(req: Request) {
  const body: unknown = await req.json().catch(() => ({}));
  const email = normalizeEmail(isRecord(body) ? body.email : "");

  if (!email || !email.includes("@") || email.length > 320) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }

  const displayId = await generateUserDisplayId(prisma, { email });

  // Ensure user exists
  await prisma.user.upsert({
    where: { email },
    create: { email, displayId },
    update: {},
    select: { id: true },
  });

  return NextResponse.json({ ok: true });
}

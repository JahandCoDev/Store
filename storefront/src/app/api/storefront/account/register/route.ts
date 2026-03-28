import { NextResponse } from "next/server";
import { hash } from "bcryptjs";

import prisma from "@/lib/prisma";
import { generateUserDisplayId } from "@/lib/displayId";

export const runtime = "nodejs";

type Body = {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
};

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
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
      password: passwordHash,
      role: "CUSTOMER",
    },
    update: {
      firstName: existingUser?.firstName ?? firstName,
      lastName: existingUser?.lastName ?? lastName,
      password: passwordHash,
    },
    select: { id: true, email: true, role: true },
  });

  return NextResponse.json({ ok: true, user });
}

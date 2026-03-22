import { NextResponse } from "next/server";
import { hash } from "bcryptjs";

import prisma from "@/lib/prisma";
import { isValidStore, resolveShopIdForStore } from "@/lib/storefront/store";

export const runtime = "nodejs";

type Body = {
  store?: string;
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

  const store = body.store;
  if (!store || !isValidStore(store)) return new NextResponse("Invalid store", { status: 400 });

  const shopId = resolveShopIdForStore(store);
  if (!shopId) return new NextResponse("Store not configured", { status: 400 });

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

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: [firstName, lastName].filter(Boolean).join(" ") || null,
      password: passwordHash,
      role: "USER",
    },
    update: {
      name: existingUser?.name ?? ([firstName, lastName].filter(Boolean).join(" ") || null),
      password: passwordHash,
      role: existingUser?.role ?? "USER",
    },
    select: { id: true, email: true, role: true },
  });

  // Ensure a Customer exists for this shop so the admin app can manage it.
  await prisma.customer.upsert({
    where: { shopId_email: { shopId, email } },
    create: {
      shopId,
      email,
      firstName,
      lastName,
      consent: { create: { emailMarketingOptIn: false } },
    },
    update: {
      firstName,
      lastName,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, user });
}

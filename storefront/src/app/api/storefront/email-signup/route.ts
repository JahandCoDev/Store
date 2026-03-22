import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { isValidStore, resolveShopIdForStore } from "@/lib/storefront/store";

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const store = url.searchParams.get("store") ?? "";
  if (!store || !isValidStore(store)) return NextResponse.json({ error: "Invalid store" }, { status: 400 });

  const shopId = resolveShopIdForStore(store);
  if (!shopId) return NextResponse.json({ error: "Store not configured" }, { status: 400 });

  const body: unknown = await req.json().catch(() => ({}));
  const email = normalizeEmail(isRecord(body) ? body.email : "");

  if (!email || !email.includes("@") || email.length > 320) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.upsert({
      where: { shopId_email: { shopId, email } },
      create: {
        shopId,
        email,
        consent: {
          create: {
            emailMarketingOptIn: true,
            emailMarketingOptInAt: new Date(),
          },
        },
      },
      update: {},
      select: { id: true },
    });

    await tx.customerConsent.upsert({
      where: { customerId: customer.id },
      create: {
        customerId: customer.id,
        emailMarketingOptIn: true,
        emailMarketingOptInAt: new Date(),
      },
      update: {
        emailMarketingOptIn: true,
        emailMarketingOptInAt: new Date(),
      },
    });
  });

  return NextResponse.json({ ok: true });
}

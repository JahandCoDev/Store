import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isValidStore, resolveShopIdForStore } from "@/lib/storefront/store";

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = normalizeEmail(session?.user?.email);
  if (!session?.user || !email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const store = url.searchParams.get("store") ?? "";
  if (!store || !isValidStore(store)) return NextResponse.json({ error: "Invalid store" }, { status: 400 });

  const shopId = resolveShopIdForStore(store);
  if (!shopId) return NextResponse.json({ error: "Store not configured" }, { status: 400 });

  const body: unknown = await req.json().catch(() => ({}));
  const bodyObj = isRecord(body) ? body : null;

  const line1 = bodyObj && typeof bodyObj.line1 === "string" ? bodyObj.line1.trim() : "";
  const line2 = bodyObj && typeof bodyObj.line2 === "string" ? bodyObj.line2.trim() || null : null;
  const city = bodyObj && typeof bodyObj.city === "string" ? bodyObj.city.trim() : "";
  const state = bodyObj && typeof bodyObj.state === "string" ? bodyObj.state.trim() : "";
  const zip = bodyObj && typeof bodyObj.zip === "string" ? bodyObj.zip.trim() : "";
  const country = bodyObj && typeof bodyObj.country === "string" ? bodyObj.country.trim() || "US" : "US";
  const name = bodyObj && typeof bodyObj.name === "string" ? bodyObj.name.trim() || null : null;
  const phone = bodyObj && typeof bodyObj.phone === "string" ? bodyObj.phone.trim() || null : null;
  const isDefault = bodyObj && typeof bodyObj.isDefault === "boolean" ? bodyObj.isDefault : false;

  if (!line1 || !city || !state || !zip) {
    return NextResponse.json(
      { error: "line1, city, state, and zip are required" },
      { status: 400 }
    );
  }

  const customer = await prisma.customer.upsert({
    where: { shopId_email: { shopId, email } },
    create: { shopId, email, consent: { create: { emailMarketingOptIn: false, smsMarketingOptIn: false } } },
    update: {},
    select: { id: true },
  });

  const address = await prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.customerAddress.updateMany({ where: { customerId: customer.id }, data: { isDefault: false } });
    }

    const created = await tx.customerAddress.create({
      data: {
        customerId: customer.id,
        name,
        line1,
        line2,
        city,
        state,
        zip,
        country,
        phone,
        isDefault,
      },
    });

    if (!isDefault) {
      const hasDefault = await tx.customerAddress.count({ where: { customerId: customer.id, isDefault: true } });
      if (hasDefault === 0) {
        await tx.customerAddress.update({ where: { id: created.id }, data: { isDefault: true } });
        return { ...created, isDefault: true };
      }
    }

    return created;
  });

  return NextResponse.json(address, { status: 201 });
}

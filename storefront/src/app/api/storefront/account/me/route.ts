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

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const email = normalizeEmail(session?.user?.email);
  if (!session?.user || !email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const store = url.searchParams.get("store") ?? "";
  if (!store || !isValidStore(store)) return NextResponse.json({ error: "Invalid store" }, { status: 400 });

  const shopId = resolveShopIdForStore(store);
  if (!shopId) return NextResponse.json({ error: "Store not configured" }, { status: 400 });

  const customer = await prisma.customer.upsert({
    where: { shopId_email: { shopId, email } },
    create: {
      shopId,
      email,
      consent: { create: { emailMarketingOptIn: false } },
    },
    update: {},
    include: {
      consent: true,
      addresses: { orderBy: { createdAt: "desc" } },
    },
  });

  return NextResponse.json(customer);
}

export async function PATCH(req: Request) {
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

  const consentBody = bodyObj && isRecord(bodyObj.consent) ? bodyObj.consent : null;
  const consentUpdate: { emailMarketingOptIn?: boolean } = {};
  if (consentBody && typeof consentBody.emailMarketingOptIn === "boolean") {
    consentUpdate.emailMarketingOptIn = consentBody.emailMarketingOptIn;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.upsert({
      where: { shopId_email: { shopId, email } },
      create: {
        shopId,
        email,
        ...data,
        consent: {
          create: {
            emailMarketingOptIn: consentUpdate.emailMarketingOptIn ?? false,
            emailMarketingOptInAt: consentUpdate.emailMarketingOptIn ? new Date() : null,
          },
        },
      },
      update: data,
      select: { id: true },
    });

    if (Object.keys(consentUpdate).length) {
      await tx.customerConsent.upsert({
        where: { customerId: customer.id },
        create: {
          customerId: customer.id,
          emailMarketingOptIn: consentUpdate.emailMarketingOptIn ?? false,
          emailMarketingOptInAt: consentUpdate.emailMarketingOptIn ? new Date() : null,
        },
        update: {
          ...(typeof consentUpdate.emailMarketingOptIn === "boolean"
            ? {
                emailMarketingOptIn: consentUpdate.emailMarketingOptIn,
                emailMarketingOptInAt: consentUpdate.emailMarketingOptIn ? new Date() : null,
              }
            : {}),
        },
      });
    }

    return tx.customer.findFirst({
      where: { id: customer.id },
      include: {
        consent: true,
        addresses: { orderBy: { createdAt: "desc" } },
      },
    });
  });

  return NextResponse.json(updated);
}

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { resolveCoreShopIdFromCookie, resolveDatadogAppAuth } from "@/lib/serviceAuth";

async function getSelectedShopId(): Promise<string> {
  return resolveCoreShopIdFromCookie();
}

function hasBearerAuth(req: Request): boolean {
  return (req.headers.get("authorization") ?? "").startsWith("Bearer ");
}

async function requireShopAccess(shopId: string) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | null | undefined)?.id;
  const role = (session?.user as { role?: string } | null | undefined)?.role;
  if (!session || !userId || role !== "ADMIN") return null;

  const membership = await prisma.shopUser.findUnique({
    where: { shopId_userId: { shopId, userId } },
    select: { id: true },
  });
  if (!membership) return null;

  return { userId, shopUserId: membership.id };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    let shopId: string;
    if (hasBearerAuth(req)) {
      const dd = await resolveDatadogAppAuth(req);
      if (!dd.ok) return NextResponse.json({ error: dd.error }, { status: dd.status });
      shopId = dd.shopId;
    } else {
      shopId = await getSelectedShopId();
      const auth = await requireShopAccess(shopId);
      if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;
    const customer = await prisma.customer.findFirst({
      where: { id, shopId },
      include: {
        addresses: { orderBy: { createdAt: "desc" } },
        consent: true,
        notes: {
          orderBy: { createdAt: "desc" },
          include: { createdBy: { include: { user: { select: { email: true, name: true } } } } },
        },
      },
    });

    if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(customer);
  } catch (error) {
    console.error("Failed to fetch customer:", error);
    return NextResponse.json({ error: "Failed to fetch customer" }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    let shopId: string;
    if (hasBearerAuth(req)) {
      const dd = await resolveDatadogAppAuth(req);
      if (!dd.ok) return NextResponse.json({ error: dd.error }, { status: dd.status });
      shopId = dd.shopId;
    } else {
      shopId = await getSelectedShopId();
      const auth = await requireShopAccess(shopId);
      if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;
    const body: unknown = await req.json().catch(() => ({}));
    const bodyObj = isRecord(body) ? body : null;

    const data: {
      phone?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      dateOfBirth?: Date | null;
      tags?: string[];
    } = {};

    if (bodyObj && typeof bodyObj.phone === "string") data.phone = bodyObj.phone.trim() || null;
    if (bodyObj && typeof bodyObj.firstName === "string") data.firstName = bodyObj.firstName.trim() || null;
    if (bodyObj && typeof bodyObj.lastName === "string") data.lastName = bodyObj.lastName.trim() || null;
    if (bodyObj && typeof bodyObj.dateOfBirth === "string") {
      const trimmed = bodyObj.dateOfBirth.trim();
      const dateOfBirth = trimmed ? new Date(trimmed) : null;
      if (dateOfBirth && Number.isNaN(dateOfBirth.getTime())) {
        return NextResponse.json({ error: "dateOfBirth must be a valid date" }, { status: 400 });
      }
      data.dateOfBirth = dateOfBirth;
    }
    if (bodyObj && Array.isArray(bodyObj.tags)) {
      data.tags = bodyObj.tags
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.trim())
        .filter(Boolean);
    }

    const consentBody = bodyObj && isRecord(bodyObj.consent) ? bodyObj.consent : null;
    const consentUpdate: { emailMarketingOptIn?: boolean; smsMarketingOptIn?: boolean } = {};
    if (consentBody && typeof consentBody.emailMarketingOptIn === "boolean") {
      consentUpdate.emailMarketingOptIn = consentBody.emailMarketingOptIn;
    }
    if (consentBody && typeof consentBody.smsMarketingOptIn === "boolean") {
      consentUpdate.smsMarketingOptIn = consentBody.smsMarketingOptIn;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const exists = await tx.customer.findFirst({ where: { id, shopId }, select: { id: true } });
      if (!exists) return null;

      const customer = await tx.customer.update({
        where: { id },
        data,
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          tags: true,
          updatedAt: true,
        },
      });

      if (Object.keys(consentUpdate).length) {
        await tx.customerConsent.upsert({
          where: { customerId: customer.id },
          create: {
            customerId: customer.id,
            emailMarketingOptIn: consentUpdate.emailMarketingOptIn ?? false,
            emailMarketingOptInAt: consentUpdate.emailMarketingOptIn ? new Date() : null,
            smsMarketingOptIn: consentUpdate.smsMarketingOptIn ?? false,
            smsMarketingOptInAt: consentUpdate.smsMarketingOptIn ? new Date() : null,
          },
          update: {
            ...(typeof consentUpdate.emailMarketingOptIn === "boolean"
              ? {
                  emailMarketingOptIn: consentUpdate.emailMarketingOptIn,
                  emailMarketingOptInAt: consentUpdate.emailMarketingOptIn ? new Date() : null,
                }
              : {}),
            ...(typeof consentUpdate.smsMarketingOptIn === "boolean"
              ? {
                  smsMarketingOptIn: consentUpdate.smsMarketingOptIn,
                  smsMarketingOptInAt: consentUpdate.smsMarketingOptIn ? new Date() : null,
                }
              : {}),
          },
        });
      }

      return customer;
    });

    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update customer:", error);
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    let shopId: string;
    if (hasBearerAuth(req)) {
      const dd = await resolveDatadogAppAuth(req);
      if (!dd.ok) return NextResponse.json({ error: dd.error }, { status: dd.status });
      shopId = dd.shopId;
    } else {
      shopId = await getSelectedShopId();
      const auth = await requireShopAccess(shopId);
      if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;
    const deleted = await prisma.customer.deleteMany({ where: { id, shopId } });
    if (deleted.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete customer:", error);
    return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 });
  }
}

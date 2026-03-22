import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
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

  return { userId };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string; addressId: string }> }) {
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

    const { id: customerId, addressId } = await ctx.params;

    const customer = await prisma.customer.findFirst({ where: { id: customerId, shopId }, select: { id: true } });
    if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const existing = await prisma.customerAddress.findFirst({
      where: { id: addressId, customerId },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body: unknown = await req.json().catch(() => ({}));
    const bodyObj = isRecord(body) ? body : null;

    const data: Prisma.CustomerAddressUpdateInput = {};

    if (bodyObj && typeof bodyObj.name === "string") data.name = bodyObj.name.trim() || null;
    if (bodyObj && typeof bodyObj.line1 === "string") {
      const v = bodyObj.line1.trim();
      if (!v) return NextResponse.json({ error: "line1 cannot be empty" }, { status: 400 });
      data.line1 = v;
    }
    if (bodyObj && typeof bodyObj.line2 === "string") data.line2 = bodyObj.line2.trim() || null;
    if (bodyObj && typeof bodyObj.city === "string") {
      const v = bodyObj.city.trim();
      if (!v) return NextResponse.json({ error: "city cannot be empty" }, { status: 400 });
      data.city = v;
    }
    if (bodyObj && typeof bodyObj.state === "string") {
      const v = bodyObj.state.trim();
      if (!v) return NextResponse.json({ error: "state cannot be empty" }, { status: 400 });
      data.state = v;
    }
    if (bodyObj && typeof bodyObj.zip === "string") {
      const v = bodyObj.zip.trim();
      if (!v) return NextResponse.json({ error: "zip cannot be empty" }, { status: 400 });
      data.zip = v;
    }
    if (bodyObj && typeof bodyObj.country === "string") {
      const v = bodyObj.country.trim();
      if (!v) return NextResponse.json({ error: "country cannot be empty" }, { status: 400 });
      data.country = v;
    }
    if (bodyObj && typeof bodyObj.phone === "string") data.phone = bodyObj.phone.trim() || null;

    const isDefault = bodyObj && typeof bodyObj.isDefault === "boolean" ? bodyObj.isDefault : undefined;

    const updated = await prisma.$transaction(async (tx) => {
      if (isDefault === true) {
        await tx.customerAddress.updateMany({ where: { customerId }, data: { isDefault: false } });
        data.isDefault = true;
      } else if (isDefault === false) {
        data.isDefault = false;
      }

      const addr = await tx.customerAddress.update({ where: { id: addressId }, data });

      // Ensure there's always a default if addresses exist.
      const addressCount = await tx.customerAddress.count({ where: { customerId } });
      const hasDefault = await tx.customerAddress.count({ where: { customerId, isDefault: true } });
      if (addressCount > 0 && hasDefault === 0) {
        const newest = await tx.customerAddress.findFirst({
          where: { customerId },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        });
        if (newest) {
          await tx.customerAddress.update({ where: { id: newest.id }, data: { isDefault: true } });
          if (newest.id === addr.id) return { ...addr, isDefault: true };
        }
      }

      return addr;
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update customer address:", error);
    return NextResponse.json({ error: "Failed to update address" }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string; addressId: string }> }) {
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

    const { id: customerId, addressId } = await ctx.params;

    const customer = await prisma.customer.findFirst({ where: { id: customerId, shopId }, select: { id: true } });
    if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const deleted = await prisma.customerAddress.deleteMany({ where: { id: addressId, customerId } });
    if (deleted.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // If default was removed, promote newest remaining to default.
    const hasDefault = await prisma.customerAddress.count({ where: { customerId, isDefault: true } });
    if (hasDefault === 0) {
      const newest = await prisma.customerAddress.findFirst({
        where: { customerId },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (newest) {
        await prisma.customerAddress.update({ where: { id: newest.id }, data: { isDefault: true } });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete customer address:", error);
    return NextResponse.json({ error: "Failed to delete address" }, { status: 500 });
  }
}

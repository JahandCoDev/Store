import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";


import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isValidStore } from "@/lib/storefront/store";


function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ addressId: string }> }) {
  const session = await getServerSession(authOptions);
  const email = normalizeEmail(session?.user?.email);
  if (!session?.user || !email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const store = url.searchParams.get("store") ?? "";
  if (!store || !isValidStore(store)) return NextResponse.json({ error: "Invalid store" }, { status: 400 });

  const { addressId } = await ctx.params;

  const customer = await prisma.user.findFirst({
    where: { email },
    select: { id: true },
  });
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await prisma.address.findFirst({
    where: { id: addressId, userId: customer.id },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body: unknown = await req.json().catch(() => ({}));
  const bodyObj = isRecord(body) ? body : null;

  const data: Record<string, unknown> = {};
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
      await tx.address.updateMany({ where: { userId: customer.id }, data: { isDefault: false } });
      data.isDefault = true;
    } else if (isDefault === false) {
      data.isDefault = false;
    }

    const addr = await tx.address.update({ where: { id: addressId }, data });

    const addressCount = await tx.address.count({ where: { userId: customer.id } });
    const hasDefault = await tx.address.count({ where: { userId: customer.id, isDefault: true } });
    if (addressCount > 0 && hasDefault === 0) {
      const newest = await tx.address.findFirst({
        where: { userId: customer.id },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (newest) {
        await tx.address.update({ where: { id: newest.id }, data: { isDefault: true } });
        if (newest.id === addr.id) return { ...addr, isDefault: true };
      }
    }

    return addr;
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, ctx: { params: Promise<{ addressId: string }> }) {
  const session = await getServerSession(authOptions);
  const email = normalizeEmail(session?.user?.email);
  if (!session?.user || !email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const store = url.searchParams.get("store") ?? "";
  if (!store || !isValidStore(store)) return NextResponse.json({ error: "Invalid store" }, { status: 400 });

  const { addressId } = await ctx.params;

  const customer = await prisma.user.findFirst({
    where: { email },
    select: { id: true },
  });
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const deleted = await prisma.address.deleteMany({ where: { id: addressId, userId: customer.id } });
  if (deleted.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const hasDefault = await prisma.address.count({ where: { userId: customer.id, isDefault: true } });
  if (hasDefault === 0) {
    const newest = await prisma.address.findFirst({
      where: { userId: customer.id },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (newest) {
      await prisma.address.update({ where: { id: newest.id }, data: { isDefault: true } });
    }
  }

  return NextResponse.json({ ok: true });
}

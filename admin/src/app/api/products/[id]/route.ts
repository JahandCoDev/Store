// admin/src/app/api/products/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { cookies } from "next/headers";

import { ensureUniqueProductHandle, normalizeProductHandle } from "@/lib/productHandle";

const VALID_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;
type ProductStatus = (typeof VALID_STATUSES)[number];

function getSelectedShopId(): string | null {
  return cookies().get("shopId")?.value ?? null;
}

async function requireShopAccess(shopId: string) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string; role?: string })?.id;
  const role = (session?.user as { id?: string; role?: string })?.role;
  if (!session || !userId || role !== "ADMIN") return null;

  const membership = await prisma.shopUser.findUnique({
    where: { shopId_userId: { shopId, userId } },
    select: { id: true },
  });
  if (!membership) return null;

  return { userId };
}

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const shopId = getSelectedShopId();
    if (!shopId) return NextResponse.json({ error: "Shop not selected" }, { status: 400 });
    const auth = await requireShopAccess(shopId);
    if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await ctx.params;
    const product = await prisma.product.findFirst({ where: { id, shopId } });
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(product);
  } catch (error) {
    console.error("Failed to fetch product:", error);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const shopId = getSelectedShopId();
    if (!shopId) return NextResponse.json({ error: "Shop not selected" }, { status: 400 });
    const auth = await requireShopAccess(shopId);
    if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));

    const existing = await prisma.product.findFirst({ where: { id, shopId }, select: { id: true, title: true, handle: true } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (typeof body?.title === "string" && body.title.trim()) data.title = body.title.trim();
    if (body?.handle === null) data.handle = null;
    if (typeof body?.handle === "string") {
      const normalized = normalizeProductHandle(body.handle);
      if (!normalized) return NextResponse.json({ error: "Invalid handle" }, { status: 400 });
      data.handle = await ensureUniqueProductHandle({ shopId, base: normalized, excludeProductId: id });
    }
    if (typeof body?.description === "string") data.description = body.description.trim();
    if (typeof body?.status === "string" && VALID_STATUSES.includes(body.status as ProductStatus)) data.status = body.status;
    if (typeof body?.price === "number" && Number.isFinite(body.price)) data.price = body.price;
    if (typeof body?.compareAtPrice === "number") data.compareAtPrice = body.compareAtPrice;
    if (body?.compareAtPrice === null) data.compareAtPrice = null;
    if (typeof body?.cost === "number") data.cost = body.cost;
    if (body?.cost === null) data.cost = null;
    if (typeof body?.inventory === "number" && Number.isInteger(body.inventory)) data.inventory = body.inventory;
    if (typeof body?.sku === "string") data.sku = body.sku.trim() || null;
    if (body?.sku === null) data.sku = null;
    if (typeof body?.barcode === "string") data.barcode = body.barcode.trim() || null;
    if (typeof body?.weight === "number") data.weight = body.weight;
    if (body?.weight === null) data.weight = null;
    if (typeof body?.vendor === "string") data.vendor = body.vendor.trim() || null;
    if (Array.isArray(body?.tags)) data.tags = body.tags;

    // If title changed and handle was never set, generate one.
    if ((data.title as string | undefined) && existing.handle == null && data.handle === undefined) {
      data.handle = await ensureUniqueProductHandle({
        shopId,
        base: String(data.title),
        excludeProductId: id,
      });
    }

    const updated = await prisma.product.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update product:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const shopId = getSelectedShopId();
    if (!shopId) return NextResponse.json({ error: "Shop not selected" }, { status: 400 });
    const auth = await requireShopAccess(shopId);
    if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await ctx.params;
    const deleted = await prisma.product.deleteMany({ where: { id, shopId } });
    if (deleted.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete product:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}

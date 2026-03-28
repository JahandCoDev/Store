import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { resolveShopAccessForRequest } from "@/lib/shopAccess";

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableString(value: unknown) {
  const trimmed = asTrimmedString(value);
  return trimmed ? trimmed : null;
}

function toVariantSummary(variant: {
  id: string;
  title: string;
  size: string | null;
  color: string | null;
  sku: string | null;
  barcode: string | null;
  price: unknown;
  inventory: number;
  trackInventory: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: variant.id,
    title: variant.title,
    size: variant.size,
    color: variant.color,
    sku: variant.sku,
    barcode: variant.barcode,
    price: Number(variant.price),
    inventory: variant.inventory,
    trackInventory: variant.trackInventory,
    createdAt: variant.createdAt,
    updatedAt: variant.updatedAt,
  };
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string; variantId: string }> }) {
  const access = await resolveShopAccessForRequest(req);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { id, variantId } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const existing = await prisma.productVariant.findFirst({
    where: { id: variantId, productId: id },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Variant not found" }, { status: 404 });

  const data: Record<string, unknown> = {};

  if (body?.title !== undefined) data.title = asTrimmedString(body.title);
  if (body?.size !== undefined) data.size = asNullableString(body.size);
  if (body?.color !== undefined) data.color = asNullableString(body.color);
  if (body?.sku !== undefined) data.sku = asNullableString(body.sku);
  if (body?.barcode !== undefined) data.barcode = asNullableString(body.barcode);
  if (body?.trackInventory !== undefined) data.trackInventory = body.trackInventory !== false;

  if (body?.price !== undefined) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: "Price must be a valid non-negative number" }, { status: 400 });
    }
    data.price = price;
  }

  if (body?.inventory !== undefined) {
    const inventory = Number(body.inventory);
    if (!Number.isInteger(inventory) || inventory < 0) {
      return NextResponse.json({ error: "Inventory must be a whole number" }, { status: 400 });
    }
    data.inventory = inventory;
  }

  const updated = await prisma.productVariant.update({
    where: { id: variantId },
    data,
    select: {
      id: true,
      title: true,
      size: true,
      color: true,
      sku: true,
      barcode: true,
      price: true,
      inventory: true,
      trackInventory: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(toVariantSummary(updated));
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string; variantId: string }> }) {
  const access = await resolveShopAccessForRequest(req);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { id, variantId } = await ctx.params;
  const variants = await prisma.productVariant.findMany({
    where: { productId: id },
    select: { id: true },
  });

  if (!variants.some((variant) => variant.id === variantId)) {
    return NextResponse.json({ error: "Variant not found" }, { status: 404 });
  }
  if (variants.length <= 1) {
    return NextResponse.json({ error: "A product must keep at least one variant" }, { status: 400 });
  }

  await prisma.productVariant.delete({ where: { id: variantId } });
  return NextResponse.json({ ok: true });
}
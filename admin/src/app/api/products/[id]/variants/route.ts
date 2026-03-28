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

function buildVariantTitle(productTitle: string, title: unknown, size: string | null, color: string | null) {
  const explicit = asTrimmedString(title);
  if (explicit) return explicit;

  const suffix = [size, color].filter(Boolean).join(" / ");
  return suffix ? `${productTitle} - ${suffix}` : productTitle;
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

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const access = await resolveShopAccessForRequest(req);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { id } = await ctx.params;
  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      handle: true,
      variants: {
        orderBy: { createdAt: "asc" },
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
      },
    },
  });

  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  return NextResponse.json({
    product: { id: product.id, title: product.title, handle: product.handle },
    variants: product.variants.map(toVariantSummary),
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const access = await resolveShopAccessForRequest(req);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      variants: {
        take: 1,
        orderBy: { createdAt: "asc" },
        select: { price: true, compareAtPrice: true, cost: true, weight: true },
      },
    },
  });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const price = Number(body?.price ?? product.variants[0]?.price ?? 0);
  const inventory = Number(body?.inventory ?? 0);
  const size = asNullableString(body?.size);
  const color = asNullableString(body?.color);
  const sku = asNullableString(body?.sku);

  if (!Number.isFinite(price) || price < 0) {
    return NextResponse.json({ error: "Price must be a valid non-negative number" }, { status: 400 });
  }
  if (!Number.isInteger(inventory) || inventory < 0) {
    return NextResponse.json({ error: "Inventory must be a whole number" }, { status: 400 });
  }

  const created = await prisma.productVariant.create({
    data: {
      productId: product.id,
      title: buildVariantTitle(product.title, body?.title, size, color),
      size,
      color,
      sku,
      barcode: asNullableString(body?.barcode),
      price,
      compareAtPrice: product.variants[0]?.compareAtPrice ?? null,
      cost: product.variants[0]?.cost ?? null,
      weight: product.variants[0]?.weight ?? null,
      trackInventory: body?.trackInventory === false ? false : true,
      inventory,
    },
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

  return NextResponse.json(toVariantSummary(created), { status: 201 });
}
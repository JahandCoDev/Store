// admin/src/app/api/products/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { resolveShopAccessForRequest } from "@/lib/shopAccess";

import { ensureUniqueProductHandle, normalizeProductHandle } from "@/lib/productHandle";

const VALID_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;
type ProductStatus = (typeof VALID_STATUSES)[number];

function normalizeImagesInput(images: unknown): Array<string | { url?: string; src?: string }> {
  if (images == null) return [];

  if (Array.isArray(images)) {
    return images
      .map((img) => {
        if (typeof img === "string") return img.trim();
        if (img && typeof img === "object") {
          const maybeUrl = (img as { url?: unknown }).url;
          const maybeSrc = (img as { src?: unknown }).src;
          const value = typeof maybeUrl === "string" ? maybeUrl : typeof maybeSrc === "string" ? maybeSrc : "";
          return value.trim() ? { url: value.trim() } : null;
        }
        return null;
      })
      .filter(Boolean) as Array<string | { url?: string; src?: string }>;
  }

  if (typeof images === "string") {
    return images
      .split(/\r?\n|,/g)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return [];
}

function resolveImagesFromMetadata(metadata: unknown): Array<string | { url?: string; src?: string }> {
  if (!metadata || typeof metadata !== "object") return [];
  const maybeImages = (metadata as { images?: unknown }).images;
  return normalizeImagesInput(maybeImages);
}

function productToApiShape(product: {
  id: string;
  handle: string;
  title: string;
  description: string;
  status: string;
  vendor: string | null;
  tags: string[];
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}, variant: null | {
  id: string;
  price: unknown;
  compareAtPrice: unknown;
  cost: unknown;
  inventory: number;
  sku: string | null;
  barcode: string | null;
  weight: number | null;
}) {
  const images = resolveImagesFromMetadata(product.metadata);

  const toNumber = (value: unknown): number => {
    if (typeof value === "number") return value;
    if (typeof value === "string") return Number(value);
    if (value && typeof value === "object" && "toString" in value) return Number(String(value));
    return 0;
  };

  return {
    id: product.id,
    handle: product.handle,
    title: product.title,
    description: product.description,
    status: product.status,
    vendor: product.vendor,
    tags: product.tags,
    images,
    price: variant ? toNumber(variant.price) : 0,
    compareAtPrice: variant && variant.compareAtPrice != null ? toNumber(variant.compareAtPrice) : null,
    cost: variant && variant.cost != null ? toNumber(variant.cost) : null,
    inventory: variant ? variant.inventory : 0,
    sku: variant?.sku ?? null,
    barcode: variant?.barcode ?? null,
    weight: variant?.weight ?? null,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

async function resolveDefaultVariant(productId: string) {
  return prisma.productVariant.findFirst({
    where: { productId },
    orderBy: { createdAt: "asc" },
  });
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const access = await resolveShopAccessForRequest(req);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const { id } = await ctx.params;
    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        handle: true,
        title: true,
        description: true,
        status: true,
        vendor: true,
        tags: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const variant = await resolveDefaultVariant(product.id);
    return NextResponse.json(productToApiShape(product, variant));
  } catch (error) {
    console.error("Failed to fetch product:", error);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const access = await resolveShopAccessForRequest(req);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));

    const existing = await prisma.product.findUnique({ where: { id }, select: { id: true, title: true, handle: true, metadata: true } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (typeof body?.title === "string" && body.title.trim()) data.title = body.title.trim();
    if (body?.handle === null) data.handle = null;
    if (typeof body?.handle === "string") {
      const normalized = normalizeProductHandle(body.handle);
      if (!normalized) return NextResponse.json({ error: "Invalid handle" }, { status: 400 });
      data.handle = await ensureUniqueProductHandle({ base: normalized, excludeProductId: id });
    }
    if (typeof body?.description === "string") data.description = body.description.trim();
    if (typeof body?.status === "string" && VALID_STATUSES.includes(body.status as ProductStatus)) data.status = body.status;
    if (typeof body?.vendor === "string") data.vendor = body.vendor.trim() || null;
    if (Array.isArray(body?.tags)) data.tags = body.tags;

    const nextImages =
      body?.images === undefined
        ? undefined
        : body?.images === null
          ? []
          : normalizeImagesInput(body.images);

    if (nextImages !== undefined) {
      const existingMeta = existing.metadata && typeof existing.metadata === "object" ? (existing.metadata as Record<string, unknown>) : {};
      data.metadata = { ...existingMeta, images: nextImages };
    }

    // If title changed and handle was "cleared", regenerate a unique handle.
    if ((data.title as string | undefined) && (data.handle === null || data.handle === undefined) && existing.handle) {
      // If the client explicitly set handle=null, generate from (possibly updated) title.
      if (data.handle === null) {
        data.handle = await ensureUniqueProductHandle({ base: String(data.title), excludeProductId: id });
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data,
      select: {
        id: true,
        handle: true,
        title: true,
        description: true,
        status: true,
        vendor: true,
        tags: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const variant = await resolveDefaultVariant(id);
    const variantUpdate: Record<string, unknown> = {};
    if (typeof body?.price === "number" && Number.isFinite(body.price)) variantUpdate.price = body.price;
    if (typeof body?.compareAtPrice === "number") variantUpdate.compareAtPrice = body.compareAtPrice;
    if (body?.compareAtPrice === null) variantUpdate.compareAtPrice = null;
    if (typeof body?.cost === "number") variantUpdate.cost = body.cost;
    if (body?.cost === null) variantUpdate.cost = null;
    if (typeof body?.inventory === "number" && Number.isInteger(body.inventory)) variantUpdate.inventory = body.inventory;
    if (typeof body?.sku === "string") variantUpdate.sku = body.sku.trim() || null;
    if (body?.sku === null) variantUpdate.sku = null;
    if (typeof body?.barcode === "string") variantUpdate.barcode = body.barcode.trim() || null;
    if (typeof body?.weight === "number") variantUpdate.weight = body.weight;
    if (body?.weight === null) variantUpdate.weight = null;

    let updatedVariant = variant;
    if (Object.keys(variantUpdate).length > 0) {
      if (variant) {
        updatedVariant = await prisma.productVariant.update({ where: { id: variant.id }, data: variantUpdate });
      } else {
        updatedVariant = await prisma.productVariant.create({
          data: {
            productId: id,
            title: updatedProduct.title,
            price: typeof body?.price === "number" ? body.price : 0,
            compareAtPrice: typeof body?.compareAtPrice === "number" ? body.compareAtPrice : null,
            cost: typeof body?.cost === "number" ? body.cost : null,
            inventory: typeof body?.inventory === "number" && Number.isInteger(body.inventory) ? body.inventory : 0,
            sku: typeof body?.sku === "string" ? body.sku.trim() || null : null,
            barcode: typeof body?.barcode === "string" ? body.barcode.trim() || null : null,
            weight: typeof body?.weight === "number" ? body.weight : null,
          },
        });
      }
    }

    return NextResponse.json(productToApiShape(updatedProduct, updatedVariant));
  } catch (error) {
    console.error("Failed to update product:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const access = await resolveShopAccessForRequest(req);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const { id } = await ctx.params;

    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete product:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}

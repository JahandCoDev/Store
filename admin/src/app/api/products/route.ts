import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { resolveShopAccessForRequest } from "@/lib/shopAccess";

import { ensureUniqueProductHandle, normalizeProductHandle } from "@/lib/productHandle";

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

async function resolveDefaultVariant(productId: string) {
  return prisma.productVariant.findFirst({
    where: { productId },
    orderBy: { createdAt: "asc" },
  });
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

export async function GET(req: Request) {
  try {
    const access = await resolveShopAccessForRequest(req);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
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

    type ProductRow = (typeof products)[number];

    const productIds = products.map((p: ProductRow) => p.id);
    const variants = await prisma.productVariant.findMany({
      where: { productId: { in: productIds } },
      orderBy: [{ productId: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        productId: true,
        price: true,
        compareAtPrice: true,
        cost: true,
        inventory: true,
        sku: true,
        barcode: true,
        weight: true,
      },
    });

    const firstVariantByProductId = new Map<string, (typeof variants)[number]>();
    for (const v of variants) {
      if (!firstVariantByProductId.has(v.productId)) firstVariantByProductId.set(v.productId, v);
    }

    return NextResponse.json(
      products.map((p: ProductRow) => productToApiShape(p, firstVariantByProductId.get(p.id) ?? null))
    );
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const access = await resolveShopAccessForRequest(req);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const body = await req.json();

    const VALID_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;
    const status = VALID_STATUSES.includes(body?.status) ? body.status : "DRAFT";

    const normalizedHandle = normalizeProductHandle(body?.handle);
    const handle = await ensureUniqueProductHandle({
      base: normalizedHandle ?? String(body.title ?? ""),
    });

    const images = normalizeImagesInput(body?.images);

    const created = await prisma.product.create({
      data: {
        handle,
        title: body.title,
        description: body.description ?? "",
        status,
        vendor: body.vendor ?? null,
        tags: Array.isArray(body.tags) ? body.tags : [],
        metadata: { images },
        variants: {
          create: {
            title: body.title,
            price: body.price,
            compareAtPrice: body.compareAtPrice ?? null,
            cost: body.cost ?? null,
            inventory: body.inventory ?? 0,
            sku: body.sku ?? null,
            barcode: body.barcode ?? null,
            weight: body.weight ?? null,
          },
        },
      },
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

    const variant = await resolveDefaultVariant(created.id);
    return NextResponse.json(productToApiShape(created, variant), { status: 201 });
  } catch (error) {
    console.error("Failed to create product:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}

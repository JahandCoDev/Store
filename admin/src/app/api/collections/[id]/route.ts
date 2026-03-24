import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { getMediaAssetUrl } from "@/lib/mediaStorage";
import { resolveShopAccessForRequest } from "@/lib/shopAccess";

function normalizeUniqueIds(input: unknown) {
  if (!Array.isArray(input)) return [] as string[];
  return [...new Set(input.filter((value): value is string => typeof value === "string" && value.trim().length > 0).map((value) => value.trim()))];
}

function mapCollection(collection: {
  id: string;
  handle: string;
  title: string;
  description: string;
  seoTitle: string | null;
  seoDescription: string | null;
  imageAssetId: string | null;
  isPublished: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  imageAsset: { id: string; storageKey: string; altText: string | null; title: string | null } | null;
  products: Array<{ productId: string; position: number }>;
  _count: { products: number };
}) {
  return {
    ...collection,
    imageUrl: collection.imageAsset ? getMediaAssetUrl(collection.imageAsset.storageKey) : null,
    productIds: collection.products.sort((left, right) => left.position - right.position).map((item) => item.productId),
    productCount: collection._count.products,
  };
}

async function syncCollectionProducts(collectionId: string, productIds: string[]) {
  await prisma.collectionProduct.deleteMany({ where: { collectionId } });
  if (productIds.length === 0) return;

  await prisma.collectionProduct.createMany({
    data: productIds.map((productId, index) => ({ collectionId, productId, position: index })),
  });
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const access = await resolveShopAccessForRequest(req);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { id } = await ctx.params;
  const collection = await prisma.collection.findFirst({
    where: { id, shopId: access.shopId },
    include: {
      imageAsset: { select: { id: true, storageKey: true, altText: true, title: true } },
      products: { select: { productId: true, position: true } },
      _count: { select: { products: true } },
    },
  });

  if (!collection) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ collection: mapCollection(collection) });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const access = await resolveShopAccessForRequest(req);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { id } = await ctx.params;
  const existing = await prisma.collection.findFirst({ where: { id, shopId: access.shopId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: {
    title?: string;
    handle?: string;
    description?: string;
    seoTitle?: string | null;
    seoDescription?: string | null;
    imageAssetId?: string | null;
    isPublished?: boolean;
    sortOrder?: number;
  } = {};

  if (typeof body?.title === "string" && body.title.trim()) data.title = body.title.trim();
  if (typeof body?.handle === "string") {
    const normalized = slugify(body.handle);
    if (!normalized) return NextResponse.json({ error: "Invalid handle" }, { status: 400 });
    data.handle = normalized;
  }
  if (typeof body?.description === "string") data.description = body.description;
  if (typeof body?.seoTitle === "string") data.seoTitle = body.seoTitle.trim() || null;
  if (body?.seoTitle === null) data.seoTitle = null;
  if (typeof body?.seoDescription === "string") data.seoDescription = body.seoDescription.trim() || null;
  if (body?.seoDescription === null) data.seoDescription = null;
  if (typeof body?.imageAssetId === "string") data.imageAssetId = body.imageAssetId.trim() || null;
  if (body?.imageAssetId === null) data.imageAssetId = null;
  if (typeof body?.isPublished === "boolean") data.isPublished = body.isPublished;
  if (typeof body?.sortOrder === "number" && Number.isInteger(body.sortOrder)) data.sortOrder = body.sortOrder;

  await prisma.collection.update({ where: { id }, data });
  if (body?.productIds !== undefined) {
    await syncCollectionProducts(id, normalizeUniqueIds(body.productIds));
  }

  const updated = await prisma.collection.findUniqueOrThrow({
    where: { id },
    include: {
      imageAsset: { select: { id: true, storageKey: true, altText: true, title: true } },
      products: { select: { productId: true, position: true } },
      _count: { select: { products: true } },
    },
  });

  return NextResponse.json({ collection: mapCollection(updated) });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const access = await resolveShopAccessForRequest(req);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { id } = await ctx.params;
  const deleted = await prisma.collection.deleteMany({ where: { id, shopId: access.shopId } });
  if (deleted.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
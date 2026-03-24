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
    data: productIds.map((productId, index) => ({
      collectionId,
      productId,
      position: index,
    })),
  });
}

export async function GET(req: Request) {
  const access = await resolveShopAccessForRequest(req);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const collections = await prisma.collection.findMany({
    where: { shopId: access.shopId },
    include: {
      imageAsset: { select: { id: true, storageKey: true, altText: true, title: true } },
      products: { select: { productId: true, position: true } },
      _count: { select: { products: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });

  return NextResponse.json({ collections: collections.map(mapCollection) });
}

export async function POST(req: Request) {
  const access = await resolveShopAccessForRequest(req);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json().catch(() => ({}));
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const handleInput = typeof body?.handle === "string" ? body.handle.trim() : "";
  const handle = slugify(handleInput || title);
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!handle) return NextResponse.json({ error: "Handle is required" }, { status: 400 });

  const productIds = normalizeUniqueIds(body?.productIds);

  try {
    const collection = await prisma.collection.create({
      data: {
        shopId: access.shopId,
        title,
        handle,
        description: typeof body?.description === "string" ? body.description : "",
        seoTitle: typeof body?.seoTitle === "string" ? body.seoTitle.trim() || null : null,
        seoDescription: typeof body?.seoDescription === "string" ? body.seoDescription.trim() || null : null,
        imageAssetId: typeof body?.imageAssetId === "string" && body.imageAssetId.trim() ? body.imageAssetId : null,
        isPublished: body?.isPublished === true,
        sortOrder: typeof body?.sortOrder === "number" && Number.isInteger(body.sortOrder) ? body.sortOrder : 0,
      },
      include: {
        imageAsset: { select: { id: true, storageKey: true, altText: true, title: true } },
        products: { select: { productId: true, position: true } },
        _count: { select: { products: true } },
      },
    });

    await syncCollectionProducts(collection.id, productIds);
    const hydrated = await prisma.collection.findUniqueOrThrow({
      where: { id: collection.id },
      include: {
        imageAsset: { select: { id: true, storageKey: true, altText: true, title: true } },
        products: { select: { productId: true, position: true } },
        _count: { select: { products: true } },
      },
    });

    return NextResponse.json({ collection: mapCollection(hydrated) }, { status: 201 });
  } catch (error) {
    console.error("Failed to create collection:", error);
    return NextResponse.json({ error: "Failed to create collection" }, { status: 500 });
  }
}
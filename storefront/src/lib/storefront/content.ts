import "server-only";

import prisma from "@/lib/prisma";
import type { StoreKey } from "@/lib/storefront/store";
import { getStoreDisplayName } from "@/lib/storefront/store";

function getMediaUrl(storageKey: string) {
  return `/${storageKey.replace(/^\/+/, "")}`;
}

// ─── Product-list select fragment (shared by collections & featured) ─────────
const productCardSelect = {
  id: true,
  handle: true,
  title: true,
  variants: {
    select: { price: true, compareAtPrice: true, inventory: true, trackInventory: true },
    orderBy: { createdAt: "asc" as const },
  },
  media: {
    select: { asset: { select: { storageKey: true } } },
    orderBy: { position: "asc" as const },
    take: 1,
  },
} as const;

type ProductCardRow = {
  id: string;
  handle: string;
  title: string;
  variants: { price: unknown; compareAtPrice: unknown | null; inventory: number; trackInventory: boolean }[];
  media: { asset: { storageKey: string } }[];
};

function mapProductCard(product: ProductCardRow) {
  const v = product.variants[0];
  const trackedVariants = product.variants.filter((variant) => variant.trackInventory);
  const outOfStock = trackedVariants.length > 0 && trackedVariants.every((variant) => variant.inventory <= 0);
  return {
    id: product.id,
    handle: product.handle,
    title: product.title,
    price: Number(v?.price ?? 0),
    compareAtPrice: v?.compareAtPrice ? Number(v.compareAtPrice) : null,
    imageUrl: product.media[0]?.asset?.storageKey
      ? getMediaUrl(product.media[0].asset.storageKey)
      : null,
    outOfStock,
  };
}

// ─── Shell (header / footer) ─────────────────────────────────────────────────
export async function getStoreShellContent(store: StoreKey) {
  return {
    shopName: getStoreDisplayName(store),
    footerCopy: null as string | null,
    navLinks: [] as Array<{ href: string; label: string }>,
  };
}

// ─── Featured collection payload ─────────────────────────────────────────────
async function getFeaturedCollectionPayload(featuredCollectionId: string | null) {
  if (!featuredCollectionId) return null;

  const collection = await prisma.collection.findUnique({
    where: { id: featuredCollectionId },
    include: {
      imageAsset: { select: { storageKey: true, altText: true, title: true } },
    },
  });

  if (!collection || !collection.isPublished) return null;

  const collectionProducts = await prisma.collectionProduct.findMany({
    where: {
      collectionId: featuredCollectionId,
      product: { status: "ACTIVE" },
    },
    orderBy: { position: "asc" },
    include: {
      product: { select: productCardSelect },
    },
    take: 8,
  });

  return {
    id: collection.id,
    handle: collection.handle,
    title: collection.title,
    description: collection.description,
    imageUrl: collection.imageAsset ? getMediaUrl(collection.imageAsset.storageKey) : null,
    products: collectionProducts.map((entry) => mapProductCard(entry.product as ProductCardRow)),
  };
}

// ─── Homepage (stub — StorefrontPage was removed from schema) ────────────────
export async function getHomepageContent(_store: StoreKey) {
  // StorefrontPage model no longer exists; return null so the fallback UI renders.
  return null;
}

// ─── Page by slug (stub) ─────────────────────────────────────────────────────
export async function getPublishedPageBySlug(_store: StoreKey, _slug: string) {
  return null;
}

// ─── Collection by handle ────────────────────────────────────────────────────
export async function getPublishedCollectionByHandle(_store: StoreKey, handle: string) {
  const collection = await prisma.collection.findFirst({
    where: {
      handle,
      isPublished: true,
    },
    include: {
      imageAsset: { select: { storageKey: true, altText: true, title: true } },
    },
  });

  if (!collection) return null;

  const collectionProducts = await prisma.collectionProduct.findMany({
    where: {
      collectionId: collection.id,
      product: { status: "ACTIVE" },
    },
    include: {
      product: { select: productCardSelect },
    },
    orderBy: { position: "asc" },
  });

  return {
    id: collection.id,
    handle: collection.handle,
    title: collection.title,
    description: collection.description,
    seoTitle: collection.seoTitle,
    seoDescription: collection.seoDescription,
    imageUrl: collection.imageAsset ? getMediaUrl(collection.imageAsset.storageKey) : null,
    products: collectionProducts.map((entry) => mapProductCard(entry.product as ProductCardRow)),
  };
}
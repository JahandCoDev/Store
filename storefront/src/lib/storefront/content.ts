import "server-only";

import prisma from "@/lib/prisma";
import { getProductImageUrls } from "@/lib/storefront/productImages";
import { getStoreDisplayName, resolveShopIdForStore, type StoreKey } from "@/lib/storefront/store";

function getMediaUrl(storageKey: string) {
  return `/${storageKey.replace(/^\/+/, "")}`;
}

function mapProductCard(product: {
  id: string;
  handle: string | null;
  title: string;
  price: number;
  compareAtPrice: number | null;
  images: unknown;
}) {
  return {
    id: product.id,
    handle: product.handle,
    title: product.title,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    imageUrl: getProductImageUrls(product.images as never)[0] ?? null,
  };
}

export async function getStoreShellContent(store: StoreKey) {
  const shopId = resolveShopIdForStore(store);
  if (!shopId) {
    return {
      shopName: getStoreDisplayName(store),
      footerCopy: null as string | null,
      navLinks: [] as Array<{ href: string; label: string }>,
    };
  }

  const [shop, navPages] = await Promise.all([
    prisma.shop.findUnique({
      where: { id: shopId },
      select: { name: true, footerCopy: true },
    }),
    prisma.storefrontPage.findMany({
      where: {
        shopId,
        status: "PUBLISHED",
        showInNavigation: true,
      },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: { slug: true, navLabel: true, title: true },
      take: 8,
    }),
  ]);

  return {
    shopName: shop?.name ?? getStoreDisplayName(store),
    footerCopy: shop?.footerCopy ?? null,
    navLinks: navPages.map((page) => ({
      href: `/${store}/${page.slug}`,
      label: page.navLabel || page.title,
    })),
  };
}

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
      product: {
        select: {
          id: true,
          handle: true,
          title: true,
          price: true,
          compareAtPrice: true,
          images: true,
        },
      },
    },
    take: 8,
  });

  return {
    id: collection.id,
    handle: collection.handle,
    title: collection.title,
    description: collection.description,
    imageUrl: collection.imageAsset ? getMediaUrl(collection.imageAsset.storageKey) : null,
    products: collectionProducts.map((entry) => mapProductCard(entry.product)),
  };
}

function mapStorefrontPage(page: {
  id: string;
  slug: string;
  title: string;
  template: "STANDARD" | "HOME" | "LANDING";
  status: "DRAFT" | "PUBLISHED";
  excerpt: string;
  body: string;
  heroEyebrow: string | null;
  heroTitle: string | null;
  heroBody: string | null;
  heroCtaLabel: string | null;
  heroCtaHref: string | null;
  sections: unknown;
  navLabel: string | null;
  showInNavigation: boolean;
  isHomepage: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  sortOrder: number;
  heroImageAsset: { storageKey: string; altText: string | null; title: string | null } | null;
}, featuredCollection: Awaited<ReturnType<typeof getFeaturedCollectionPayload>>) {
  return {
    ...page,
    heroImageUrl: page.heroImageAsset ? getMediaUrl(page.heroImageAsset.storageKey) : null,
    featuredCollection,
  };
}

export async function getHomepageContent(store: StoreKey) {
  const shopId = resolveShopIdForStore(store);
  if (!shopId) return null;

  const page = await prisma.storefrontPage.findFirst({
    where: {
      shopId,
      status: "PUBLISHED",
      isHomepage: true,
    },
    include: {
      heroImageAsset: { select: { storageKey: true, altText: true, title: true } },
    },
  });

  if (!page) return null;
  const featuredCollection = await getFeaturedCollectionPayload(page.featuredCollectionId);
  return mapStorefrontPage(page as never, featuredCollection);
}

export async function getPublishedPageBySlug(store: StoreKey, slug: string) {
  const shopId = resolveShopIdForStore(store);
  if (!shopId) return null;

  const page = await prisma.storefrontPage.findFirst({
    where: {
      shopId,
      status: "PUBLISHED",
      slug,
    },
    include: {
      heroImageAsset: { select: { storageKey: true, altText: true, title: true } },
    },
  });

  if (!page) return null;
  const featuredCollection = await getFeaturedCollectionPayload(page.featuredCollectionId);
  return mapStorefrontPage(page as never, featuredCollection);
}

export async function getPublishedCollectionByHandle(store: StoreKey, handle: string) {
  const shopId = resolveShopIdForStore(store);
  if (!shopId) return null;

  const collection = await prisma.collection.findFirst({
    where: {
      shopId,
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
      product: {
        select: {
          id: true,
          handle: true,
          title: true,
          price: true,
          compareAtPrice: true,
          images: true,
        },
      },
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
    products: collectionProducts.map((entry) => mapProductCard(entry.product)),
  };
}
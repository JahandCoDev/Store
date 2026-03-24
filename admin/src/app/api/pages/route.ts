import { NextResponse } from "next/server";
import { StorefrontPageStatus, StorefrontPageTemplate } from "@prisma/client";

import prisma from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { getMediaAssetUrl } from "@/lib/mediaStorage";
import { resolveShopAccessForRequest } from "@/lib/shopAccess";

const VALID_TEMPLATES = new Set<StorefrontPageTemplate>(["STANDARD", "HOME", "LANDING"]);
const VALID_STATUSES = new Set<StorefrontPageStatus>(["DRAFT", "PUBLISHED"]);

function normalizeSections(value: unknown) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [] as unknown[];
    }
  }
  return [] as unknown[];
}

function mapPage(page: {
  id: string;
  slug: string;
  title: string;
  template: StorefrontPageTemplate;
  status: StorefrontPageStatus;
  excerpt: string;
  body: string;
  heroEyebrow: string | null;
  heroTitle: string | null;
  heroBody: string | null;
  heroCtaLabel: string | null;
  heroCtaHref: string | null;
  heroImageAssetId: string | null;
  featuredCollectionId: string | null;
  sections: unknown;
  navLabel: string | null;
  showInNavigation: boolean;
  isHomepage: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  heroImageAsset: { id: string; storageKey: string; altText: string | null; title: string | null } | null;
  featuredCollection: { id: string; handle: string; title: string } | null;
}) {
  return {
    ...page,
    heroImageUrl: page.heroImageAsset ? getMediaAssetUrl(page.heroImageAsset.storageKey) : null,
  };
}

async function clearHomepageFlag(shopId: string, excludeId?: string) {
  await prisma.storefrontPage.updateMany({
    where: {
      shopId,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      isHomepage: true,
    },
    data: { isHomepage: false },
  });
}

export async function GET(req: Request) {
  const access = await resolveShopAccessForRequest(req);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const pages = await prisma.storefrontPage.findMany({
    where: { shopId: access.shopId },
    include: {
      heroImageAsset: { select: { id: true, storageKey: true, altText: true, title: true } },
      featuredCollection: { select: { id: true, handle: true, title: true } },
    },
    orderBy: [{ isHomepage: "desc" }, { sortOrder: "asc" }, { title: "asc" }],
  });

  return NextResponse.json({ pages: pages.map(mapPage) });
}

export async function POST(req: Request) {
  const access = await resolveShopAccessForRequest(req);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json().catch(() => ({}));
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const slug = slugify(typeof body?.slug === "string" ? body.slug : title);
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!slug) return NextResponse.json({ error: "Slug is required" }, { status: 400 });

  const template = VALID_TEMPLATES.has(body?.template) ? body.template : "STANDARD";
  const status = VALID_STATUSES.has(body?.status) ? body.status : "DRAFT";
  const isHomepage = body?.isHomepage === true;
  if (isHomepage) await clearHomepageFlag(access.shopId);

  try {
    const created = await prisma.storefrontPage.create({
      data: {
        shopId: access.shopId,
        slug,
        title,
        template,
        status,
        excerpt: typeof body?.excerpt === "string" ? body.excerpt : "",
        body: typeof body?.body === "string" ? body.body : "",
        heroEyebrow: typeof body?.heroEyebrow === "string" ? body.heroEyebrow.trim() || null : null,
        heroTitle: typeof body?.heroTitle === "string" ? body.heroTitle.trim() || null : null,
        heroBody: typeof body?.heroBody === "string" ? body.heroBody : null,
        heroCtaLabel: typeof body?.heroCtaLabel === "string" ? body.heroCtaLabel.trim() || null : null,
        heroCtaHref: typeof body?.heroCtaHref === "string" ? body.heroCtaHref.trim() || null : null,
        heroImageAssetId: typeof body?.heroImageAssetId === "string" && body.heroImageAssetId.trim() ? body.heroImageAssetId : null,
        featuredCollectionId: typeof body?.featuredCollectionId === "string" && body.featuredCollectionId.trim() ? body.featuredCollectionId : null,
        sections: normalizeSections(body?.sections),
        navLabel: typeof body?.navLabel === "string" ? body.navLabel.trim() || null : null,
        showInNavigation: body?.showInNavigation === true,
        isHomepage,
        seoTitle: typeof body?.seoTitle === "string" ? body.seoTitle.trim() || null : null,
        seoDescription: typeof body?.seoDescription === "string" ? body.seoDescription.trim() || null : null,
        sortOrder: typeof body?.sortOrder === "number" && Number.isInteger(body.sortOrder) ? body.sortOrder : 0,
      },
      include: {
        heroImageAsset: { select: { id: true, storageKey: true, altText: true, title: true } },
        featuredCollection: { select: { id: true, handle: true, title: true } },
      },
    });

    return NextResponse.json({ page: mapPage(created) }, { status: 201 });
  } catch (error) {
    console.error("Failed to create storefront page:", error);
    return NextResponse.json({ error: "Failed to create storefront page" }, { status: 500 });
  }
}
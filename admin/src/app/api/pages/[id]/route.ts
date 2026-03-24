import { NextResponse } from "next/server";
import { Prisma, StorefrontPageStatus, StorefrontPageTemplate } from "@prisma/client";

import prisma from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { getMediaAssetUrl } from "@/lib/mediaStorage";
import { resolveShopAccessForRequest } from "@/lib/shopAccess";

const VALID_TEMPLATES = new Set<StorefrontPageTemplate>(["STANDARD", "HOME", "LANDING"]);
const VALID_STATUSES = new Set<StorefrontPageStatus>(["DRAFT", "PUBLISHED"]);

function normalizeSections(value: unknown) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    if (!value.trim()) return [] as unknown[];
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

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const access = await resolveShopAccessForRequest(req);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { id } = await ctx.params;
  const page = await prisma.storefrontPage.findFirst({
    where: { id, shopId: access.shopId },
    include: {
      heroImageAsset: { select: { id: true, storageKey: true, altText: true, title: true } },
      featuredCollection: { select: { id: true, handle: true, title: true } },
    },
  });

  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ page: mapPage(page) });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const access = await resolveShopAccessForRequest(req);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { id } = await ctx.params;
  const existing = await prisma.storefrontPage.findFirst({ where: { id, shopId: access.shopId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const isHomepage = body?.isHomepage === true;
  if (isHomepage) await clearHomepageFlag(access.shopId, id);

  const data: Prisma.StorefrontPageUncheckedUpdateInput = {};

  if (typeof body?.slug === "string") {
    const normalized = slugify(body.slug);
    if (!normalized) return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    data.slug = normalized;
  }
  if (typeof body?.title === "string" && body.title.trim()) data.title = body.title.trim();
  if (VALID_TEMPLATES.has(body?.template)) data.template = body.template;
  if (VALID_STATUSES.has(body?.status)) data.status = body.status;
  if (typeof body?.excerpt === "string") data.excerpt = body.excerpt;
  if (typeof body?.body === "string") data.body = body.body;
  if (typeof body?.heroEyebrow === "string") data.heroEyebrow = body.heroEyebrow.trim() || null;
  if (body?.heroEyebrow === null) data.heroEyebrow = null;
  if (typeof body?.heroTitle === "string") data.heroTitle = body.heroTitle.trim() || null;
  if (body?.heroTitle === null) data.heroTitle = null;
  if (typeof body?.heroBody === "string") data.heroBody = body.heroBody || null;
  if (body?.heroBody === null) data.heroBody = null;
  if (typeof body?.heroCtaLabel === "string") data.heroCtaLabel = body.heroCtaLabel.trim() || null;
  if (body?.heroCtaLabel === null) data.heroCtaLabel = null;
  if (typeof body?.heroCtaHref === "string") data.heroCtaHref = body.heroCtaHref.trim() || null;
  if (body?.heroCtaHref === null) data.heroCtaHref = null;
  if (typeof body?.heroImageAssetId === "string") data.heroImageAssetId = body.heroImageAssetId.trim() || null;
  if (body?.heroImageAssetId === null) data.heroImageAssetId = null;
  if (typeof body?.featuredCollectionId === "string") data.featuredCollectionId = body.featuredCollectionId.trim() || null;
  if (body?.featuredCollectionId === null) data.featuredCollectionId = null;
  if (body?.sections !== undefined) data.sections = normalizeSections(body.sections);
  if (typeof body?.navLabel === "string") data.navLabel = body.navLabel.trim() || null;
  if (body?.navLabel === null) data.navLabel = null;
  if (typeof body?.showInNavigation === "boolean") data.showInNavigation = body.showInNavigation;
  if (typeof body?.isHomepage === "boolean") data.isHomepage = body.isHomepage;
  if (typeof body?.seoTitle === "string") data.seoTitle = body.seoTitle.trim() || null;
  if (body?.seoTitle === null) data.seoTitle = null;
  if (typeof body?.seoDescription === "string") data.seoDescription = body.seoDescription.trim() || null;
  if (body?.seoDescription === null) data.seoDescription = null;
  if (typeof body?.sortOrder === "number" && Number.isInteger(body.sortOrder)) data.sortOrder = body.sortOrder;

  await prisma.storefrontPage.update({ where: { id }, data });

  const updated = await prisma.storefrontPage.findUniqueOrThrow({
    where: { id },
    include: {
      heroImageAsset: { select: { id: true, storageKey: true, altText: true, title: true } },
      featuredCollection: { select: { id: true, handle: true, title: true } },
    },
  });

  return NextResponse.json({ page: mapPage(updated) });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const access = await resolveShopAccessForRequest(req);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { id } = await ctx.params;
  const deleted = await prisma.storefrontPage.deleteMany({ where: { id, shopId: access.shopId } });
  if (deleted.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
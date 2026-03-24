import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { deleteStoredAsset, getMediaAssetUrl } from "@/lib/mediaStorage";
import { resolveShopAccessForRequest } from "@/lib/shopAccess";

function mapAsset(asset: {
  id: string;
  title: string | null;
  altText: string | null;
  originalFilename: string;
  mimeType: string;
  storageKey: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...asset,
    url: getMediaAssetUrl(asset.storageKey),
  };
}

function normalizeTags(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0).map((tag) => tag.trim());
  }

  if (typeof value === "string") {
    return value.split(",").map((tag) => tag.trim()).filter(Boolean);
  }

  return [] as string[];
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const access = await resolveShopAccessForRequest(req);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { id } = await ctx.params;
  const existing = await prisma.mediaAsset.findFirst({ where: { id, shopId: access.shopId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const updated = await prisma.mediaAsset.update({
    where: { id },
    data: {
      title: typeof body?.title === "string" ? body.title.trim() || null : undefined,
      altText: typeof body?.altText === "string" ? body.altText.trim() || null : undefined,
      tags: body?.tags !== undefined ? normalizeTags(body.tags) : undefined,
    },
  });

  return NextResponse.json({ asset: mapAsset(updated) });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const access = await resolveShopAccessForRequest(req);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { id } = await ctx.params;
  const existing = await prisma.mediaAsset.findFirst({ where: { id, shopId: access.shopId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const usageCount = await prisma.$transaction(async (tx) => {
    const [collections, heroPages] = await Promise.all([
      tx.collection.count({ where: { imageAssetId: id } }),
      tx.storefrontPage.count({ where: { heroImageAssetId: id } }),
    ]);
    return collections + heroPages;
  });

  if (usageCount > 0) {
    return NextResponse.json({ error: "This asset is still referenced by storefront content" }, { status: 409 });
  }

  await prisma.mediaAsset.delete({ where: { id } });
  await deleteStoredAsset(existing.storageKey);
  return NextResponse.json({ ok: true });
}
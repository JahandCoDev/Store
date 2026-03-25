import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { getMediaAssetUrl, importProjectProductImage, listProjectProductImages, storeImageUpload } from "@/lib/mediaStorage";
import { resolveShopAccessForRequest } from "@/lib/shopAccess";

function normalizeTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

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
}) {
  return {
    ...asset,
    url: getMediaAssetUrl(asset.storageKey),
  };
}

export async function GET(req: Request) {
  const access = await resolveShopAccessForRequest(req);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const includeProjectImages = searchParams.get("includeProjectImages") === "1";

  const assets = await prisma.mediaAsset.findMany({
    where: {
      shopId: access.shopId,
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { altText: { contains: query, mode: "insensitive" } },
              { originalFilename: { contains: query, mode: "insensitive" } },
              { tags: { has: query } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const projectImages = includeProjectImages ? await listProjectProductImages() : [];

  return NextResponse.json({ assets: assets.map(mapAsset), projectImages });
}

export async function POST(req: Request) {
  const access = await resolveShopAccessForRequest(req);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const formData = await req.formData();
  const projectImageFilename = String(formData.get("importProjectImage") ?? "").trim();

  if (projectImageFilename) {
    try {
      const stored = await importProjectProductImage(access.shopId, projectImageFilename);
      const asset = await prisma.mediaAsset.create({
        data: {
          shopId: access.shopId,
          title: String(formData.get("title") ?? "").trim() || null,
          altText: String(formData.get("altText") ?? "").trim() || null,
          originalFilename: stored.originalFilename,
          mimeType: stored.mimeType,
          storageKey: stored.storageKey,
          sizeBytes: stored.sizeBytes,
          tags: normalizeTags(String(formData.get("tags") ?? "project-image")),
        },
      });

      return NextResponse.json({ asset: mapAsset(asset) }, { status: 201 });
    } catch (error) {
      console.error("Failed to import project image:", error);
      return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to import project image" }, { status: 500 });
    }
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const title = String(formData.get("title") ?? "").trim() || null;
  const altText = String(formData.get("altText") ?? "").trim() || null;
  const tags = normalizeTags(String(formData.get("tags") ?? ""));

  try {
    const stored = await storeImageUpload(access.shopId, file);
    const asset = await prisma.mediaAsset.create({
      data: {
        shopId: access.shopId,
        title,
        altText,
        originalFilename: stored.originalFilename,
        mimeType: stored.mimeType,
        storageKey: stored.storageKey,
        sizeBytes: stored.sizeBytes,
        tags,
      },
    });

    return NextResponse.json({ asset: mapAsset(asset) }, { status: 201 });
  } catch (error) {
    console.error("Failed to upload media asset:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to upload media asset" }, { status: 500 });
  }
}
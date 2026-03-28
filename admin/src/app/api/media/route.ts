import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { importProjectProductImage, listProjectProductImages } from "../../../lib/mediaStorage";
import { getObjectStorageConfig, getS3Client, publicObjectUrl } from "@/lib/objectStorage";
import { Upload } from "@aws-sdk/lib-storage";
import type { PutObjectCommandInput } from "@aws-sdk/client-s3";
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
    url: publicObjectUrl(asset.storageKey),
  };
}

function sanitizeFilename(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 120);
}

export async function GET(req: Request) {
  const access = await resolveShopAccessForRequest(req);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const includeProjectImages = searchParams.get("includeProjectImages") === "1";

  const assets = await prisma.mediaAsset.findMany({
    where: {
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
      const stored = await importProjectProductImage({ filename: projectImageFilename });

      if (!stored.ok) {
        return NextResponse.json({ error: stored.error }, { status: 400 });
      }

      const asset = await prisma.mediaAsset.create({
        data: {
          title: String(formData.get("title") ?? "").trim() || null,
          altText: String(formData.get("altText") ?? "").trim() || null,
          originalFilename: projectImageFilename,
          mimeType: "application/octet-stream",
          storageKey: stored.storageKey,
          sizeBytes: 0,
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
    const cfg = getObjectStorageConfig();
    const s3 = getS3Client();

    const bytes = Buffer.from(await file.arrayBuffer());
    const originalFilename = file.name || "upload";
    const safeName = sanitizeFilename(originalFilename);
    const now = new Date();
    const yyyy = String(now.getUTCFullYear());
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    const key = `uploads/${yyyy}/${mm}/${crypto.randomUUID()}-${safeName}`;

    const input: PutObjectCommandInput = {
      Bucket: cfg.bucket,
      Key: key,
      Body: bytes,
      ContentType: file.type || "application/octet-stream",
      ACL: "public-read",
      Metadata: {
        originalfilename: originalFilename,
      },
    };

    await new Upload({ client: s3, params: input }).done();

    const asset = await prisma.mediaAsset.create({
      data: {
        title,
        altText,
        originalFilename,
        mimeType: file.type || "application/octet-stream",
        storageKey: key,
        sizeBytes: bytes.byteLength,
        tags,
      },
    });

    return NextResponse.json({ asset: mapAsset(asset) }, { status: 201 });
  } catch (error) {
    console.error("Failed to upload media asset:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to upload media asset" }, { status: 500 });
  }
}
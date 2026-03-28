import { NextResponse } from "next/server";
import { Upload } from "@aws-sdk/lib-storage";
import { PutObjectCommandInput } from "@aws-sdk/client-s3";
import prisma from "@/lib/prisma";
import { getObjectStorageConfig, getS3Client, publicObjectUrl } from "@/lib/objectStorage";

function sanitizeFilename(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 120);
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

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
        kind: file.type.startsWith("image/") ? "IMAGE" : "DOCUMENT",
        originalFilename,
        mimeType: file.type || "application/octet-stream",
        storageKey: key,
        sizeBytes: bytes.length,
      },
      select: {
        id: true,
        storageKey: true,
      },
    });

    return NextResponse.json({
      id: asset.id,
      storageKey: asset.storageKey,
      url: publicObjectUrl(asset.storageKey),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

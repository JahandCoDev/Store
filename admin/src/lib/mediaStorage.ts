import { getObjectStorageConfig, getS3Client, publicObjectUrl } from "@/lib/objectStorage";
import { ListObjectsV2Command, HeadObjectCommand } from "@aws-sdk/client-s3";

export function getMediaAssetUrl(storageKey: string | null | undefined): string | null {
  if (!storageKey) return null;
  return publicObjectUrl(storageKey);
}

export async function listProjectProductImages(): Promise<
  Array<{
    filename: string;
    originalFilename: string;
    storageKey: string;
    url: string;
    sizeBytes: number;
  }>
> {
  const cfg = getObjectStorageConfig();
  const s3 = getS3Client();

  try {
    const data = await s3.send(
      new ListObjectsV2Command({
        Bucket: cfg.bucket,
        Prefix: "product-images/",
      })
    );

    const objects = data.Contents || [];
    return objects
      .filter((obj) => obj.Key && obj.Key !== "product-images/") // Exclude the directory itself
      .map((obj) => {
        const filename = obj.Key!.split("/").pop()!;
        return {
          filename,
          originalFilename: filename,
          storageKey: obj.Key!,
          url: publicObjectUrl(obj.Key!),
          sizeBytes: obj.Size || 0,
        };
      });
  } catch (err) {
    console.error("Failed to list S3 product-images:", err);
    return [];
  }
}

export async function importProjectProductImage(args: {
  filename: string;
}): Promise<
  | {
      ok: true;
      storageKey: string;
    }
  | {
      ok: false;
      error: string;
    }
> {
  const cfg = getObjectStorageConfig();
  const s3 = getS3Client();
  const storageKey = `product-images/${args.filename}`;

  try {
    await s3.send(
      new HeadObjectCommand({
        Bucket: cfg.bucket,
        Key: storageKey,
      })
    );

    return {
      ok: true,
      storageKey,
    };
  } catch (err: unknown) {
    const error = err as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return { ok: false, error: "Image not found in S3 bucket." };
    }
    console.error("Failed verifying S3 image import:", err);
    return { ok: false, error: "Failed to import project image" };
  }
}

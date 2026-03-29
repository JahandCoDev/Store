import "server-only";

import { ListObjectsV2Command } from "@aws-sdk/client-s3";

import { getObjectStorageConfig, getS3Client } from "@/lib/objectStorage";

const HERO_IMAGE_PREFIXES = ["product-images/", "Product_Images/"];
const IMAGE_KEY_PATTERN = /\.(avif|gif|jpe?g|png|webp)$/i;

type HeroImageObject = {
  key: string;
  lastModified: number;
};

function isImageKey(key: string) {
  return IMAGE_KEY_PATTERN.test(key);
}

export async function listHomepageHeroStorageKeys(limit = 10): Promise<string[]> {
  let bucket: string;
  let s3: ReturnType<typeof getS3Client>;

  try {
    bucket = getObjectStorageConfig().bucket;
    s3 = getS3Client();
  } catch {
    return [];
  }

  const objects: HeroImageObject[] = [];

  try {
    for (const prefix of HERO_IMAGE_PREFIXES) {
      let continuationToken: string | undefined;

      do {
        const response = await s3.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: prefix,
            ContinuationToken: continuationToken,
            MaxKeys: Math.max(limit * 3, 25),
          })
        );

        for (const entry of response.Contents ?? []) {
          const key = entry.Key;
          if (!key || key === prefix || !isImageKey(key)) continue;

          objects.push({
            key,
            lastModified: entry.LastModified?.getTime() ?? 0,
          });
        }

        continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;

        if (objects.length >= limit * 4) {
          continuationToken = undefined;
        }
      } while (continuationToken);
    }
  } catch (error) {
    console.error("Failed to list homepage hero images from object storage:", error);
    return [];
  }

  const uniqueKeys = new Set<string>();

  return objects
    .sort((left, right) => right.lastModified - left.lastModified || left.key.localeCompare(right.key))
    .map((entry) => entry.key)
    .filter((key) => {
      if (uniqueKeys.has(key)) return false;
      uniqueKeys.add(key);
      return true;
    })
    .slice(0, limit);
}
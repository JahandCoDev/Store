import type { Prisma } from "@prisma/client";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Normalizes the `Product.images` JSON field into an ordered list of URL strings.
 *
 * Accepts:
 * - string[]
 * - { url: string }[]
 * - { src: string }[]
 */
export function getProductImageUrls(images: Prisma.JsonValue): string[] {
  if (!images) return [];

  if (Array.isArray(images)) {
    const urls: string[] = [];
    for (const item of images) {
      if (typeof item === "string") {
        const url = item.trim();
        if (url) urls.push(url);
        continue;
      }

      if (isRecord(item)) {
        const urlCandidate =
          (typeof item.url === "string" ? item.url : null) ??
          (typeof item.src === "string" ? item.src : null);
        const url = urlCandidate?.trim();
        if (url) urls.push(url);
      }
    }
    return urls;
  }

  if (typeof images === "string") {
    const url = images.trim();
    return url ? [url] : [];
  }

  return [];
}

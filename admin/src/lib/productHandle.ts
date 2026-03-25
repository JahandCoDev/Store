import prisma from "@/lib/prisma";
import { slugify } from "@/lib/slug";

export function normalizeProductHandle(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = slugify(raw);
  return s.length ? s : null;
}

export async function ensureUniqueProductHandle(args: {
  base: string;
  excludeProductId?: string;
}): Promise<string> {
  const baseSlug = slugify(args.base) || "product";

  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;

    const existing = await prisma.product.findFirst({
      where: {
        handle: candidate,
        ...(args.excludeProductId ? { NOT: { id: args.excludeProductId } } : {}),
      },
      select: { id: true },
    });

    if (!existing) return candidate;
  }

  // Extremely unlikely; fall back to a unique-ish suffix.
  return `${baseSlug}-${Date.now().toString(36)}`;
}

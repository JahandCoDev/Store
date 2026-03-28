import type { PrismaClient } from "../../generated/prisma/client";

type DisplayIdClient = Pick<PrismaClient, "user">;

type Input = {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

function normalizeEmail(email: unknown): string {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function slugPart(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function nextAvailableDisplayId(prisma: DisplayIdClient, base: string): Promise<string> {
  const existing = await prisma.user.findMany({
    where: {
      OR: [{ displayId: base }, { displayId: { startsWith: `${base}-` } }],
    },
    select: { displayId: true },
  });

  const used = new Set(existing.map((row) => row.displayId));
  if (!used.has(base)) return base;

  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) {
    suffix += 1;
  }

  return `${base}-${suffix}`;
}

export async function generateUserDisplayId(prisma: DisplayIdClient, input: Input): Promise<string> {
  const safeFirst = slugPart(input.firstName);
  const safeLast = slugPart(input.lastName);

  const email = normalizeEmail(input.email);
  const emailLocal = email.includes("@") ? email.split("@")[0] : "";
  const safeEmailLocal = slugPart(emailLocal);

  const base = [safeFirst, safeLast].filter(Boolean).join("-") || safeEmailLocal || "user";
  return nextAvailableDisplayId(prisma, base);
}

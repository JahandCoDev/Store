import type { PrismaClient } from "../../generated/prisma/client";

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
  return value.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

async function nextDisplayIdSuffix(prisma: PrismaClient): Promise<string> {
  const rows = await prisma.$queryRaw<Array<{ n: unknown }>>`
    SELECT nextval('"User_displayId_seq"') AS n
  `;
  const nextVal = rows?.[0]?.n;
  const asString = typeof nextVal === "bigint" ? nextVal.toString() : String(nextVal);
  return asString.padStart(6, "0");
}

export async function generateUserDisplayId(prisma: PrismaClient, input: Input): Promise<string> {
  const safeFirst = slugPart(input.firstName);
  const safeLast = slugPart(input.lastName);

  const email = normalizeEmail(input.email);
  const emailLocal = email.includes("@") ? email.split("@")[0] : "";
  const safeEmailLocal = slugPart(emailLocal);

  const base = [safeFirst, safeLast].filter(Boolean).join("-") || safeEmailLocal || "user";

  let suffix: string;
  try {
    suffix = await nextDisplayIdSuffix(prisma);
  } catch {
    suffix = Math.random().toString(36).slice(2, 8);
  }

  return `${base}-${suffix}`;
}

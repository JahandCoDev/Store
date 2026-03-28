import { hash } from "bcryptjs";

import { PrismaClient } from "../generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run prisma seed");
}

type PrismaPgPool = ConstructorParameters<typeof PrismaPg>[0];
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool as unknown as PrismaPgPool);
const prisma = new PrismaClient({ adapter });

type DisplayIdInput = {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

function slugPart(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function nextAvailableDisplayId(base: string): Promise<string> {
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

async function generateUserDisplayId(input: DisplayIdInput): Promise<string> {
  const safeFirst = slugPart(input.firstName);
  const safeLast = slugPart(input.lastName);

  const email = normalizeEmail(input.email);
  const emailLocal = email.includes("@") ? email.split("@")[0] : "";
  const safeEmailLocal = slugPart(emailLocal);

  const base = [safeFirst, safeLast].filter(Boolean).join("-") || safeEmailLocal || "user";
  return nextAvailableDisplayId(base);
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`${name} is required`);
  }
  return value.trim();
}

function optionalEnv(name: string): string | null {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : null;
}

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

async function main() {
  const email = normalizeEmail(requiredEnv("ADMIN_EMAIL"));
  const password = requiredEnv("ADMIN_PASSWORD");
  const firstName = optionalEnv("ADMIN_FIRST_NAME");
  const lastName = optionalEnv("ADMIN_LAST_NAME");

  const passwordHash = await hash(password, 10);
  const displayId = await generateUserDisplayId({ email, firstName, lastName });

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      displayId,
      firstName,
      lastName,
      role: "ADMIN",
      password: passwordHash,
    },
    update: {
      displayId,
      firstName,
      lastName,
      role: "ADMIN",
      password: passwordHash,
    },
    select: { id: true, email: true, role: true, displayId: true },
  });

  console.log(`Seeded admin: ${user.email} (id=${user.id}, displayId=${user.displayId})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
    await pool.end().catch(() => undefined);
  });

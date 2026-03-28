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
  return value.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

async function nextDisplayIdSuffix(): Promise<string> {
  const rows = await prisma.$queryRaw<Array<{ n: unknown }>>`
    SELECT nextval('"User_displayId_seq"') AS n
  `;
  const nextVal = rows?.[0]?.n;
  const asString = typeof nextVal === "bigint" ? nextVal.toString() : String(nextVal);
  return asString.padStart(6, "0");
}

async function generateUserDisplayId(input: DisplayIdInput): Promise<string> {
  const safeFirst = slugPart(input.firstName);
  const safeLast = slugPart(input.lastName);

  const email = normalizeEmail(input.email);
  const emailLocal = email.includes("@") ? email.split("@")[0] : "";
  const safeEmailLocal = slugPart(emailLocal);

  const base = [safeFirst, safeLast].filter(Boolean).join("-") || safeEmailLocal || "user";

  let suffix: string;
  try {
    suffix = await nextDisplayIdSuffix();
  } catch {
    suffix = Math.random().toString(36).slice(2, 8);
  }

  return `${base}-${suffix}`;
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

async function ensureDisplayIdSequence() {
  await prisma.$executeRawUnsafe('CREATE SEQUENCE IF NOT EXISTS "User_displayId_seq"');

  // If the table/column doesn't exist yet, we'll just leave the sequence at its default start.
  const tableExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT to_regclass('"User"') IS NOT NULL AS exists
  `;
  if (!tableExists?.[0]?.exists) return;

  const colExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS(
      SELECT 1
      FROM pg_attribute
      WHERE attrelid = '"User"'::regclass
        AND attname = 'displayId'
        AND NOT attisdropped
    ) AS exists
  `;
  if (!colExists?.[0]?.exists) return;

  const rows = await prisma.$queryRaw<Array<{ max_val: unknown }>>`
    SELECT MAX((regexp_match("displayId", '^u-(\\d+)$'))[1]::BIGINT) AS max_val
    FROM "User"
    WHERE "displayId" ~ '^u-\\d+$'
  `;

  const maxVal = rows?.[0]?.max_val;
  if (typeof maxVal === "bigint") {
    await prisma.$executeRawUnsafe(`SELECT setval('"User_displayId_seq"', ${maxVal.toString()})`);
  }
}

async function main() {
  const email = normalizeEmail(requiredEnv("ADMIN_EMAIL"));
  const password = requiredEnv("ADMIN_PASSWORD");
  const firstName = optionalEnv("ADMIN_FIRST_NAME");
  const lastName = optionalEnv("ADMIN_LAST_NAME");

  await ensureDisplayIdSequence();

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

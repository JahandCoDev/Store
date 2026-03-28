import { hash } from "bcryptjs";

import prisma from "../src/lib/prisma";
import { generateUserDisplayId } from "../src/lib/displayId";

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
  const displayId = await generateUserDisplayId(prisma, { email, firstName, lastName });

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
  });

import "dotenv/config";
import { hashSync } from "bcryptjs";
import prisma from "../src/lib/prisma.ts";

function usage(): never {
  console.error(
    [
      "Usage:",
      "  npm run admin:create -- <email> <password>",
      "",
      "Or set env vars:",
      "  ADMIN_EMAIL=...",
      "  ADMIN_PASSWORD=...   (plain text; dev only)",
      "  ADMIN_PASSWORD_HASH=... (bcrypt hash)",
    ].join("\n")
  );
  process.exit(2);
}

function getArg(index: number): string | undefined {
  const v = process.argv[index];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Export DATABASE_URL (or add a .env) before running this script.");
  }

  const email = getArg(2) ?? (process.env.ADMIN_EMAIL?.trim() || undefined);
  const password = getArg(3) ?? (process.env.ADMIN_PASSWORD?.trim() || undefined);
  const passwordHashEnv = process.env.ADMIN_PASSWORD_HASH?.trim() || undefined;

  if (!email) usage();

  const passwordHash = password ? hashSync(password, 10) : passwordHashEnv;
  if (!passwordHash) usage();

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: "Admin",
      role: "ADMIN",
      password: passwordHash,
    },
    update: {
      name: "Admin",
      role: "ADMIN",
      password: passwordHash,
    },
    select: { id: true, email: true, role: true },
  });

  console.log(JSON.stringify({ createdOrUpdated: true, user }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

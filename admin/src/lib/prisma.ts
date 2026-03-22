import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { existsSync } from "fs";

function resolveConnectionString(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    const isBuildTime =
      process.env.npm_lifecycle_event === "build" ||
      process.env.NEXT_PHASE === "phase-production-build";
    if (isBuildTime) {
      return "postgresql://postgres:postgres@localhost:5432/postgres?schema=public";
    }

    throw new Error(
      "DATABASE_URL is not set. Set it in your shell/env (or .env.local) so Admin can connect to Postgres."
    );
  }

  if (process.env.NODE_ENV !== "production" && !existsSync("/.dockerenv")) {
    try {
      const url = new URL(raw);
      if (url.hostname === "base") {
        url.hostname = "localhost";
        return url.toString();
      }
    } catch {
      // fall back to raw
    }
  }

  return raw;
}

const connectionString = resolveConnectionString();
const pool = new Pool({ connectionString });
type PrismaPgPool = ConstructorParameters<typeof PrismaPg>[0];
const adapter = new PrismaPg(pool as unknown as PrismaPgPool);

declare global {
  var prisma: PrismaClient | undefined;
}

const prisma = global.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") global.prisma = prisma;

export default prisma;

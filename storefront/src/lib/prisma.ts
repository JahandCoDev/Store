import { PrismaClient } from "../../../admin/generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { existsSync } from "fs";

function resolveConnectionString(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    // Next.js builds (and Docker image builds) often run without runtime secrets.
    // We only need a syntactically valid URL at build-time so module import doesn't crash.
    const isBuildTime =
      process.env.npm_lifecycle_event === "build" ||
      process.env.NEXT_PHASE === "phase-production-build";
    if (isBuildTime) {
      return "postgresql://postgres:postgres@localhost:5432/postgres?schema=public";
    }

    throw new Error(
      "DATABASE_URL is not set. Set it in your shell/env (or .env.local) so Storefront can connect to Postgres."
    );
  }

  // If you're running Next.js on the host machine but your DATABASE_URL points at a
  // Docker-only hostname (common: 'base'), DNS resolution will fail (EAI_AGAIN base).
  // In development, rewrite to localhost when not running inside Docker.
  if (process.env.NODE_ENV !== "production" && !existsSync("/.dockerenv")) {
    try {
      const url = new URL(raw);
      if (url.hostname === "base") {
        url.hostname = "localhost";
        return url.toString();
      }
    } catch {
      // If parsing fails, fall back to raw.
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

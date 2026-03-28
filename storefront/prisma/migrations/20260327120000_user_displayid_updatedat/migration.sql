-- Add displayId and ensure updatedAt has a safe default/backfill
-- This migration is written to be safe on existing databases created via `db push`.

-- Ensure columns exist
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "displayId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);

-- Ensure sequence exists for sequence-backed displayId defaults
DO $$
BEGIN
  CREATE SEQUENCE IF NOT EXISTS "User_displayId_seq";
END $$;

-- Backfill existing rows
UPDATE "User"
SET "displayId" = ('u-' || lpad(nextval('\"User_displayId_seq\"'::regclass)::text, 8, '0'))
WHERE "displayId" IS NULL;

UPDATE "User"
SET "updatedAt" = CURRENT_TIMESTAMP
WHERE "updatedAt" IS NULL;

-- Enforce constraints/defaults
ALTER TABLE "User" ALTER COLUMN "displayId" SET DEFAULT ('u-' || lpad(nextval('\"User_displayId_seq\"'::regclass)::text, 8, '0'));
ALTER TABLE "User" ALTER COLUMN "displayId" SET NOT NULL;

ALTER TABLE "User" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "User" ALTER COLUMN "updatedAt" SET NOT NULL;

-- Add unique index for displayId (matches Prisma @unique)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = current_schema()
      AND indexname = 'User_displayId_key'
  ) THEN
    CREATE UNIQUE INDEX "User_displayId_key" ON "User"("displayId");
  END IF;
END $$;

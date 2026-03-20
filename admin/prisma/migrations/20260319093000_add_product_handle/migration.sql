-- Migration: add_product_handle
-- Adds Product.handle and backfills it for existing rows.

ALTER TABLE "Product"
  ADD COLUMN "handle" TEXT;

-- Backfill: stable slug from title + suffix from id to avoid collisions.
WITH base AS (
  SELECT
    "id",
    COALESCE(
      NULLIF(
        trim(both '-' from regexp_replace(lower(coalesce("title", '')), '[^a-z0-9]+', '-', 'g')),
        ''
      ),
      'product'
    ) AS slug
  FROM "Product"
)
UPDATE "Product" p
SET "handle" = base.slug || '-' || right(p."id", 6)
FROM base
WHERE p."id" = base."id" AND p."handle" IS NULL;

-- Enforce uniqueness per shop (NULLs are allowed).
CREATE UNIQUE INDEX "Product_shopId_handle_key" ON "Product"("shopId", "handle");

CREATE INDEX "Product_handle_idx" ON "Product"("handle");

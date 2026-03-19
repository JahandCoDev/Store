-- Migration: extend_schema
-- Adds new enums, columns, and tables for the full platform spec.
-- Applied after: 20260317094500_init

-- ─── New Enums ────────────────────────────────────────────────────────────────

CREATE TYPE "ProductStatus"  AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "PrintJobStatus" AS ENUM ('QUEUED', 'PRINTING', 'DONE', 'FAILED');
CREATE TYPE "MetaFieldType"  AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN', 'DATE', 'JSON', 'URL');
CREATE TYPE "MetaAppliesTo"  AS ENUM ('PRODUCT', 'ORDER', 'CUSTOMER');

-- ─── Extend: Shop (branding + contact) ───────────────────────────────────────

ALTER TABLE "Shop"
  ADD COLUMN "logoUrl"      TEXT,
  ADD COLUMN "addressLine1" TEXT,
  ADD COLUMN "addressLine2" TEXT,
  ADD COLUMN "city"         TEXT,
  ADD COLUMN "state"        TEXT,
  ADD COLUMN "zip"          TEXT,
  ADD COLUMN "country"      TEXT NOT NULL DEFAULT 'US',
  ADD COLUMN "phone"        TEXT,
  ADD COLUMN "email"        TEXT,
  ADD COLUMN "accentColor"  TEXT NOT NULL DEFAULT '#1a1a2e',
  ADD COLUMN "footerCopy"   TEXT,
  ADD COLUMN "invoiceNotes" TEXT;

-- ─── Extend: Product ─────────────────────────────────────────────────────────

ALTER TABLE "Product"
  ADD COLUMN "status"        TEXT NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "images"        JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "compareAtPrice" DOUBLE PRECISION,
  ADD COLUMN "cost"          DOUBLE PRECISION,
  ADD COLUMN "sku"           TEXT,
  ADD COLUMN "barcode"       TEXT,
  ADD COLUMN "weight"        DOUBLE PRECISION,
  ADD COLUMN "vendor"        TEXT,
  ADD COLUMN "tags"          TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Convert status column to the new enum
ALTER TABLE "Product"
  ALTER COLUMN "status" TYPE "ProductStatus" USING "status"::"ProductStatus";

-- ─── Extend: Order ───────────────────────────────────────────────────────────

ALTER TABLE "Order"
  ADD COLUMN "currency"       TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN "subtotal"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "taxAmount"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "shippingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "note"           TEXT;

-- ─── New Table: Fulfillment ───────────────────────────────────────────────────

CREATE TABLE "Fulfillment" (
    "id"             TEXT NOT NULL,
    "orderId"        TEXT NOT NULL,
    "trackingNumber" TEXT,
    "carrier"        TEXT,
    "shippedAt"      TIMESTAMP(3),
    "deliveredAt"    TIMESTAMP(3),
    "notes"          TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fulfillment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Fulfillment_orderId_key" ON "Fulfillment"("orderId");

ALTER TABLE "Fulfillment"
  ADD CONSTRAINT "Fulfillment_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── New Table: InventoryAdjustment ──────────────────────────────────────────

CREATE TABLE "InventoryAdjustment" (
    "id"          TEXT NOT NULL,
    "productId"   TEXT NOT NULL,
    "shopId"      TEXT NOT NULL,
    "delta"       INTEGER NOT NULL,
    "reason"      TEXT,
    "createdById" TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryAdjustment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InventoryAdjustment_productId_idx" ON "InventoryAdjustment"("productId");
CREATE INDEX "InventoryAdjustment_shopId_idx"    ON "InventoryAdjustment"("shopId");

ALTER TABLE "InventoryAdjustment"
  ADD CONSTRAINT "InventoryAdjustment_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InventoryAdjustment"
  ADD CONSTRAINT "InventoryAdjustment_shopId_fkey"
  FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── New Table: MetaDefinition ────────────────────────────────────────────────

CREATE TABLE "MetaDefinition" (
    "id"          TEXT NOT NULL,
    "shopId"      TEXT NOT NULL,
    "namespace"   TEXT NOT NULL,
    "key"         TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "type"        "MetaFieldType" NOT NULL DEFAULT 'TEXT',
    "appliesTo"   "MetaAppliesTo" NOT NULL,
    "required"    BOOLEAN NOT NULL DEFAULT false,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaDefinition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MetaDefinition_shopId_namespace_key_appliesTo_key"
  ON "MetaDefinition"("shopId", "namespace", "key", "appliesTo");

CREATE INDEX "MetaDefinition_shopId_appliesTo_idx"
  ON "MetaDefinition"("shopId", "appliesTo");

ALTER TABLE "MetaDefinition"
  ADD CONSTRAINT "MetaDefinition_shopId_fkey"
  FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── New Table: MetaValue ─────────────────────────────────────────────────────

CREATE TABLE "MetaValue" (
    "id"           TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "entityType"   "MetaAppliesTo" NOT NULL,
    "entityId"     TEXT NOT NULL,
    "jsonValue"    JSONB NOT NULL,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaValue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MetaValue_definitionId_entityId_key"
  ON "MetaValue"("definitionId", "entityId");

CREATE INDEX "MetaValue_entityType_entityId_idx"
  ON "MetaValue"("entityType", "entityId");

ALTER TABLE "MetaValue"
  ADD CONSTRAINT "MetaValue_definitionId_fkey"
  FOREIGN KEY ("definitionId") REFERENCES "MetaDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── New Table: PrintJob ──────────────────────────────────────────────────────

CREATE TABLE "PrintJob" (
    "id"          TEXT NOT NULL,
    "shopId"      TEXT NOT NULL,
    "type"        TEXT NOT NULL,
    "status"      "PrintJobStatus" NOT NULL DEFAULT 'QUEUED',
    "assetUrl"    TEXT,
    "printerName" TEXT,
    "metadata"    JSONB NOT NULL DEFAULT '{}',
    "errorText"   TEXT,
    "reportedAt"  TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrintJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PrintJob_shopId_status_idx" ON "PrintJob"("shopId", "status");

ALTER TABLE "PrintJob"
  ADD CONSTRAINT "PrintJob_shopId_fkey"
  FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── New Indexes on existing tables ──────────────────────────────────────────

CREATE INDEX "Product_sku_idx" ON "Product"("sku");

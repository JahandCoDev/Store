-- Migration: add_storefront_content_and_media
-- Adds reusable media assets, collections, and storefront pages.

CREATE TYPE "MediaAssetKind" AS ENUM ('IMAGE');
CREATE TYPE "StorefrontPageStatus" AS ENUM ('DRAFT', 'PUBLISHED');
CREATE TYPE "StorefrontPageTemplate" AS ENUM ('STANDARD', 'HOME', 'LANDING');

CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "kind" "MediaAssetKind" NOT NULL DEFAULT 'IMAGE',
    "title" TEXT,
    "altText" TEXT,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MediaAsset_storageKey_key" ON "MediaAsset"("storageKey");
CREATE INDEX "MediaAsset_shopId_createdAt_idx" ON "MediaAsset"("shopId", "createdAt");

ALTER TABLE "MediaAsset"
  ADD CONSTRAINT "MediaAsset_shopId_fkey"
  FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "imageAssetId" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Collection_shopId_handle_key" ON "Collection"("shopId", "handle");
CREATE INDEX "Collection_shopId_sortOrder_idx" ON "Collection"("shopId", "sortOrder");

ALTER TABLE "Collection"
  ADD CONSTRAINT "Collection_shopId_fkey"
  FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Collection"
  ADD CONSTRAINT "Collection_imageAssetId_fkey"
  FOREIGN KEY ("imageAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "CollectionProduct" (
    "collectionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CollectionProduct_pkey" PRIMARY KEY ("collectionId", "productId")
);

CREATE INDEX "CollectionProduct_productId_idx" ON "CollectionProduct"("productId");
CREATE INDEX "CollectionProduct_collectionId_position_idx" ON "CollectionProduct"("collectionId", "position");

ALTER TABLE "CollectionProduct"
  ADD CONSTRAINT "CollectionProduct_collectionId_fkey"
  FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CollectionProduct"
  ADD CONSTRAINT "CollectionProduct_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "StorefrontPage" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "template" "StorefrontPageTemplate" NOT NULL DEFAULT 'STANDARD',
    "status" "StorefrontPageStatus" NOT NULL DEFAULT 'DRAFT',
    "excerpt" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL DEFAULT '',
    "heroEyebrow" TEXT,
    "heroTitle" TEXT,
    "heroBody" TEXT,
    "heroCtaLabel" TEXT,
    "heroCtaHref" TEXT,
    "heroImageAssetId" TEXT,
    "featuredCollectionId" TEXT,
    "sections" JSONB NOT NULL DEFAULT '[]',
    "navLabel" TEXT,
    "showInNavigation" BOOLEAN NOT NULL DEFAULT false,
    "isHomepage" BOOLEAN NOT NULL DEFAULT false,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorefrontPage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StorefrontPage_shopId_slug_key" ON "StorefrontPage"("shopId", "slug");
CREATE INDEX "StorefrontPage_shopId_status_sortOrder_idx" ON "StorefrontPage"("shopId", "status", "sortOrder");
CREATE INDEX "StorefrontPage_shopId_isHomepage_idx" ON "StorefrontPage"("shopId", "isHomepage");

ALTER TABLE "StorefrontPage"
  ADD CONSTRAINT "StorefrontPage_shopId_fkey"
  FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StorefrontPage"
  ADD CONSTRAINT "StorefrontPage_heroImageAssetId_fkey"
  FOREIGN KEY ("heroImageAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StorefrontPage"
  ADD CONSTRAINT "StorefrontPage_featuredCollectionId_fkey"
  FOREIGN KEY ("featuredCollectionId") REFERENCES "Collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
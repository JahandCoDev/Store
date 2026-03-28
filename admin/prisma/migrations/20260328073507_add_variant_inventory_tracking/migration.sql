-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "color" TEXT,
ADD COLUMN     "size" TEXT,
ADD COLUMN     "trackInventory" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "displayId" SET DEFAULT ('u-' || lpad(nextval('"User_displayId_seq"'::regclass)::text, 8, '0'));

-- CreateIndex
CREATE INDEX "ProductVariant_productId_size_color_idx" ON "ProductVariant"("productId", "size", "color");

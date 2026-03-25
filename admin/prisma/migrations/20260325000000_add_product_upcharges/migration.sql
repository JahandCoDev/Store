-- Add per-product customization upcharges.
-- Base price remains Product.price.

ALTER TABLE "Product"
	ADD COLUMN "backDesignUpcharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
	ADD COLUMN "specialTextUpcharge" DOUBLE PRECISION NOT NULL DEFAULT 0;

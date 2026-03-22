-- Migration: add_customer_profile_and_shipping
-- Adds:
-- - Customer.dateOfBirth
-- - CustomerConsent.smsMarketingOptIn (+ timestamp)
-- - Order shipping address columns for packing slips + shipping labels

ALTER TABLE "Customer"
  ADD COLUMN "dateOfBirth" TIMESTAMP(3);

ALTER TABLE "CustomerConsent"
  ADD COLUMN "smsMarketingOptIn" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "smsMarketingOptInAt" TIMESTAMP(3);

ALTER TABLE "Order"
  ADD COLUMN "shippingName" TEXT,
  ADD COLUMN "shippingEmail" TEXT,
  ADD COLUMN "shippingPhone" TEXT,
  ADD COLUMN "shippingLine1" TEXT,
  ADD COLUMN "shippingLine2" TEXT,
  ADD COLUMN "shippingCity" TEXT,
  ADD COLUMN "shippingState" TEXT,
  ADD COLUMN "shippingZip" TEXT,
  ADD COLUMN "shippingCountry" TEXT DEFAULT 'US';

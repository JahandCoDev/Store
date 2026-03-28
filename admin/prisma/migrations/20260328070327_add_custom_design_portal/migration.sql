/*
  Warnings:

  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "CustomDesignRequestStatus" AS ENUM ('SUBMITTED', 'IN_REVIEW', 'DESIGN_SENT', 'APPROVED', 'DENIED');

-- CreateEnum
CREATE TYPE "CustomDesignProposalDecision" AS ENUM ('APPROVED', 'DENIED');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "name",
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "phone" TEXT,
ALTER COLUMN "displayId" SET DEFAULT ('u-' || lpad(nextval('"User_displayId_seq"'::regclass)::text, 8, '0'));

-- CreateTable
CREATE TABLE "CustomDesignRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "CustomDesignRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "shirtSize" TEXT NOT NULL,
    "shirtColor" TEXT NOT NULL,
    "galleryDesignRef" TEXT,
    "basedOnStyleProfile" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomDesignRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomDesignProposal" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "assetId" TEXT,
    "adminMessage" TEXT,
    "customerDecision" "CustomDesignProposalDecision",
    "customerFeedback" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomDesignProposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomDesignRequest_userId_createdAt_idx" ON "CustomDesignRequest"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CustomDesignRequest_status_createdAt_idx" ON "CustomDesignRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CustomDesignProposal_requestId_createdAt_idx" ON "CustomDesignProposal"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "CustomDesignProposal_assetId_idx" ON "CustomDesignProposal"("assetId");

-- AddForeignKey
ALTER TABLE "CustomDesignRequest" ADD CONSTRAINT "CustomDesignRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomDesignProposal" ADD CONSTRAINT "CustomDesignProposal_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "CustomDesignRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomDesignProposal" ADD CONSTRAINT "CustomDesignProposal_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

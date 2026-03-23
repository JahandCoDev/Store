-- Migration: add_ci_pipeline_runs
-- Adds table:
-- - CiPipelineRun (pipeline metadata + captured log text)

CREATE TABLE "CiPipelineRun" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,

    "uniqueId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    "repositoryUrl" TEXT NOT NULL,
    "authorEmail" TEXT,
    "sha" TEXT NOT NULL,

    "status" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3),
    "partialRetry" BOOLEAN NOT NULL DEFAULT false,
    "url" TEXT,

    "log" TEXT,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CiPipelineRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CiPipelineRun_shopId_uniqueId_key" ON "CiPipelineRun"("shopId", "uniqueId");
CREATE INDEX "CiPipelineRun_shopId_createdAt_idx" ON "CiPipelineRun"("shopId", "createdAt");

ALTER TABLE "CiPipelineRun" ADD CONSTRAINT "CiPipelineRun_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

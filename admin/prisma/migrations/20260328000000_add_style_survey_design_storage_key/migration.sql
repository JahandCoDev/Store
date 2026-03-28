-- Adds a slot for an admin-provided Style Profile design asset.
--
-- NOTE: This migration also creates the "StyleSurveySubmission" table if it
-- doesn't exist yet in the migration history (to keep shadow DB creation
-- working even if the table was introduced out-of-band).

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_catalog.pg_class c
		JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
		WHERE c.relkind = 'r'
			AND c.relname = 'StyleSurveySubmission'
			AND n.nspname = current_schema()
	) THEN
		CREATE TABLE "StyleSurveySubmission" (
			"id" TEXT NOT NULL,
			"userId" TEXT NOT NULL,
			"answers" JSONB NOT NULL DEFAULT '{}',
			"version" TEXT,
			"designStorageKey" TEXT,
			"submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
			"updatedAt" TIMESTAMP(3) NOT NULL,

			CONSTRAINT "StyleSurveySubmission_pkey" PRIMARY KEY ("id")
		);

		CREATE UNIQUE INDEX "StyleSurveySubmission_userId_key" ON "StyleSurveySubmission"("userId");
		CREATE INDEX "StyleSurveySubmission_submittedAt_idx" ON "StyleSurveySubmission"("submittedAt");

		ALTER TABLE "StyleSurveySubmission"
			ADD CONSTRAINT "StyleSurveySubmission_userId_fkey" FOREIGN KEY ("userId")
			REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
	ELSE
		ALTER TABLE "StyleSurveySubmission" ADD COLUMN IF NOT EXISTS "designStorageKey" TEXT;
	END IF;
END $$;

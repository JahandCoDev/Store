-- Ensure the sequence used for User.displayId exists.
-- This is required because Prisma `db push` will not create sequences referenced
-- by dbgenerated() defaults.

DO $$
DECLARE
  max_val BIGINT;
  user_table REGCLASS;
BEGIN
  CREATE SEQUENCE IF NOT EXISTS "User_displayId_seq";

  user_table := to_regclass('"User"');
  IF user_table IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = user_table
      AND attname = 'displayId'
      AND NOT attisdropped
  ) THEN
    RETURN;
  END IF;

  -- If any existing displayIds match our sequence-backed format, advance the
  -- sequence to avoid collisions.
  SELECT MAX((regexp_match("displayId", '^u-(\\d+)$'))[1]::BIGINT)
  INTO max_val
  FROM "User"
  WHERE "displayId" ~ '^u-\\d+$';

  IF max_val IS NOT NULL THEN
    PERFORM setval('"User_displayId_seq"', max_val);
  END IF;
END $$;

-- Backfill the schema-only edits that landed in commits 214ea99 and
-- 1b57482 without an accompanying migration file. The deployed Prisma
-- client already references these columns / nullability, so production
-- 500s on every booking query until this is applied.
--
-- Idempotent: safe to run on databases that already have these columns
-- (e.g. local dev DBs that have been pushed via `prisma db push`).

-- 1) Counter-offer / reschedule proposal columns on bookings.
ALTER TABLE "bookings"
  ADD COLUMN IF NOT EXISTS "proposed_start_time" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "proposed_end_time"   TIMESTAMP(3);

-- 2) Allow users.email to be NULL (phone-only accounts, social login).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
      AND column_name = 'email'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
  END IF;
END
$$;

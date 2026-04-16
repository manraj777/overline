# Supabase Migration Runbook (Neon -> Supabase)

This runbook migrates Overline PostgreSQL data from Neon to Supabase with rollback readiness.

## 1. Prerequisites

- Supabase project created (Postgres database ready)
- `pg_dump` and `pg_restore` installed locally
- `pnpm install` completed in this repo
- Access to both connection strings

## 2. Set Environment Variables

Use direct Postgres connection strings (not pooled if possible for restore):

```bash
export NEON_DATABASE_URL='postgresql://...'
export SUPABASE_DATABASE_URL='postgresql://...'
```

## 3. Create Backup Dump

```bash
pnpm db:export:neon -- --source-url "$NEON_DATABASE_URL" --out backups/neon-precutover.dump
```

Expected outcome:
- A file is created at `backups/neon-precutover.dump`

## 4. Import into Supabase

```bash
pnpm db:import:supabase -- --target-url "$SUPABASE_DATABASE_URL" --dump backups/neon-precutover.dump
```

Expected outcome:
- Schema and data are restored into Supabase

## 5. Apply Prisma Production Migrations

```bash
cd apps/backend
DATABASE_URL="$SUPABASE_DATABASE_URL" pnpm prisma:migrate:prod
```

Expected outcome:
- Pending migrations applied cleanly

## 6. Smoke Verification

Run these checks against Supabase URL:

```bash
cd apps/backend
DATABASE_URL="$SUPABASE_DATABASE_URL" pnpm prisma generate
DATABASE_URL="$SUPABASE_DATABASE_URL" pnpm test -- --runInBand
```

Minimum manual checks after deployment:
- Admin owner signup (`POST /auth/register-shop`)
- Admin login
- User browse explore/map
- User cart checkout + booking create

## 7. Cutover

Update deployment environment variables:

- Railway backend: `DATABASE_URL=$SUPABASE_DATABASE_URL`
- Any workers/cron services: same `DATABASE_URL`

Redeploy backend service after env update.

## 8. Rollback Plan

If issues appear after cutover:

1. Revert `DATABASE_URL` to Neon in deployment env.
2. Redeploy backend.
3. Keep Supabase snapshot for diff investigation.

## 9. One-Command Workflow (Optional)

```bash
export NEON_DATABASE_URL='postgresql://...'
export SUPABASE_DATABASE_URL='postgresql://...'
pnpm db:migrate:neon-to-supabase
```

This executes export -> import -> Prisma migrate deploy.

## 10. Cost/Storage Strategy After Migration

- Archive old booking and event data monthly.
- Keep media in Cloudinary/S3, not DB blobs.
- Add retention for OTP/fraud logs.
- Use Supabase PITR/backups before major schema changes.

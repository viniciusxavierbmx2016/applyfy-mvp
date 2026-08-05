-- Enable RLS on the 2 tables that were missing it, aligning them with the
-- other 58 app tables (which have RLS + no policies = deny-by-default), and go
-- one step further (see REVOKE below). The app accesses the DB via Prisma using
-- the `postgres` role, which bypasses RLS, so this has ZERO impact on behavior.
-- It closes the hole where the public anon key could read WorkspaceGatewaySecret
-- (and write to it, forging webhooks) and read OriginLockLog via PostgREST.
-- The REVOKE extends the June posture: RLS does not govern TRUNCATE, which is a
-- table privilege, so the grant is dropped as well. Already applied to production
-- on 2026-08-05 (UTC) via raw SQL; recorded here with `migrate resolve --applied`.

ALTER TABLE "WorkspaceGatewaySecret" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OriginLockLog"          ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "WorkspaceGatewaySecret", "OriginLockLog" FROM anon, authenticated;

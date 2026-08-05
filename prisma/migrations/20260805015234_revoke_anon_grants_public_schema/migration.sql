-- Revoke all anon/authenticated privileges on the public schema, and stop new
-- objects from being granted to them. Complements the June RLS posture: RLS
-- returns empty rows, but does not govern TRUNCATE, which is a table privilege.
-- Capability-neutral: anon/authenticated have rolbypassrls = false and every
-- table has RLS with no policies, so they already read zero rows. This changes
-- the failure mode from 200 [] to 401, and closes TRUNCATE.
-- IN SCHEMA public is mandatory: the browser upload path runs as authenticated
-- against the storage schema, which must keep its grants.
-- The `postgres` role (used by Prisma) inherits from anon/authenticated, but
-- owns all tables and holds its own explicit grants, so it is unaffected.
-- NOTE: the pg_default_acl rows owned by supabase_admin cannot be revoked with
-- the postgres role (not a member, not superuser) and survive this migration.
-- Already applied to production on 2026-08-05 (UTC) via raw SQL; recorded here
-- with `migrate resolve --applied`.

REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

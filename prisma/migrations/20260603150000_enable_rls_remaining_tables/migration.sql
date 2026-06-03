-- Enable RLS on the 5 tables that were missing it, aligning them with the
-- other 52 app tables (which already have RLS + no policies = deny-by-default).
-- The app accesses the DB via Prisma using the `postgres` role, which bypasses
-- RLS, so this has ZERO impact on application behavior. It closes the hole where
-- the public anon key could read these tables directly via the Supabase Data API
-- (PostgREST). No policies are added — deny-by-default, same as every other table.

ALTER TABLE "CourseExternalProduct" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CourseSupportMessage"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CourseSupportTicket"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PointsLedger"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkspaceApplyfyToken" ENABLE ROW LEVEL SECURITY;

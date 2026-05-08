-- Enable Row Level Security on WorkspaceCredential.
-- All access must go through the application service-role key, which
-- bypasses RLS. Direct anon/authenticated DB access is denied.
ALTER TABLE "WorkspaceCredential" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkspaceCredential" FORCE ROW LEVEL SECURITY;

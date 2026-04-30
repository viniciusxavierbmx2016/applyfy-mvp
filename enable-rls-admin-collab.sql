-- New table from feature/support-system Stage A — keep RLS posture consistent.
ALTER TABLE public."AdminCollaborator" ENABLE ROW LEVEL SECURITY;

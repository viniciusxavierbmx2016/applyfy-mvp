-- New table from Phase 4 — keep RLS posture consistent with Phase 1.
ALTER TABLE public."AuditLog" ENABLE ROW LEVEL SECURITY;

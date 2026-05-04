-- Fix: drop the open SELECT policies on the 3 public buckets that allow
-- anyone with the anon key to LIST bucket contents (filenames, sizes, etc.).
--
-- Why dropping (not restricting) is safe:
-- - Individual file serving uses /storage/v1/object/public/{bucket}/{path},
--   which respects bucket.public=true and does NOT consult these policies.
--   So <img src={publicUrl}> in the frontend keeps working.
-- - All app code that calls supabase.storage uses createAdminClient()
--   (service_role), which bypasses RLS — so internal LIST/upload/delete
--   keeps working too.
-- - With no permissive SELECT policy, anon LIST via /object/list/{bucket}
--   fails (RLS denies by default) — the leak is closed.
--
-- ticket-attachments is unchanged (its SELECT policy is already
-- service_role-restricted from Stage B2).

DROP POLICY IF EXISTS "Allow public read avatars"    ON storage.objects;
DROP POLICY IF EXISTS "Allow public read materials"  ON storage.objects;
DROP POLICY IF EXISTS "Allow public read thumbnails" ON storage.objects;

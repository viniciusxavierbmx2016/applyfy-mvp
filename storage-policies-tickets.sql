-- ticket-attachments is a PRIVATE bucket. All access flows through the API,
-- which uses service_role: uploads via backend, reads via signed URLs.
-- These policies block anon/authenticated direct access at the row level
-- (defense in depth — bucket.public=false already prevents the public CDN
-- endpoint from serving the files).

DROP POLICY IF EXISTS "tickets: service write"  ON storage.objects;
DROP POLICY IF EXISTS "tickets: service read"   ON storage.objects;
DROP POLICY IF EXISTS "tickets: service update" ON storage.objects;
DROP POLICY IF EXISTS "tickets: service delete" ON storage.objects;

CREATE POLICY "tickets: service read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'ticket-attachments' AND auth.role() = 'service_role'
  );

CREATE POLICY "tickets: service write" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'ticket-attachments' AND auth.role() = 'service_role'
  );

CREATE POLICY "tickets: service update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'ticket-attachments' AND auth.role() = 'service_role'
  );

CREATE POLICY "tickets: service delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'ticket-attachments' AND auth.role() = 'service_role'
  );

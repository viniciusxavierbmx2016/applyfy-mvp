-- ============================================
-- MEMBERS CLUB — Storage Security Policies
-- ============================================
-- Buckets permanecem public (frontend precisa de URLs sem auth)
-- Policies restringem upload/update/delete para service_role
-- ============================================

-- 1. REMOVER policies "allow-all" que abriam tudo pra anon
-- (verificadas via pg_policies — nomes com espaço, vêm do default
--  do Supabase quando o bucket foi criado pelo Dashboard)
DROP POLICY IF EXISTS "allow-all 16v3daf_0" ON storage.objects;
DROP POLICY IF EXISTS "allow-all 16v3daf_1" ON storage.objects;
DROP POLICY IF EXISTS "allow-all 16v3daf_2" ON storage.objects;
DROP POLICY IF EXISTS "allow-all 16v3daf_3" ON storage.objects;

-- 2. DROP idempotente das policies que vamos criar (caso re-rode)
DROP POLICY IF EXISTS "Allow public read avatars"     ON storage.objects;
DROP POLICY IF EXISTS "Allow service upload avatars"  ON storage.objects;
DROP POLICY IF EXISTS "Allow service update avatars"  ON storage.objects;
DROP POLICY IF EXISTS "Allow service delete avatars"  ON storage.objects;
DROP POLICY IF EXISTS "Allow public read materials"     ON storage.objects;
DROP POLICY IF EXISTS "Allow service upload materials"  ON storage.objects;
DROP POLICY IF EXISTS "Allow service update materials"  ON storage.objects;
DROP POLICY IF EXISTS "Allow service delete materials"  ON storage.objects;
DROP POLICY IF EXISTS "Allow public read thumbnails"     ON storage.objects;
DROP POLICY IF EXISTS "Allow service upload thumbnails"  ON storage.objects;
DROP POLICY IF EXISTS "Allow service update thumbnails"  ON storage.objects;
DROP POLICY IF EXISTS "Allow service delete thumbnails"  ON storage.objects;

-- 3. AVATARS: leitura pública, escrita só via service_role
CREATE POLICY "Allow public read avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Allow service upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'service_role');

CREATE POLICY "Allow service update avatars" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.role() = 'service_role');

CREATE POLICY "Allow service delete avatars" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.role() = 'service_role');

-- 4. MATERIALS: leitura pública, escrita só via service_role
CREATE POLICY "Allow public read materials" ON storage.objects
  FOR SELECT USING (bucket_id = 'materials');

CREATE POLICY "Allow service upload materials" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'materials' AND auth.role() = 'service_role');

CREATE POLICY "Allow service update materials" ON storage.objects
  FOR UPDATE USING (bucket_id = 'materials' AND auth.role() = 'service_role');

CREATE POLICY "Allow service delete materials" ON storage.objects
  FOR DELETE USING (bucket_id = 'materials' AND auth.role() = 'service_role');

-- 5. THUMBNAILS: leitura pública, escrita só via service_role
CREATE POLICY "Allow public read thumbnails" ON storage.objects
  FOR SELECT USING (bucket_id = 'thumbnails');

CREATE POLICY "Allow service upload thumbnails" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'thumbnails' AND auth.role() = 'service_role');

CREATE POLICY "Allow service update thumbnails" ON storage.objects
  FOR UPDATE USING (bucket_id = 'thumbnails' AND auth.role() = 'service_role');

CREATE POLICY "Allow service delete thumbnails" ON storage.objects
  FOR DELETE USING (bucket_id = 'thumbnails' AND auth.role() = 'service_role');

-- VERIFICAÇÃO:
-- SELECT policyname, cmd FROM pg_policies WHERE schemaname = 'storage' ORDER BY policyname;

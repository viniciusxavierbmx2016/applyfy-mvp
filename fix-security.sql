-- ============================================
-- MEMBERS CLUB — Fix Foreign Keys + Security
-- ============================================
-- Análise: cada FK só recebe índice se NÃO houver
-- índice cobrindo (ex.: @@unique(a,b) cobre 'a' como
-- leading-prefix; FKs já cobertas foram puladas).
-- ============================================

-- 1. INDEXAR FOREIGN KEYS NÃO INDEXADAS
-- Melhora performance de JOINs e previne full table scans

CREATE INDEX IF NOT EXISTS "Certificate_courseId_idx"        ON public."Certificate"      ("courseId");
CREATE INDEX IF NOT EXISTS "Comment_userId_idx"              ON public."Comment"          ("userId");
CREATE INDEX IF NOT EXISTS "ImpersonateToken_userId_idx"     ON public."ImpersonateToken" ("userId");
CREATE INDEX IF NOT EXISTS "ImpersonateToken_adminId_idx"    ON public."ImpersonateToken" ("adminId");
CREATE INDEX IF NOT EXISTS "LessonComment_userId_idx"        ON public."LessonComment"    ("userId");
CREATE INDEX IF NOT EXISTS "LessonProgress_lessonId_idx"     ON public."LessonProgress"   ("lessonId");
CREATE INDEX IF NOT EXISTS "Like_postId_idx"                 ON public."Like"             ("postId");
CREATE INDEX IF NOT EXISTS "LiveModerator_userId_idx"        ON public."LiveModerator"    ("userId");
CREATE INDEX IF NOT EXISTS "PendingExecution_userId_idx"     ON public."PendingExecution" ("userId");
CREATE INDEX IF NOT EXISTS "Session_userId_idx"              ON public."Session"          ("userId");
CREATE INDEX IF NOT EXISTS "Subscription_planId_idx"         ON public."Subscription"     ("planId");

-- ============================================
-- 2. STORAGE BUCKETS — NÃO EXECUTAR SEM VALIDAR
-- ============================================
-- Setar public=false em bucket que serve arquivos via URL
-- pública QUEBRA o acesso. Avatars/thumbnails são exibidos
-- sem auth no frontend → precisam continuar públicos.
-- Materials (PDFs de aula) podem precisar de auth — depende
-- do produto. Decidir antes de rodar.
--
-- Bloco abaixo está COMENTADO de propósito. Descomente só
-- após confirmar que o frontend sobrevive sem URL pública
-- (ex.: trocar pra signed URLs em todos os pontos de uso).
--
-- UPDATE storage.buckets SET public = false WHERE name = 'avatars';
-- UPDATE storage.buckets SET public = false WHERE name = 'materials';
-- UPDATE storage.buckets SET public = false WHERE name = 'thumbnails';
--
-- Alternativa (manter público, mas com policy explícita
-- pra GET e bloquear LIST):
-- CREATE POLICY "Public read access" ON storage.objects
--   FOR SELECT USING (bucket_id IN ('avatars','thumbnails','materials'));

-- ============================================
-- VERIFICAÇÃO
-- ============================================
-- SELECT indexname, tablename FROM pg_indexes
-- WHERE schemaname = 'public' AND indexname LIKE '%_idx'
-- ORDER BY tablename, indexname;

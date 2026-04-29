-- ============================================
-- MEMBERS CLUB — Ativar RLS em todas as tabelas
-- ============================================
-- SEGURO: service_role (usado pelo Prisma) bypassa RLS
-- Isso BLOQUEIA acesso direto via anon_key
-- Nenhuma policy permissiva = bloqueio total pra anon
-- ============================================

-- Ativar RLS em cada tabela
-- (RLS ativado SEM policies = bloqueio total exceto service_role)

ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Workspace" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Collaborator" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Course" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MenuItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Module" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Section" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Lesson" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Enrollment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EnrollmentOverride" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LessonProgress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CommunityGroup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Post" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Comment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Like" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LessonComment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Certificate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Review" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LessonReaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."WebhookLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProducerTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LessonMaterial" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."IntegrationRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Plan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."BillingReminder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PlatformSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Quiz" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."QuizQuestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."QuizOption" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."QuizAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Automation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PendingExecution" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AutomationLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Tag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."UserTag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Live" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LiveMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LiveNotification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PushSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LiveModerator" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ImpersonateToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AccessLog" ENABLE ROW LEVEL SECURITY;

-- VERIFICAÇÃO: rode isso pra confirmar
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

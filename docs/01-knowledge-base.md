# Members Club — Knowledge Base

> Documento técnico completo da plataforma. Última atualização: 06 de maio de 2026.
> Projeto: Members Club (app.mymembersclub.com.br) — SaaS multi-tenant de cursos/memberships

---

## 1. Stack & Versões

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Runtime | Node.js | v24.14.1 |
| Package Manager | npm | 11.11.0 |
| Framework | Next.js (App Router) | ^16.2.4 (rodando 16.2.5) |
| UI | React | ^19.2.5 |
| Estilo | Tailwind CSS | ^3.4.1 |
| Linguagem | TypeScript | ^5 |
| ORM | Prisma + @prisma/client | ^5.22.0 |
| Auth/DB | Supabase SSR + supabase-js | ^0.10.2 / ^2.103.0 |
| Validação | Zod | ^4.3.6 |
| State | Zustand | ^5.0.12 |
| Editor Rich-text | Tiptap (react + starter-kit + extensions) | ^3.22.x |
| Charts | Recharts | ^3.8.1 |
| Drag-and-drop | @dnd-kit (core/sortable/utilities) | ^6.3.1 |
| Email | @getbrevo/brevo | ^5.0.4 |
| Push | web-push (VAPID) | ^3.6.7 |
| Lint | ESLint flat config + eslint-config-next | 10.x / 16.x |

**Métricas do projeto:** ~70.000 linhas de código em 388 arquivos .ts/.tsx. 538 commits no histórico git.

---

## 2. Repositório & Deploy

| Item | Valor |
|------|-------|
| Repo | github.com/viniciusxavierbmx2016/applyfy-mvp |
| Deploy | git push → Vercel auto-deploy (main = prod, branches = staging) |
| Região Vercel | GRU1 (São Paulo) |
| Domínio principal | app.mymembersclub.com.br |
| Landing page | mymembersclub.com.br |
| Staging Supabase | wxynnsyartxcvglqwmdw |

**Contas de teste staging:** admin-staging@mymembersclub.com.br / producer-staging@mymembersclub.com.br / student-staging@mymembersclub.com.br (senha: Staging@2026!)

---

## 3. Estrutura de Diretórios

**Route groups** (parênteses não viram URL, só agrupam layout):

- `(auth)` → /login, /register (admin entry)
- `(course)` → /course/[slug]/... (vitrine do aluno: home, modules, lessons, community)
- `(dashboard)` → /, /profile (home autenticada padrão)

**Áreas top-level:**

| Área | Path | Quem acessa |
|------|------|-------------|
| Landing page | /landing (rewrite do apex) | Qualquer um |
| Auth flows | /forgot-password, /reset-password, /verify-email, /auth/impersonate | Público (com token/cookie) |
| Admin | /admin/* (audit, collaborators, integrations, login, plans, producers, reports, settings, subscriptions, support) | ADMIN, ADMIN_COLLABORATOR |
| Producer | /producer/* (analytics, automations, billing, collaborators, community, courses, integrations, lives, settings, users, workspaces, login, register, profile) | PRODUCER, COLLABORATOR |
| Workspace student | /w/[slug]/* (page, lives, login, profile, register) | STUDENT do workspace |
| Course view | /course/[slug], .../module/[moduleId], .../lesson/[id], .../community | Matriculado |
| Invites | /invite/[id], /invite/admin/[id] | Convidado |
| Verify | /verify/[code] | Público (validar certificado) |

**Totais:** 75 páginas, 156 API route handlers, 65 componentes, 36 libs.

---

## 4. Modelo de Dados — 51 Models

| Domínio | Models |
|---------|--------|
| Identidade | User, Session, AccessLog, AuditLog, ImpersonateToken |
| Workspace | Workspace, Settings, PlatformSettings, MenuItem |
| RBAC | Collaborator, AdminCollaborator |
| Conteúdo | Course, Module, Section, Lesson, LessonMaterial |
| Aluno | Enrollment, EnrollmentOverride, LessonProgress, LessonReaction, Like, LessonComment, Comment |
| Comunidade | CommunityGroup, Post, Tag, UserTag |
| Avaliação | Quiz, QuizQuestion, QuizOption, QuizAttempt, Review |
| Lives | Live, LiveMessage, LiveModerator, LiveNotification |
| Notificações | Notification, PushSubscription |
| Gamificação | Certificate (e User.points/level) |
| Billing | Plan, Subscription, Invoice, BillingReminder, ProducerTransaction |
| Integrações | IntegrationRequest, WebhookLog |
| Automações | Automation, AutomationLog, PendingExecution |
| Suporte | SupportTicket, TicketMessage |

---

## 5. Enums (16)

| Enum | Valores |
|------|---------|
| Role | STUDENT, PRODUCER, ADMIN, COLLABORATOR, ADMIN_COLLABORATOR |
| CollaboratorStatus | PENDING, ACCEPTED, REVOKED |
| AdminCollaboratorStatus | PENDING, ACCEPTED, REVOKED |
| EnrollmentStatus | ACTIVE, EXPIRED, CANCELLED |
| GroupPermission | READ_WRITE, READ_ONLY |
| PostType | QUESTION, RESULT, FEEDBACK, FREE |
| ModerationStatus | PENDING, APPROVED, REJECTED |
| NotificationType | LIKE, COMMENT, REPLY, ENROLLMENT, LEVEL_UP, LIVE_SCHEDULED, LIVE_STARTED, TICKET_NEW, TICKET_REPLY |
| ReactionType | LIKE, DISLIKE |
| WebhookLogStatus | SUCCESS, ERROR, IGNORED |
| IntegrationRequestStatus | PENDING, REVIEWING, COMPLETED |
| SubscriptionStatus | PENDING, ACTIVE, PAST_DUE, SUSPENDED, CANCELLED |
| InvoiceStatus | PENDING, PAID, FAILED, REFUNDED |
| TicketStatus | OPEN, IN_PROGRESS, WAITING_RESPONSE, RESOLVED, CLOSED |
| TicketPriority | LOW, NORMAL, HIGH, URGENT |

---

## 6. Roles & Permissões (RBAC)

### 5 Roles Globais (User.role)

- **STUDENT** — aluno (acessa cursos via enrollment); pode também ser COLLABORATOR de uma workspace
- **PRODUCER** — dono da workspace e seus cursos
- **ADMIN** — superusuário da plataforma
- **COLLABORATOR** — equipe do produtor com permissões granulares
- **ADMIN_COLLABORATOR** — equipe do admin da plataforma com permissões granulares

### Permissões de Producer Collaborator (5)

REPLY_COMMENTS, MANAGE_COMMUNITY, MANAGE_STUDENTS, VIEW_ANALYTICS, MANAGE_LESSONS

### Permissões de Admin Collaborator (7)

SUPPORT, MANAGE_PRODUCERS, MANAGE_PLANS, MANAGE_BILLING, VIEW_REPORTS, VIEW_AUDIT, FULL_ACCESS

### Helpers de Auth (src/lib/auth.ts)

requireAuth(), requireAdmin(), requireStaff() (PRODUCER/ADMIN/COLLABORATOR/ADMIN_COLLABORATOR), requirePermission(), canEditCourse(), canEditModule(), canEditLesson(), canManageStudentsOfCourse(), isAdmin(), isStaff(), getCurrentUser() (cached), isEnrollmentActive(), loadEnrollmentOverrides(), computeLessonReleaseWithOverride().

### Row Level Security (RLS)

49 tabelas com RLS ativado no Supabase. Storage policies configuradas para buckets públicos e privados. FK indexes em todas as relações.

---

## 7. Variáveis de Ambiente (17)

| Var | Função |
|-----|--------|
| DATABASE_URL | Supabase Postgres (Prisma) |
| NEXT_PUBLIC_SUPABASE_URL | Supabase client (browser/SSR) |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase client (browser/SSR) |
| SUPABASE_SERVICE_ROLE_KEY | Supabase admin client (uploads, password admin) |
| NEXT_PUBLIC_APP_URL | URL canônica do app |
| NEXT_PUBLIC_SITE_URL | URL do site |
| ENCRYPTION_SECRET | AES-256 para User.document (CPF/CNPJ) |
| BREVO_API_KEY | Email transacional |
| MEMBERS_CLUB_WEBHOOK_TOKEN | Auth do webhook /api/webhooks/members-club |
| MEMBERS_CLUB_CHECKOUT_URL | Override da URL Applyfy do checkout do plano |
| APPLYFY_TOKEN | Fallback do webhook applyfy (primary vem de DB Setting) |
| STRIPE_WEBHOOK_SECRET | HMAC do webhook Stripe |
| CRON_SECRET | Authorization header dos crons |
| VAPID_EMAIL | Web push (VAPID) |
| VAPID_PUBLIC_KEY | Web push server |
| VAPID_PRIVATE_KEY | Web push server |
| NEXT_PUBLIC_VAPID_PUBLIC_KEY | Web push client subscribe |

---

## 8. Infraestrutura

### Vercel Config

```json
{
  "regions": ["gru1"],
  "crons": [
    { "path": "/api/cron/automations", "schedule": "0 */6 * * *" },
    { "path": "/api/cron/pending",     "schedule": "*/10 * * * *" },
    { "path": "/api/cron/billing",     "schedule": "0 9 * * *" }
  ]
}
```

### Cron Jobs (3)

| Path | Schedule | Função |
|------|----------|--------|
| /api/cron/automations | A cada 6h | Reavalia triggers STUDENT_INACTIVE, PROGRESS_BELOW, etc. |
| /api/cron/pending | A cada 10min | Executa PendingExecution agendados (delays de automações) |
| /api/cron/billing | Diário 9h | Avisos de expiração + suspende vencidos. Envia email via Brevo |

Todos autenticados via `Authorization: Bearer $CRON_SECRET`.

### DNS & Domínios

| Host | Resolução | Função |
|------|-----------|--------|
| mymembersclub.com.br (apex) | Vercel 76.76.21.21 | Landing page (rewrite → /landing) |
| www.mymembersclub.com.br | Cloudflare 301 → apex | Redirect SEO |
| app.mymembersclub.com.br | cname.vercel-dns.com | Aplicação principal |

### Cloudflare

- WAF + DDoS + DNSSEC ativados
- SSL Full Strict, TLS 1.2 mínimo
- Bot Fight Mode desligado (pendência: upgrade Pro $20/mês para exceções por path)
- Regra Skip para /api/webhooks/
- Redirect 301 www → apex via Redirect Rule
- Cloudflare Insights permitido na CSP

---

## 9. Proxy/Middleware (src/proxy.ts)

Convenção Next 16 — arquivo se chama `proxy.ts`, função `proxy()`.

**Comportamento por host:**
- `mymembersclub.com.br` ou `www.mymembersclub.com.br` + path `/` → rewrite interno para `/landing`
- `app.mymembersclub.com.br` ou outro host → fluxo de auth normal

**Public routes** (não exigem sessão): /login, /register, /admin/login, /producer/login, /producer/register, /forgot-password, /reset-password, /verify-email, /auth/impersonate, /landing, /verify/*, /invite/*, /w/[slug]/(login|register|forgot-password|reset-password).

**Redirect if authed:** rotas de login redirecionam usuário autenticado pro respectivo painel.

**API routes** (/api/*) — proxy passa direto, auth é per-handler.

**Static asset matcher:** exclui .png, .jpg, .svg, .woff2, .json, etc., garantindo que assets em public/ não passem pelo proxy.

---

## 10. Supabase

### 4 Clientes

| Arquivo | Tipo | Uso |
|---------|------|-----|
| supabase.ts | createBrowserClient | Client components, anon |
| supabase-server.ts | createServerClient | SSR via cookies, server components/actions, anon |
| supabase-route.ts | Variante route handlers | Cookies write-allowed, anon |
| supabase-admin.ts | createAdminClient | Service role, sem persist session — uploads/admin updates |

### Storage Buckets

- **thumbnails** — cursos
- **avatars** — users
- **materials** — PDFs/anexos de aulas
- **ticket-attachments** — suporte

### Auth

Supabase Auth com MFA TOTP (5 endpoints /api/auth/mfa/*).

---

## 11. Serviços Externos

| Serviço | Uso | Onde |
|---------|-----|------|
| Brevo | Email transacional (welcome, reset, invite, billing, access) | src/lib/email.ts |
| Applyfy | Gateway de pagamentos (checkout + webhooks matrícula) | webhooks/applyfy, members-club |
| Stripe | Webhook (HMAC verify) | webhooks/stripe |
| Web Push (VAPID) | Notificações PWA | src/hooks/use-push-notifications.ts, src/lib/push-send.ts |
| YouTube/Vimeo | Player das aulas (IFrame API, youtube-nocookie) | src/components/video-player.tsx |
| Cloudflare Insights | Analytics RUM | Script externo permitido na CSP |
| Google Fonts | Outfit + Plus Jakarta Sans (landing) | src/app/landing/page.tsx |

---

## 12. Validação (Zod) — 100% Coverage

88 de 88 API routes JSON validam body via Zod. 62 schemas centralizados em `src/lib/validations.ts` + helper `validateBody()`.

10 routes formData (uploads) usam validação de MIME/size, não Zod.

---

## 13. Segurança

### Implementado

- RLS em 49 tabelas + Storage policies + FK indexes
- Rate limiting + CSP headers + Zod validation (100%)
- Audit trail + 2FA admin+producer
- Column encryption (CPF) via AES-256
- Webhook timing-safe comparison (crypto.timingSafeEqual)
- Cron secret + Login failure alerts
- Cloudflare WAF + DDoS + DNSSEC, SSL Full Strict TLS 1.2
- MFA em todas as contas (Gmail, GitHub, Vercel, Supabase, Cloudflare, Registro.br)
- Staging/prod separados
- npm audit CI/CD (0 vulnerabilities)
- Logger estruturado (info/debug levels, debug silenciado em prod)
- ESLint flat config funcional

---

## 14. Scripts npm

| Script | Comando |
|--------|---------|
| dev | next dev |
| build | next build |
| start | next start |
| lint | eslint . |
| postinstall | prisma generate |

---

## 15. Features Completas

- Sistema de suporte (chat widget + inbox admin + colaboradores com permissões)
- Admin Collaborators (7 permissões granulares, convite, aceite, revoke)
- Tour guiado (só após assinatura, filtrado por permissão)
- Tooltips contextuais (~50)
- Moderação de comentários
- Termos de uso por curso
- Landing page em mymembersclub.com.br
- Video player (YouTube masked embed, Vimeo)
- Progress tracking + gamificação (pontos/níveis)
- Comunidade por curso (posts/comments/likes)
- Certificados PDF
- Notificações (bell + push)
- Busca global
- Reviews/ratings
- Dark/light mode
- Tiptap rich editor
- Avatar upload
- Quizzes por aula (CRUD producer + tentativas aluno)
- Automações (7 triggers, 4 actions, cron behavioral)
- CSV export/import alunos
- Reset password com 2FA
- Enrollment com expiração + CTA renovação
- Lives com chat + moderação
- Workspace login customization

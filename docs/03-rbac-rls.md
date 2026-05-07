# Members Club — RBAC & RLS (Controle de Acesso)

> Mapeamento completo de roles, permissões, RLS, rate limiting e camadas de segurança.
> Última atualização: 06 de maio de 2026.

---

## 1. Modelo de Roles em Camadas

| Role | Origem | Escopo | MFA obrigatório? |
|------|--------|--------|-------------------|
| **ADMIN** | User.role | Toda a plataforma | Sim (se enrolled) |
| **ADMIN_COLLABORATOR** | User.role + AdminCollaborator(status=ACCEPTED) | Platform admin com perms granulares | Não |
| **PRODUCER** | User.role + dono de Workspace/Course | Seu workspace e cursos | Sim (se enrolled) |
| **COLLABORATOR** | Collaborator(status=ACCEPTED) em qualquer User | Workspace do produtor que convidou | Não |
| **STUDENT** | User.role (default) | Cursos onde tem Enrollment ACTIVE | Não |

**Subtleties importantes:**
- Role efetivo é dinâmico — um STUDENT com Collaborator(status=ACCEPTED) é tratado como COLLABORATOR por request, sem alterar a row no banco
- MFA enforcement: se ADMIN/PRODUCER tem TOTP factor verified mas sessão é AAL1, getCurrentUser() retorna null (desloga efetivamente)
- User.role = "ADMIN" dá acesso a todas as 7 permissões de admin

---

## 2. Helpers de Auth (src/lib/auth.ts)

### 2.1 Sessão & Gating

| Função | Comportamento |
|--------|-------------|
| `getSession()` | Retorna sessão Supabase raw |
| `getCurrentUser()` | Cached por request. Retorna User (Prisma) ou null. Valida MFA pra staff |
| `requireAuth()` | User ou throw "Não autorizado" (401) |
| `requireAdmin()` | Só ADMIN puro, throw "Sem permissão" |
| `requireStaff()` | ADMIN, PRODUCER, COLLABORATOR ou STUDENT-with-Collaborator. Throw "Sem permissão" |
| `isAdmin(user)` / `isStaff(user)` | Predicates síncronos |

### 2.2 Permissões Granulares

| Função | Lógica |
|--------|--------|
| `requirePermission(staff, perm)` | ADMIN/PRODUCER → passa. COLLABORATOR → checa permissions.includes(perm) |
| `getCollaboratorContext(userId)` | Cached. Resolve workspace + permissions + courseIds |
| `getStaffCourseIds(staff)` | null = sem restrição (ADMIN/PRODUCER). Array = scoped (COLLABORATOR) |

### 2.3 Authorization por Recurso (Ownership)

| Função | Lógica |
|--------|--------|
| `canEditCourse(staff, courseId)` | ADMIN: true. PRODUCER: dono do course/workspace. COLLABORATOR: MANAGE_LESSONS + course no workspace + courseIds |
| `canManageStudentsOfCourse(staff, courseId)` | Mesmo que canEditCourse mas exige MANAGE_STUDENTS |
| `canEditModule(staff, moduleId)` | Reduz pra canEditCourse via FK module → course |
| `canEditLesson(staff, lessonId)` | Reduz pra canEditCourse via FK lesson → module → course |

### 2.4 Release de Conteúdo (Drip)

| Função | Lógica |
|--------|--------|
| `computeReleaseStatus(enrolledAt, days)` | Calcula se conteúdo liberado vs daysToRelease |
| `computeLessonReleaseWithOverride(...)` | Honra EnrollmentOverride de módulo OU de aula |
| `loadEnrollmentOverrides(enrollmentId)` | Carrega overrides como {modules: Set, lessons: Set} |
| `isEnrollmentActive(enrollment)` | status === ACTIVE && (expiresAt null OU futuro) |

---

## 3. Permissões de Producer Collaborator (5)

| Permissão | Label | Onde é checada |
|-----------|-------|---------------|
| `REPLY_COMMENTS` | Responder comentários | LessonComment routes |
| `MANAGE_COMMUNITY` | Moderar comunidade | community/groups POST/PATCH, posts/pin |
| `MANAGE_STUDENTS` | Gerenciar alunos | courses/students/*, producer/students/* |
| `VIEW_ANALYTICS` | Ver analytics | producer/analytics, producer/sales/stats |
| `MANAGE_LESSONS` | Gerenciar módulos/aulas | canEditCourse/Module/Lesson |

**Granularidade adicional:** Collaborator.courseIds (string[]). Vazio → todas courses do workspace. Populado → só esses courseIds.

---

## 4. Permissões de Admin Collaborator (7)

| Permissão | Label | Rota |
|-----------|-------|------|
| `SUPPORT` | Suporte | /admin/support |
| `MANAGE_PRODUCERS` | Gerenciar produtores | /admin/producers |
| `MANAGE_PLANS` | Gerenciar planos | /admin/plans |
| `MANAGE_BILLING` | Gerenciar assinaturas | /admin/subscriptions |
| `VIEW_REPORTS` | Ver relatórios | /admin/reports |
| `VIEW_AUDIT` | Ver logs de auditoria | /admin/audit |
| `FULL_ACCESS` | Acesso total | /admin/integrations, /admin/settings |

**GRANTABLE_ADMIN_PERMS** = todas exceto FULL_ACCESS (não pode dar FULL pra um collab).

**Resolução:**
- ADMIN → Set(ALL_ADMIN_PERMS)
- ADMIN_COLLABORATOR (ACCEPTED) com FULL_ACCESS → Set(ALL_ADMIN_PERMS)
- ADMIN_COLLABORATOR (ACCEPTED) sem FULL_ACCESS → Set(perms da row)
- Qualquer outro → Set()

---

## 5. Proxy/Middleware (src/proxy.ts)

### Rotas Públicas (não exigem sessão)

/login, /register, /admin/login, /producer/login, /producer/register, /forgot-password, /reset-password, /verify-email, /auth/impersonate, /landing, /verify/*, /invite/*, /w/[slug]/(login|register|forgot-password|reset-password)

### Redirect se Autenticado

| Path | Redirect destino |
|------|-----------------|
| /login, /register, /admin/login | /admin |
| /producer/login, /producer/register | /producer |
| / (autenticado) | /producer |
| /w/[slug]/login (sem ?preview) | /w/[slug] |

### Redirect se NÃO Autenticado

| Path | Redirect destino |
|------|-----------------|
| /admin/* | /admin/login |
| /producer/* | /producer/login |
| /w/[slug]/* | /w/[slug]/login |
| Outros | /producer/login |

### API Routes

Middleware retorna next() direto. Auth é per-handler.

### Matcher

Exclui _next/static, _next/image, favicon.ico e assets estáticos por extensão.

---

## 6. Padrões de Auth nas APIs

**Admin routes:**
```
requireAdminOrCollab()           // Dashboard, drilldowns
requireAdminPerm("VIEW_REPORTS") // Granular
requireAdmin()                   // Só ADMIN puro (test-email, users)
```

**Producer routes:**
```
const staff = await requireStaff()
requirePermission(staff, "MANAGE_STUDENTS")  // Granular
canEditCourse(staff, courseId)                // Ownership
```

**Student/Public routes:**
```
const user = await getCurrentUser()
isEnrollmentActive(enrollment)               // Acesso ao conteúdo
```

**Webhooks:** Token customizado via safeCompare (timing-safe) ou HMAC-SHA256 (Stripe)

**Cron:** Header Authorization: Bearer $CRON_SECRET

---

## 7. Rate Limiting

| Spec | Valor |
|------|-------|
| Janela | 60 segundos |
| Limite | 100 requests por IP+rota-prefixo |
| Chave | `${ip}:${pathname.split('/')[2]}` |
| Storage | Map em memória |
| Cleanup | Oportunístico quando size > 5000 |
| Resposta | 429 com Retry-After |

**Aplicado em:** login, register, forgot-password, reset-password, impersonate-session, mfa/challenge, invite accept, cron/billing, integrations/request.

**Não aplicado em:** rotas de leitura, webhooks externos (confiam em token).

---

## 8. RLS no Postgres (Supabase)

**Postura:** RLS habilitado sem policies permissivas = bloqueio total para anon/authenticated. O app sempre usa service_role (Prisma), que bypassa RLS. RLS serve como defesa em profundidade contra leakage via Supabase client direto.

**50 tabelas com RLS habilitado:**

AccessLog, AdminCollaborator, AuditLog, Automation, AutomationLog, BillingReminder, Certificate, Collaborator, Comment, CommunityGroup, Course, Enrollment, EnrollmentOverride, ImpersonateToken, IntegrationRequest, Invoice, Lesson, LessonComment, LessonMaterial, LessonProgress, LessonReaction, Like, Live, LiveMessage, LiveModerator, LiveNotification, MenuItem, Module, Notification, PendingExecution, Plan, PlatformSettings, Post, ProducerTransaction, PushSubscription, Quiz, QuizAttempt, QuizOption, QuizQuestion, Review, Section, Session, Settings, Subscription, SupportTicket, Tag, TicketMessage, User, UserTag, WebhookLog, Workspace

---

## 9. Storage Policies

| Bucket | Público? | Read | Write/Update/Delete |
|--------|----------|------|---------------------|
| avatars | Sim (CDN) | service_role only (LIST bloqueado) | service_role only |
| materials | Sim (CDN) | service_role only | service_role only |
| thumbnails | Sim (CDN) | service_role only | service_role only |
| ticket-attachments | Não (private) | service_role only (signed URLs) | service_role only |

**Nota:** bucket.public=true permite acesso via `/storage/v1/object/public/...` sem consultar policies. Anon LIST bloqueado pra não expor nomes de arquivos.

---

## 10. Auditoria & IP Tracking

**AuditLog:** logAudit() com falha silenciosa. Chamado em login, MFA, impersonate, subscription transitions.

**AccessLog:** Coletado em login routes e telemetria de /api/auth/me. Schema: userId, ip, userAgent, path.

**IP Collection Points (5):** auth/login, auth/producer-login, w/[slug]/login, auth/me, lib/audit.ts

---

## 11. Encryption

| Campo | Modelo | Algoritmo |
|-------|--------|-----------|
| User.document | CPF/CNPJ | AES-256 com ENCRYPTION_SECRET |

---

## 12. Tabela de Capacidades — Quem Pode o Quê

### Plataforma

| Ação | ADMIN | ADMIN_COLLAB | PRODUCER | COLLAB | STUDENT |
|------|-------|-------------|----------|--------|---------|
| Criar plano | ✅ | MANAGE_PLANS | ❌ | ❌ | ❌ |
| Suspender producer | ✅ | MANAGE_PRODUCERS | ❌ | ❌ | ❌ |
| Ver audit log | ✅ | VIEW_AUDIT | ❌ | ❌ | ❌ |
| Test email / configs | ✅ (puro) | ❌ | ❌ | ❌ | ❌ |
| Impersonate user | ✅ | MANAGE_PRODUCERS | ❌ | ❌ | ❌ |

### Workspace

| Ação | ADMIN | ADMIN_COLLAB | PRODUCER | COLLAB | STUDENT |
|------|-------|-------------|----------|--------|---------|
| Criar workspace | ✅ | ❌ | ✅ (limit por plano) | ❌ | ❌ |
| Editar workspace | ✅ | ❌ | Só dono | ❌ | ❌ |
| Convidar collab | ✅ | ❌ | ✅ | ❌ | ❌ |

### Curso

| Ação | ADMIN | ADMIN_COLLAB | PRODUCER | COLLAB | STUDENT |
|------|-------|-------------|----------|--------|---------|
| Criar curso | ✅ | ❌ | ✅ | ❌ | ❌ |
| Editar curso/módulo/aula | ✅ | ❌ | Dono | MANAGE_LESSONS | ❌ |
| Matricular aluno | ✅ | ❌ | Dono | MANAGE_STUDENTS | ❌ |
| Ver analytics | ✅ | ❌ | Dono | VIEW_ANALYTICS | ❌ |
| Moderar comunidade | ✅ | ❌ | Dono | MANAGE_COMMUNITY | ❌ |
| Responder comentário | ✅ | ❌ | Dono | REPLY_COMMENTS | ❌ |

### Aluno

| Ação | ADMIN | ADMIN_COLLAB | PRODUCER | COLLAB | STUDENT |
|------|-------|-------------|----------|--------|---------|
| Acessar aula | Preview | ❌ | Preview (dono) | ❌ | Matriculado + active + released |
| Postar na comunidade | ❌ | ❌ | ❌ | ❌ | Matriculado + communityEnabled |
| Submeter quiz | ❌ | ❌ | ❌ | ❌ | Matriculado |

---

## 13. Camadas de Defesa (13 camadas)

```
 1. DNS/CDN (Cloudflare)        — DDoS / WAF
 2. Vercel Edge                 — TLS, regions
 3. Proxy (src/proxy.ts)        — sessão por cookie + redirect
 4. Rate limit (per IP+route)   — 100 req/min em endpoints sensíveis
 5. Per-handler auth            — requireAuth/Staff/Admin/AdminPerm
 6. Resource ownership          — canEditCourse/Module/Lesson
 7. Granular perm checks        — requirePermission / adminHasPerm
 8. RLS (50 tables)             — anon bloqueado por padrão
 9. Storage policies            — service_role only para writes
10. AES-256 (document)          — PII encriptada
11. Audit log                   — operações privilegiadas
12. MFA (TOTP)                  — staff com factor verified
13. Validação Zod (88/88)       — input sanitization em todas APIs JSON
```

---

## 14. Considerações para Evolução

**Inconsistências históricas:**
- STUDENT-with-Collaborator: existem users com role="STUDENT" mas Collaborator(status=ACCEPTED). requireStaff() sintetiza role no request. Deve ser tratado em audit logs como STUDENT.
- Plan ↔ Subscription: sem cascade. Deletar Plan com Subscription ativa bloqueia (Prisma error). Por design.

**Pontos de atenção:**
- `requireStaff` retorna User com role sintético — código que persistir staff.role em DB precisa ler User.role original
- `getCollaboratorContext` pega só a primeira Collaborator ACCEPTED — modelo assume 1 collab context por request
- Collaborator.permissions e AdminCollaborator.permissions são string[] sem FK enforcement — validação server-side

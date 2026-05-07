# Members Club — Fluxo UX

> Mapa completo de navegação — 75 páginas, sidebars por role, fluxos de auth/onboarding, redirects, estados especiais, tours guiados, modais e PWA.
> Última atualização: 06 de maio de 2026.

---

## 1. Mapa de Páginas (75 page.tsx)

### Páginas Públicas (sem auth)

| Path | Função |
|------|--------|
| /landing (rewrite do apex) | Marketing — apenas em mymembersclub.com.br |
| /login | Login admin |
| /register | Registro admin |
| /admin/login | Login admin (variante) |
| /producer/login | Login produtor/colaborador |
| /producer/register | Sign-up produtor |
| /forgot-password | Solicitar reset |
| /reset-password | Confirmar reset (via link de email) |
| /verify-email | Verificação de email |
| /auth/impersonate | Aplica token de impersonate |
| /verify/[code] | Validação pública de certificado |
| /invite/[id] | Aceitar convite de Collaborator |
| /invite/admin/[id] | Aceitar convite de AdminCollaborator |
| /w/[slug]/login, /register | Auth do workspace |
| /offline | Fallback PWA quando offline |

### Painel ADMIN (/admin/*)

| Path | Permissão |
|------|-----------|
| /admin | Qualquer admin/collab aceito |
| /admin/producers | MANAGE_PRODUCERS |
| /admin/producers/[id] | MANAGE_PRODUCERS |
| /admin/producers/[id]/subscription | MANAGE_BILLING |
| /admin/support | SUPPORT |
| /admin/reports | VIEW_REPORTS |
| /admin/audit | VIEW_AUDIT |
| /admin/plans | MANAGE_PLANS |
| /admin/subscriptions | MANAGE_BILLING |
| /admin/integrations, /settings, /settings/security | FULL_ACCESS |
| /admin/collaborators | Só ADMIN puro |

### Painel PRODUCER (/producer/*)

| Path | Função |
|------|--------|
| /producer | Dashboard (KPIs + vitrine) |
| /producer/workspaces | Listar workspaces |
| /producer/workspaces/new | Criar workspace |
| /producer/workspaces/[id]/edit | Editar workspace |
| /producer/courses | Listar cursos |
| /producer/courses/new | Criar curso |
| /producer/courses/[id]/edit | Editar curso (tabs Informações + Conteúdo) |
| /producer/courses/[id]/students | Alunos do curso |
| /producer/courses/[id]/comments | Comentários para revisar |
| /producer/courses/[id]/customize | Personalização (cores, layout) |
| /producer/courses/[id]/menu | Menu lateral custom |
| /producer/courses/[id]/settings | Settings + comunidade |
| /producer/users | Listar alunos do workspace |
| /producer/users/[id] | Detalhe do aluno (IP, atividade, tags) |
| /producer/community | Comunidade global |
| /producer/analytics | Dashboard analytics |
| /producer/automations | Listar automações |
| /producer/automations/tags | Tags de alunos |
| /producer/lives | Listar lives |
| /producer/lives/[id] | Live detail |
| /producer/settings | Hub de configurações |
| /producer/settings/billing | Plano + cobrança |
| /producer/settings/collaborators | Colaboradores |
| /producer/settings/integrations | Hub integrações |
| /producer/settings/integrations/applyfy | Config Applyfy |
| /producer/settings/integrations/stripe | Config Stripe |
| /producer/settings/security | 2FA + sessões |
| /producer/profile | Perfil + senha |

### Vitrine STUDENT

| Path | Função |
|------|--------|
| / | Vitrine global (cursos enrolled + store) |
| /profile | Meu Perfil |
| /course/[slug] | Página do curso (módulos/aulas) |
| /course/[slug]/module/[moduleId] | Detalhe do módulo |
| /course/[slug]/lesson/[id] | Player + descrição + materiais + comentários + quiz |
| /course/[slug]/community | Comunidade do curso |

### Workspace /w/[slug]/*

| Path | Função |
|------|--------|
| /w/[slug] | Vitrine themed do workspace |
| /w/[slug]/lives, /lives/[id] | Lives da workspace |
| /w/[slug]/profile | Perfil dentro da workspace |
| /w/[slug]/login, /register | Auth scoped ao workspace |

---

## 2. Navegação — Sidebars por Role

### Sidebar STUDENT (2 itens)

| Label | Path |
|-------|------|
| Vitrine | / |
| Meu Perfil | /profile |

### Sidebar PRODUCER (9 itens)

| Label | Path | Tour ID |
|-------|------|---------|
| Dashboard | /producer | nav-dashboard |
| Workspaces | /producer/workspaces | nav-workspaces |
| Meus Cursos | /producer/courses | nav-courses |
| Meus Alunos | /producer/users | nav-students |
| Comunidade | /producer/community | nav-community |
| Relatórios | /producer/analytics | nav-reports |
| Automações | /producer/automations | nav-automations |
| Lives | /producer/lives | nav-lives |
| Configurações | /producer/settings | nav-settings |

### Sidebar COLLABORATOR (filtrado por permissões)

Dashboard (VIEW_ANALYTICS), Cursos (sempre), Alunos (MANAGE_STUDENTS), Comunidade (MANAGE_COMMUNITY), Relatórios (VIEW_ANALYTICS)

### Sidebar ADMIN (10 itens)

| Label | Path | Permissão |
|-------|------|-----------|
| Dashboard | /admin | Todos |
| Produtores | /admin/producers | MANAGE_PRODUCERS |
| Suporte | /admin/support | SUPPORT |
| Relatórios | /admin/reports | VIEW_REPORTS |
| Logs | /admin/audit | VIEW_AUDIT |
| Planos | /admin/plans | MANAGE_PLANS |
| Assinaturas | /admin/subscriptions | MANAGE_BILLING |
| Integrações | /admin/integrations | FULL_ACCESS |
| Colaboradores | /admin/collaborators | Só ADMIN puro |
| Configurações | /admin/settings | FULL_ACCESS |

---

## 3. Auth Flow

### Login Producer
```
/producer/login (sem cookie)
  ↓ Submit email+password → POST /api/auth/producer-login
  ├── Credentials inválidas → toast erro
  ├── Role inválido → toast "Use admin/login" ou "acesse pelo link do curso"
  ├── Tem MFA verified → response { requiresMfa, factorId }
  │     ↓ UI pede TOTP
  │     POST /api/auth/mfa/challenge { factorId, code }
  │     ↓ AAL2 set + Session created + audit
  │     redirect → "/"
  └── Sem MFA → Session created + audit → redirect "/"
      ↓ proxy.ts vê cookie, redireciona "/" → "/producer"
```

### Reset de Senha
```
/forgot-password → POST /api/auth/forgot-password (rate-limited)
  ↓ Email com link → /reset-password com hash de tokens
  ↓ setSession (AAL1 recovery) → digita nova senha
  ↓ POST /api/auth/reset-password → signOut → forçar relogin (pede MFA)
```

### Impersonate
```
ADMIN → /admin/producers/[id] → "Logar como"
  ↓ POST /api/admin/producers/[id]/impersonate
  ↓ ImpersonateToken (one-time, 5 min)
  ↓ URL com token → aba anônima (countdown 30s)
  ↓ POST /api/auth/impersonate-session → setSession → redirect /producer
```

---

## 4. Producer Journey (Onboarding ao Primeiro Curso)

```
Landing page → "Criar minha conta"
  ↓ /producer/register
  ↓ /verify-email?next=/producer/billing
  ↓ Email confirmado → /producer/settings/billing (welcome=true)
  ↓ "Assinar agora" → Applyfy checkout (nova aba)
  ↓ Webhook TRANSACTION_PAID → Subscription ACTIVE
  ↓ /producer (dashboard)
  ↓ Criar primeira workspace → Criar primeiro curso
  ↓ Editar curso (aba Informações → aba Conteúdo)
  ↓ Matricular alunos → Curso live!
```

### Aba Conteúdo — 5 sub-abas

1. **Informações** — title, slug, description, thumbnail, banner, price, suporte
2. **Conteúdo** — sections, modules, lessons, materials, quiz
3. **Alunos** — listar/matricular/remover
4. **Comentários** — moderação
5. **Personalizar** — cores/layout/welcome text

---

## 5. Student Journey

```
Email de matrícula (access link)
  ↓ /w/SLUG/login ou /producer/login
  ↓ Cookie set → / (vitrine)
  ↓ Card de curso → /course/SLUG
  ↓ Lista módulos/aulas → /course/SLUG/lesson/ID
  ↓ Player (YouTube/Vimeo) + Descrição + Materiais + Comentários
  ↓ Quiz (se habilitado) → Score + Aprovado/Reprovado
  ↓ Concluir aula → +pontos → level up? → autoplay próxima
  ↓ 100% curso → Certificado disponível
```

### Mecanismos de Drip Release
- Module.daysToRelease e Lesson.daysToRelease cumulativos (max)
- Base = Enrollment.createdAt
- Module.releaseAt (data absoluta) como override
- EnrollmentOverride libera módulo/aula manualmente para aluno específico

---

## 6. Redirects — Matriz Completa

| Origem | Destino | Trigger |
|--------|---------|---------|
| mymembersclub.com.br/ | rewrite → /landing | Proxy host check |
| app.*/  (autenticado) | /producer | Proxy redirect |
| /producer/billing | /producer/settings/billing | Server redirect |
| /producer/integrations | /producer/settings/integrations | Server redirect |
| /producer/collaborators | /producer/settings/collaborators | Server redirect |
| /producer/courses/[id] | /producer/courses/[id]/edit | Server redirect |
| /producer/register (success) | /verify-email?next=/producer/billing | Client |
| /auth/impersonate (token válido) | /producer | Client |
| lesson/[id] (404/403) | /course/[slug] | Client useEffect |
| /login (logado) | /admin | Proxy |
| /producer/login (logado) | /producer | Proxy |
| /w/[slug]/login (logado) | /w/[slug] | Proxy |

---

## 7. Estados Especiais

### Plano Expirado/Suspenso (Producer)
SubscriptionGate wrappa /producer/* → mostra modal/banner de pagamento

### Acesso de Aluno Expirado
- course-card.tsx: badge "Expirado" + "Renovar acesso" → checkoutUrl
- lesson page: CTA "Renovar acesso" no error block

### Conteúdo Bloqueado (Drip)
- Card com lock badge + tooltip "Liberado em X dias"
- Lesson 403: "Este conteúdo será liberado em X dia(s)"

### Módulo Bloqueado por Automação
- getAutomationLocks retorna locks ativos
- Lock badge: "Complete o módulo anterior para desbloquear"

### Workspace Suspenso
- Redireciona pra "workspace temporariamente indisponível"

### Termos Pendentes
- TermsModal força aceitar antes de qualquer ação no curso

---

## 8. Tour Guiado (driver.js)

### ProducerTour (11 steps)
Trigger: onboardingCompletedAt === null E Subscription ativa.
Steps: dashboard-header, date-selector, nav-workspaces, nav-courses, nav-students, nav-community, nav-reports, nav-automations, nav-lives, nav-settings, CTA final.
Filtrado por permissão para COLLABORATOR.

### CourseTour (3 steps)
course-tabs, course-tab-info, course-tab-content

### StudentTour (6 steps)
Trigger: studentOnboardingCompletedAt === null.
Steps: student-nav-home, student-banner, student-my-courses, student-search, student-nav-lives, student-nav-profile.

---

## 9. Modais e Drawers

| Component | Função |
|-----------|--------|
| confirm-modal.tsx | Confirmação destrutiva (danger/warning) |
| terms-modal.tsx | Aceitar termos do curso |
| import-students-modal.tsx | CSV import de alunos |
| quiz-manager.tsx (modal interno) | Criar/editar pergunta de quiz |
| rich-text-editor.tsx | Tiptap editor |
| email-editor.tsx | Composer de email rich-text |
| course-sidebar.tsx | Drawer mobile no (course)/layout |
| sidebar.tsx | Sidebar mobile drawer |

---

## 10. Componentes Globais (todas páginas autenticadas)

| Component | Função |
|-----------|--------|
| NotificationsBell | Bell + dropdown de notificações |
| GlobalSearch | Cmd+K search (cursos, alunos, posts) |
| SupportPopover / SupportChatWidget | Chat de suporte |
| ProducerThemeProvider | Aplica User.themeConfig |
| ThemeToggle | Light/dark mode |
| DynamicFavicon | Favicon por workspace |
| AuthProvider | Contexto Supabase |
| PWARegister | Service worker (skip apex) |

---

## 11. Landing Page (mymembersclub.com.br)

**Estrutura:**
1. Nav fixo — links âncora + CTAs (Entrar / Criar minha conta)
2. Hero — headline + 2 CTAs
3. Stats — 50+, ∞, 10, 99.9%
4. Features — 12 cards
5. Mockups — 3 sections (Dashboard / Comunidade / Personalização)
6. Diferenciais — 3 cards (Segurança, Automações, Painel)
7. Security — 8 itens
8. Pricing — Plano Pro R$97/mês + 16 features
9. CTA Final — "Criar minha conta grátis"
10. Footer

---

## 12. PWA + Push

**Install:** InstallPrompt detecta beforeinstallprompt e mostra CTA.
**Manifest:** dinâmico por workspace via /api/manifest/[slug].
**Push:** VAPID subscribe → server envia em eventos (like, comment, reply, enrollment, level_up, live, ticket).

---

## 13. Fluxos Críticos (Resumo)

1. **Producer onboarding:** landing → register → verify → billing → dashboard → workspace → curso
2. **Student access:** email → login → vitrine → curso → aula → quiz/certificado
3. **Quiz:** lesson → submeter → score → tentativa salva
4. **Comunidade:** feed categorizado → composer → comentários threaded → likes → moderação
5. **Lives:** agendar → notificação push → LIVE → chat → ENDED → salvar como Lesson
6. **Suporte:** producer abre ticket → admin responde → threading + attachments + read receipts

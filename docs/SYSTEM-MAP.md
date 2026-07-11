# SYSTEM MAP — referência de arquitetura (ler no início de toda sessão)

> Objetivo: nunca mais confundir os conceitos do Members Club. Fonte: código + PLANO-MESTRE + memória das investigações (BUG B, BUG C, inventários). Onde não foi lido no código, está marcado **CONFIRMAR**.
> Plataforma: Next 16 / React 19 / Supabase Auth / Prisma / Vercel (gru1) atrás de Cloudflare. Produto: "Members Club".

---

## 1) VOCABULÁRIO

- **Workspace** = a "área de membros" de um produtor (tem `slug`, tema, branding, `masterPassword`, `ownerId`). Um **PRODUCER pode ter VÁRIOS** workspaces (limitado por `plan.maxWorkspaces`, `src/lib/plan-limits.ts:37`). Cada workspace contém vários cursos. URL pública: `/w/{slug}`.
- **Curso** = uma unidade de conteúdo **DENTRO de um workspace** (`Course.workspaceId`). Tem módulos → aulas. Um workspace tem N cursos; um curso pertence a 1 workspace.
- ⚠️ **workspace ≠ curso.** Workspace é o "container/marca" (a área de membros); curso é o produto dentro dela. O aluno se matricula em **cursos** (`Enrollment`), mas loga num **workspace** (`/w/{slug}/login`).

**Os 5 roles** (enum `Role`):
- **ADMIN** — dono da plataforma (nós). Vê o `/admin` (MRR, produtores, planos). Senha global.
- **ADMIN_COLLABORATOR** — colaborador do time da plataforma, com permissões admin granulares (SUPPORT, MANAGE_PRODUCERS, MANAGE_PLANS, MANAGE_BILLING, VIEW_REPORTS, VIEW_AUDIT, FULL_ACCESS). Entra pelo `/admin`. Senha global.
- **PRODUCER** — o cliente pagante; dono de workspace(s) e curso(s). Entra pelo `/producer`. Senha global.
- **COLLABORATOR** — colaborador de um PRODUCER, com permissões de workspace granulares (MANAGE_LESSONS, MANAGE_STUDENTS, MANAGE_COMMUNITY, REPLY_COMMENTS, MANAGE_LIVES, MANAGE_AUTOMATIONS). Entra pelo `/producer`. Senha global.
- **STUDENT** — o aluno. Compra/recebe acesso a cursos. Entra pela área de membros `/w/{slug}/login`. Senha **por-workspace** (`WorkspaceCredential`) — ver §4.
  - ⚠️ **STUDENT-com-Collaborator (C6):** um STUDENT que também tem uma row `Collaborator` ACCEPTED funciona como colaborador (`requireStaff` o promove a COLLABORATOR na request; ele usa a senha **global**, não a WorkspaceCredential). O `collaborator` populado no `/api/auth/me` é o discriminador.

---

## 2) AS 3 ÁREAS e como se entra

| Área | Pra quem | Tela de login | API de login | Gate (arquivo real) |
|---|---|---|---|---|
| **`/admin`** — painel da plataforma | ADMIN + ADMIN_COLLABORATOR | `/admin/login` | `POST /api/auth/login` | aceita ADMIN∥ADMIN_COLLABORATOR (`login/route.ts:49-50`); rejeita o resto (403). Shell: `admin/layout.tsx:41` `isAdminRole = ADMIN∥ADMIN_COLLABORATOR` |
| **`/producer`** — painel do produtor | PRODUCER, COLLABORATOR, STUDENT-collab | `/producer/login` | `POST /api/auth/producer-login` | aceita PRODUCER∥COLLABORATOR∥STUDENT-collab (`producer-login/route.ts:50-54`); ADMIN→"use /admin/login", STUDENT→"link do curso" (403). Shell (server): `producer/layout.tsx:34-38` `isStaff` |
| **`/w/{slug}`** — área de membros do aluno | STUDENT (e staff com acesso ao ws) | `/w/{slug}/login` | `POST /api/w/[slug]/login` | dual-auth (§4): aluno puro→WorkspaceCredential, staff→global. Access gate: `hasWorkspaceAccess` (enrollment∥collab∥owner), `login/route.ts:196` |

**Middleware** (`src/proxy.ts`): **role-blind** — só checa **presença** de cookie (`hasSessionCookie`, :63), não validade nem role. Apex `/` → rewrite `/landing` (:52). `authed && "/"` → `/w/{activeWs}` (cookie) senão `/producer` (:88).

---

## 3) ROTEAMENTO — pra onde cada role vai

Regra do Vinicius: "cada um vai pro lugar do seu link". Estado atual:

| Entrou / está autenticado como | Deveria ir pra | HOJE | Status | Prova |
|---|---|---|---|---|
| ADMIN em `/admin/login` | `/admin` (dashboard) | `/admin` | ✅ OK | [código] |
| ADMIN_COLLABORATOR em `/admin/login` | `/admin` (dashboard) | `/admin` | ✅ **OK** (BUG B `4ad99f5`; antes caía na `/landing`) | **[browser]** (testado ao vivo no BUG B) |
| PRODUCER em `/producer/login` | `/producer` | `/producer` | ✅ OK | [código] |
| COLLABORATOR / STUDENT-collab | `/producer` | `/producer` | ✅ OK | [código] |
| STUDENT em `/w/{slug}/login` | `/w/{slug}` (vitrine) | `/w/{slug}` | ✅ OK | [código] |
| autenticado que acessa `/` (apex) | seu lugar | cookie `active_workspace_slug`→`/w/{slug}`, senão `/producer` | ⚠️ **QUEBRADO p/ aluno sem cookie** (BUG D) | [código] |
| STUDENT deslogado num curso | `/w/{slug}/login` | `/producer/login` | ⚠️ **esquisito** (candidato UX) | [código] |

> **Prova:** `[browser]` = comportamento verificado ao vivo num navegador. `[código]` = lido no código, **não** testado em runtime. **Só o ADMIN_COLLABORATOR foi [browser]** (BUG B) — os demais ✅ são inferência do código; para rigor total, tratar como "a confirmar".

**⚠️ Órfãos de roteamento registrados (BUG B, NÃO corrigidos):**
- `producer/layout.tsx:34` — `isStaff` NÃO inclui ADMIN_COLLABORATOR → é o **terminal** que joga na `/landing`.
- `proxy.ts:88` — role-blind, `"/"`→`/producer`.
- **BUG D** — STUDENT logado sem cookie de ws e sem Collaborator → `/landing`.
- `sidebar.tsx:392` — logo `href="/"` → re-expulsa ADMIN_COLLABORATOR.
- `landing:98` — CTA "Entrar" → `/producer/login` (rejeita ADMIN_COLLABORATOR com 403).

---

## 4) O DUAL-AUTH (a raiz do BUG C — NÃO esquecer)

Duas senhas coexistem por design (nasceu em **2026-05-08**, migração `20260508000000_workspace_credential`):

- **Senha GLOBAL** = Supabase Auth (`auth.users`). Usada por **staff e collaborators** (identidade platform-wide). O comprador STUDENT também tem uma global, mas é **aleatória e nunca revelada** (`generateTempPassword()`, `webhook-helpers:73`) — legacy fallback.
- **WorkspaceCredential** (`schema:147`, `passwordHash`+`salt` scrypt, por `(userId, workspaceId)`) = a senha **REAL do aluno puro**, por workspace. É a que ele recebe no email de acesso (`mc-XXXXXX`) e a que o `/w/{slug}/login` valida (`verifyPassword`).

**O discriminador EXATO** (quem usa global vs WorkspaceCredential) — vive idêntico em **4 lugares**:
```
const useGlobal = STAFF_ROLES.has(role) || !!acceptedCollaborator
STAFF_ROLES = { PRODUCER, ADMIN, COLLABORATOR, ADMIN_COLLABORATOR }
```
- `w/[slug]/login/route.ts:91-100` (o login) · `webhook-helpers.ts:131-138` · `w/[slug]/forgot-password:65-71` · `w/[slug]/password:38-48` (a rota do BUG C).
- ⚠️ **NUNCA usar "tem WorkspaceCredential" como discriminador:** 6 PRODUCERs + 1 STUDENT-collab têm rows de credencial **mortas** (nunca consultadas no login deles).

**O BUG C era:** `/api/auth/password` (troca de senha) validava a **global** → aluno puro (que só conhece a mc- da credencial) tomava "senha atual incorreta". Corrigido com a rota escopada `/api/w/[slug]/password` (`9fac2d9`).

---

## 5) ESTADO (puxado do PLANO-MESTRE)

**FEITO (merge SHA):**
- FASE 1 segurança: 1.1–1.14 ✅ (todos com SHA no plano). Abertos: **1.5** (magic-link convite) e **1.6** (token single-use) — dependem da Fase 3 / migração.
- FASE 2: 2.1 HSTS `de00875` · 2.2 npm audit `7eaaf66` · 2.3 XSS `3d40bc3` · 2.6/2.6b email sanitize `aa0e1a2`/`98b1381` · 2.7 + Candidato-2 (não-itens). Abertos: **2.4** rate-limit compartilhado · **2.5** CSP.
- FASE 4: 4.1 (via 1.12) · 4.2 `022f933` · 4.3 `159fc0f` · 4.4 (condição eliminada) ✅. Aberto: **4.5** console.error (decisão de forma pendente).
- BUG A materials upload `f2ea405` · **BUG B** admin-collab dashboard `4ad99f5` · **BUG C** troca senha aluno `9fac2d9` · **1.2/1.3** rateLimit 2 rotas `c3bad5a`.
- **BUG C-irmão** 🟢 housekeeping (hipótese "tranca" refutada; achados: código morto + comentário errado + resend sem senha).

**ABERTO:**
- 1.5, 1.6 (convite) · 2.4 (rate-limit; **input**: balde compartilhado por segmento `w` — precisa chave por-rota) · 2.5 (CSP) · 4.5 (console.error) · FASE 3 (email A retry + B EmailLog) · FASE 5 quick-wins (5.1 custom domain / 5.2 admin-nav integrations / 5.3 toggle box / 5.4 CSV editor) · FASE 6 (épico multi-gateway) · FASE 9 (débito/QA).
- Órfãos de roteamento do BUG B (§3) · BUG C-irmão housekeeping.

---

## 6) REGRAS DE NEGÓCIO NOVAS — **DECIDIDO, não implementado**

Definidas pelo Vinicius, ainda **sem código**:

### 6a) Raiz Inteligente — **DECIDIDO, não implementado**
O apex `/` recebe **email + senha** e IDENTIFICA o tipo de conta, ramificando:
- **PRODUCER** → **LOGA na própria raiz** → vai pro painel `/producer`.
- **conta que é aluno E producer** → **tenta logar**; se a senha estiver errada → erro **"senha incorreta"** (pode confirmar que a conta existe, porque ela é produtor).
- **SÓ aluno** (não é producer) → **NÃO loga na raiz**; se a senha estiver errada → **mensagem NEUTRA** (não revela se a senha/conta existe); mostra a **LISTA dos workspaces** do aluno → clicar num → abre **NOVA GUIA** em `/w/{slug}/login` → ele loga lá.

⚠️ **REGRA DE SEGURANÇA (registrar literal):** a mensagem de erro difere por tipo de conta — **só-aluno = mensagem NEUTRA** (anti-enumeração; nunca confirmar existência de conta/senha); **aluno-que-é-também-producer = "senha incorreta"** (pode confirmar, pois a identidade de produtor já é assumida no login). Não vazar, no ramo só-aluno, se o email existe.

**Já existe (metade da lógica):** `POST /api/auth/student-workspaces` (67 linhas) — recebe `email`, agrupa workspaces por `Enrollment` ACTIVE (`isActive`), e **responde SEMPRE `{ok:true}`** (anti-enumeração ✅). MAS: hoje ele **ENVIA a lista por EMAIL** (`studentWorkspacesList` template), **não** a mostra inline; **não valida senha**; **não distingue producer/aluno**. → Reutilizável: o agrupamento + o anti-enum já estão prontos; falta o fluxo de identificar-e-ramificar na raiz + render inline da lista + nova-guia. **Não é item pequeno** (é um novo fluxo de auth na raiz), mas parte da base existe.

### 6b) Trava de Contexto — **DECIDIDO, não implementado** (opção A: bloqueia COM AVISO)
Cada área é **isolada**. Quem está logado numa área e tenta invadir outra é **BLOQUEADO com aviso claro** (não redirecionado em silêncio, não despejado na landing). Regra: **fica onde está; pra mudar de área, desloga primeiro.**

| Logado em | Tenta acessar | Ação |
|---|---|---|
| `/admin` | `/producer` **ou** `/w/{slug}` | 🚫 BLOQUEIA + aviso |
| `/producer` | `/admin` **ou** `/w/{slug}` | 🚫 BLOQUEIA + aviso |
| workspace A (`/w/A`) | workspace B (`/w/B`) **ou** `/producer` **ou** `/admin` | 🚫 BLOQUEIA + aviso |

Relacionado aos órfãos do §3 (hoje o sistema redireciona/despeja em vez de bloquear-com-aviso).

---

*Doc vivo. Atualizar a cada área/role novo, a cada órfão fechado, e quando as regras do §6 saírem do papel. Se algo aqui divergir do código, o código vence — e corrija o doc.*

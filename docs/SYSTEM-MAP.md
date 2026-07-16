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
| autenticado que acessa `/` (apex) | seu lugar | cookie `active_workspace_slug`→`/w/{slug}`, senão `/producer` → **aviso da Trava com resolução real** | ✅ **FEITO** (Trava `9d8b7a2` — BUG D morto) | **[browser]** (matriz 16 passos) |
| STUDENT deslogado num curso | `/w/{slug}/login` | `/producer/login` | ⚠️ **esquisito** (candidato UX) | [código] |

> **Prova:** `[browser]` = comportamento verificado ao vivo num navegador. `[código]` = lido no código, **não** testado em runtime.

**⚠️ CORREÇÕES PROVADAS na Trava (2026-07-15) — o que a investigação #1 tinha errado:**
- **(i) Client-nav PASSA pelo middleware.** A afirmação "client-nav não passa pelo proxy" estava **ERRADA** — requests RSC de `<Link>`/`router.replace` são GETs que o matcher intercepta (provado por curl com header `RSC: 1`: 307 idêntico). Foi a raiz do β (clique morto: 307 pra rota atual = no-op).
- **(ii) ADMIN × `/w/[slug]` = ACESSA por design.** O gate do init exceptua ADMIN (`init/route.ts:55` — `if (user.role !== "ADMIN")`); `hasWorkspaceAccess` documenta "callers should skip for ADMIN". Por isso a etapa ③ da matriz ENTROU em vez de avisar.
- **(iii) `(dashboard)/page` é INALCANÇÁVEL para qualquer authed** — o proxy sempre redireciona `/` antes (server E client-nav, provado). O StudentHome só existiria pós-Raiz.

**⚠️ Órfãos de roteamento (estado pós-Trava `9d8b7a2`):**
- ~~`producer/layout.tsx:34` — isStaff sem ADMIN_COLLABORATOR → `/landing`~~ ✅ **MORTO** (aviso da Trava).
- ~~**BUG D** — STUDENT sem cookie → `/landing`~~ ✅ **MORTO** (aviso + resolução via student-workspace).
- `proxy.ts:88` — role-blind, `"/"`→`/producer` (vivo; a Raiz §6a assume).
- `sidebar.tsx:392` — logo `href="/"` (vivo, MITIGADO: hoje pousa no aviso da Trava, não na landing).
- `landing:98` — CTA "Entrar" → `/producer/login` (rejeita ADMIN_COLLABORATOR com 403) (vivo).
- `(auth)/login/page.tsx:4` — **`/login` → redirect `/admin/login`** (achado da Trava; o antigo destino "sem-workspace" do dashboard apontava pra cá — removido no `9d8b7a2`; a rota em si segue viva).

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

**A MASTER PASSWORD** (`Workspace.masterPassword`, plaintext — skeleton-key do produtor) é um 3º caminho no ws-login (bloco 1, prioridade máxima). ⚠️ **Gate = VÍNCULO DE ALUNO, não role** (corrigido em `1fdfd1e`/PM 7.8): `Enrollment ACTIVE não-expirado no ws` (`isEnrollmentActive`), qualquer role — **nunca** owner/collab sem matrícula (esses usam a global). Antes gateava `role === "STUDENT"` → cega p/ 14 híbridos reais (produtor que é aluno de outro produtor). Sessão nasce via magic-link (AAL1); híbrido **com MFA** é rejeitado pelo `getCurrentUser` AAL-gate (limitação declarada). Não rotaciona senha nenhuma.

---

## 5) ESTADO (puxado do PLANO-MESTRE)

**FEITO (merge SHA):**
- FASE 1 segurança: 1.1–1.14 ✅ (todos com SHA no plano). Abertos: **1.5** (magic-link convite) e **1.6** (token single-use) — dependem da Fase 3 / migração.
- FASE 2: 2.1 HSTS `de00875` · 2.2 npm audit `7eaaf66` · 2.3 XSS `3d40bc3` · 2.6/2.6b email sanitize `aa0e1a2`/`98b1381` · 2.7 + Candidato-2 (não-itens). Abertos: **2.4** rate-limit compartilhado · **2.5** CSP.
- FASE 4: 4.1 (via 1.12) · 4.2 `022f933` · 4.3 `159fc0f` · 4.4 (condição eliminada) ✅. Aberto: **4.5** console.error (forma decidida: guard-por-status — `console.error` só ≥500; aguardando implementação).
- BUG A materials upload `f2ea405` · **BUG B** admin-collab dashboard `4ad99f5` · **BUG C** troca senha aluno `9fac2d9` · **2.4a** rateLimit stopgap 2 rotas `c3bad5a` (ex-"1.2/1.3" — rebatizado p/ não colidir com os itens 1.2/1.3 da FASE 1) · **5.4** CSV import no editor de curso `2c2ef5b` · **5.3** toggle box de info do curso `943b8e4` (client demand #3).
- **BUG C-irmão** 🟢 housekeeping (hipótese "tranca" refutada; achados: código morto + comentário errado + resend sem senha).
- **Trava de Contexto FASE 1 (§6b)** ✅ `9d8b7a2` — aviso acionável no lugar de redirect/landing/logout-global; mata Órfão 2 + BUG D; sair local; botão do aluno resolve via student-workspace (β). Ver PM 7.6.
- **Master password híbridos** ✅ `1fdfd1e` — gate da master = vínculo de aluno (enrollment ACTIVE), não role; destravou 14 híbridos reais; fechou looseness do EXPIRED; edge MFA declarado. Ver PM 7.8 + §4.
- **Vitrine obedece o tema (7.9+7.15)** ✅ `462a24d` — `vitrineTextColor` agora rege todo texto de corpo (var `--producer-text` + regras espelhadas do member no globals.css, gate duplo de wrapper); ProfilePage compartilhado herda dentro da vitrine, intocado no global. Ver PM 7.9.
- **Webhook history sibling-scope (7.16)** ✅ `944e152` — arms do `webhook-logs` escopados ao ws ativo (era producer-wide → ws irmão vazava). ⚠️ Tenancy: `getCurrentWorkspace` rejeita hint de ws alheio NA ORIGEM (owner-check antes do gate) — produtor nem resolve ws de outro dono. Ver PM 7.16.
- **Badge do sino + nível (7.10)** ✅ `6f27ee6` — var-com-fallback (`--producer-primary`) nos 4 elementos; número via `--producer-button-text`; glow color-mix fallback indigo. Padrão var-com-fallback = POUCOS elementos (vs wrapper CSS = MUITOS). Ver PM 7.10.
- **Painel obedece o tema (7.11)** ✅ `875429e` — o painel já tinha `.producer-layout` (só faltavam as LACUNAS de azul: tints/hovers/focos/gradientes); fix = estender o ruleset no `globals.css` (~28 regras, molde member). ✅ **FAMÍLIA hardcode-vs-tema ENCERRADA** (7.9+7.15+7.10+7.11). Ver PM 7.11.

**ABERTO:**
- 1.5, 1.6 (convite) · 2.4 (rate-limit: store+origem; 2.4a stopgap ✅; **input**: balde por-segmento — chave por-rota no redesign; pivô WAF em avaliação) · 2.5 (CSP) · 4.5 (console.error) · FASE 3 (email A retry + B EmailLog) · FASE 5 quick-wins (5.1 custom domain / 5.2 admin-nav integrations) · FASE 6 (épico multi-gateway) · FASE 9 (débito/QA).
- **Raiz Inteligente (§6a / PM 7.7)** — decisões travadas, sem código · Órfãos restantes do §3 (proxy role-blind :88 · sidebar logo `href="/"` · landing CTA · `/login`→`/admin/login`) · BUG C-irmão housekeeping.

---

## 6) REGRAS DE NEGÓCIO NOVAS — 6b ✅ implementado (Fase 1) · 6a decidido, sem código

Definidas pelo Vinicius:

### 6a) Raiz Inteligente — **DECIDIDO, não implementado** (decisões finais travadas no PM 7.7: binária · STUDENT-collab=staff · lista inline só mediante senha + rate-limit dia-um · reuso producer-login/student-workspaces · assume o sem-workspace)
O apex `/` recebe **email + senha** e IDENTIFICA o tipo de conta, ramificando:
- **PRODUCER** → **LOGA na própria raiz** → vai pro painel `/producer`.
- **conta que é aluno E producer** → **tenta logar**; se a senha estiver errada → erro **"senha incorreta"** (pode confirmar que a conta existe, porque ela é produtor).
- **SÓ aluno** (não é producer) → **NÃO loga na raiz**; se a senha estiver errada → **mensagem NEUTRA** (não revela se a senha/conta existe); mostra a **LISTA dos workspaces** do aluno → clicar num → abre **NOVA GUIA** em `/w/{slug}/login` → ele loga lá.

⚠️ **REGRA DE SEGURANÇA (registrar literal):** a mensagem de erro difere por tipo de conta — **só-aluno = mensagem NEUTRA** (anti-enumeração; nunca confirmar existência de conta/senha); **aluno-que-é-também-producer = "senha incorreta"** (pode confirmar, pois a identidade de produtor já é assumida no login). Não vazar, no ramo só-aluno, se o email existe.

**Já existe (metade da lógica):** `POST /api/auth/student-workspaces` (67 linhas) — recebe `email`, agrupa workspaces por `Enrollment` ACTIVE (`isActive`), e **responde SEMPRE `{ok:true}`** (anti-enumeração ✅). MAS: hoje ele **ENVIA a lista por EMAIL** (`studentWorkspacesList` template), **não** a mostra inline; **não valida senha**; **não distingue producer/aluno**. → Reutilizável: o agrupamento + o anti-enum já estão prontos; falta o fluxo de identificar-e-ramificar na raiz + render inline da lista + nova-guia. **Não é item pequeno** (é um novo fluxo de auth na raiz), mas parte da base existe.

### 6b) Trava de Contexto — ✅ **IMPLEMENTADO (FASE 1, merge `9d8b7a2`)**
Cada área é isolada por ROLE nos guards existentes (proxy é role-blind — ficou fora). Quem tenta invadir outra área vê o **`ContextLockNotice`** no lugar (HTTP 200, URL preservada): sessão atual nomeada + botão "Ir para [meu lugar]" + "Sair desta conta" (**signOut LOCAL** — nunca revoga outros devices/abas).

| Logado como | Tenta | Ação implementada |
|---|---|---|
| ADMIN / ADMIN_COLLABORATOR | `/producer` | 🚫 aviso (decisão do dono: admin travado; **impersonate é o caminho de suporte**) |
| PRODUCER / COLLABORATOR / STUDENT-collab | `/admin` | 🚫 aviso |
| STUDENT puro | `/producer` ou `/admin` | 🚫 aviso; botão resolve o ws real via `/api/student/workspace` (β); sem workspace → mensagem honesta |
| qualquer um sem vínculo | `/w/{slug}` | 🚫 aviso no 403 do init (o **logout global saiu**) |

**EXCEÇÕES decididas e provadas:** `/w/**` é governado por **VÍNCULO** (`hasWorkspaceAccess`), não por role — produtor-matriculado acessa como aluno; **ADMIN bypassa o init por design** (`init/route.ts:55`) → ADMIN entra em qualquer vitrine; **impersonate** pousa em `/producer` como o produtor-alvo (nenhuma trava dispara); **`?preview`** do editor intocado.

---

*Doc vivo. Atualizar a cada área/role novo, a cada órfão fechado, e quando as regras do §6 saírem do papel. Se algo aqui divergir do código, o código vence — e corrija o doc.*

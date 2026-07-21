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
| STUDENT deslogado num curso | `/w/{slug}/login` | `/producer/login` = **a Raiz** (7.7): digita email+senha → lista → nova guia no ws | ✅ **coberto** (Raiz `6b89c0c`; o deep-link em si ainda se perde — candidato returnTo) | [código] |
| aluno puro em `/producer/login` (a Raiz) | lista dos seus ws | senha-de-ws certa → **lista COMPLETA inline** → nova guia | ✅ **FEITO** (Raiz `6b89c0c`) | [código] + curl |
| ADMIN / ADMIN_COLLABORATOR na Raiz | `/admin` | loga → `/admin` (antes: 403 "use /admin/login") | ✅ **FEITO** (Raiz `6b89c0c`) | curl |

> **Prova:** `[browser]` = comportamento verificado ao vivo num navegador. `[código]` = lido no código, **não** testado em runtime.

**⚠️ CORREÇÕES PROVADAS na Trava (2026-07-15) — o que a investigação #1 tinha errado:**
- **(i) Client-nav PASSA pelo middleware.** A afirmação "client-nav não passa pelo proxy" estava **ERRADA** — requests RSC de `<Link>`/`router.replace` são GETs que o matcher intercepta (provado por curl com header `RSC: 1`: 307 idêntico). Foi a raiz do β (clique morto: 307 pra rota atual = no-op).
- **(ii) ADMIN × `/w/[slug]` = ACESSA por design.** O gate do init exceptua ADMIN (`init/route.ts:55` — `if (user.role !== "ADMIN")`); `hasWorkspaceAccess` documenta "callers should skip for ADMIN". Por isso a etapa ③ da matriz ENTROU em vez de avisar.
- **(iii) `(dashboard)/page` é INALCANÇÁVEL para qualquer authed** — o proxy sempre redireciona `/` antes (server E client-nav, provado). O StudentHome só existiria pós-Raiz.

**⚠️ Órfãos de roteamento (estado pós-Trava `9d8b7a2`):**
- ~~`producer/layout.tsx:34` — isStaff sem ADMIN_COLLABORATOR → `/landing`~~ ✅ **MORTO** (aviso da Trava).
- ~~**BUG D** — STUDENT sem cookie → `/landing`~~ ✅ **MORTO** (aviso + resolução via student-workspace).
- `proxy.ts:88` — role-blind, `"/"`→`/producer` (vivo; a Raiz assume — authed no apex é governado por proxy+Trava, INTOCADO pelo 7.7).
- `sidebar.tsx:392` — logo `href="/"` (vivo, MITIGADO: hoje pousa no aviso da Trava, não na landing).
- `landing:98` (+ footer `:548`, 2º "Entrar") — CTA → `/producer/login` = a Raiz; ADMIN_COLLABORATOR agora **loga** lá (7.7), não mais 403 (vivo).
- ~~`(auth)/login/page.tsx:4` — `/login` → `/admin/login`~~ ✅ **ABSORVIDO pela Raiz** (`6b89c0c`): `/login`→`/producer/login`. Consertou de carona 2 fluxos vivos que caíam no login do ADMIN: aluno-sem-ws (`producer/page.tsx:113,115`) e convite aceito (`invite/[id]/page.tsx:164`).

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
- `w/[slug]/login/route.ts:110-115` (o login; ref atualizada — era 91-100) · `webhook-helpers.ts:131-138` · `w/[slug]/forgot-password:65-71` · `w/[slug]/password:40-46` · **e agora `producer-login/route.ts` (a Raiz 7.7, mesmo discriminador no ramo só-aluno)**. O gate de acesso do ws-login é `login/route.ts:212` (era :196).
- ⚠️ **NUNCA usar "tem WorkspaceCredential" como discriminador:** 6 PRODUCERs + 1 STUDENT-collab têm rows de credencial **mortas** (nunca consultadas no login deles).

**O BUG C era:** `/api/auth/password` (troca de senha) validava a **global** → aluno puro (que só conhece a mc- da credencial) tomava "senha atual incorreta". Corrigido com a rota escopada `/api/w/[slug]/password` (`9fac2d9`).

**A MASTER PASSWORD** (`Workspace.masterPassword`, plaintext — skeleton-key do produtor) é um 3º caminho no ws-login (bloco 1, prioridade máxima). ⚠️ **Gate = VÍNCULO DE ALUNO, não role** (corrigido em `1fdfd1e`/PM 7.8): `Enrollment ACTIVE não-expirado no ws` (`isEnrollmentActive`), qualquer role — **nunca** owner/collab sem matrícula (esses usam a global). Antes gateava `role === "STUDENT"` → cega p/ 14 híbridos reais (produtor que é aluno de outro produtor). Sessão nasce via magic-link (AAL1); híbrido **com MFA** é rejeitado pelo `getCurrentUser` AAL-gate (limitação declarada). Não rotaciona senha nenhuma.

---

## 5) ESTADO (puxado do PLANO-MESTRE)

**FEITO (merge SHA):**
- FASE 1 segurança: 1.1–1.14 ✅ (todos com SHA no plano). Abertos: **1.5** (magic-link convite) e **1.6** (token single-use) — dependem da Fase 3 / migração.
- FASE 2: 2.1 HSTS `de00875` · 2.2 npm audit `7eaaf66` · 2.3 XSS `3d40bc3` · 2.6/2.6b email sanitize `aa0e1a2`/`98b1381` · 2.7 + Candidato-2 (não-itens) · **2.4 Peça A shared-store Upstash `75c07be`** · **2.4 Peça B.1 origin lockdown OBSERVE `53748b2`** (vigia em Node, proxy intocado, 10 rotas, tela `/admin/origin-lock`; ✅ **FINALIZADA 2026-07-18** — env ligada: `ORIGIN_LOCK_SECRET` na Vercel + Transform Rule 'Origin Lock Stamp' no Cloudflare, carimbo provado em prod). Abertos: **2.4** Peça B.2 enforce (após janela de observação limpa) + constant-time · **2.5** CSP.
- FASE 4: 4.1 (via 1.12) · 4.2 `022f933` · 4.3 `159fc0f` · 4.4 (condição eliminada) ✅. Aberto: **4.5** console.error (forma decidida: guard-por-status — `console.error` só ≥500; aguardando implementação).
- BUG A materials upload `f2ea405` · **BUG B** admin-collab dashboard `4ad99f5` · **BUG C** troca senha aluno `9fac2d9` · **2.4a** rateLimit stopgap 2 rotas `c3bad5a` (ex-"1.2/1.3" — rebatizado p/ não colidir com os itens 1.2/1.3 da FASE 1) · **5.4** CSV import no editor de curso `2c2ef5b` · **5.3** toggle box de info do curso `943b8e4` (client demand #3).
- **BUG C-irmão** 🟢 housekeeping (hipótese "tranca" refutada; achados: código morto + comentário errado + resend sem senha).
- **Trava de Contexto FASE 1 (§6b)** ✅ `9d8b7a2` — aviso acionável no lugar de redirect/landing/logout-global; mata Órfão 2 + BUG D; sair local; botão do aluno resolve via student-workspace (β). Ver PM 7.6.
- **Master password híbridos** ✅ `1fdfd1e` — gate da master = vínculo de aluno (enrollment ACTIVE), não role; destravou 14 híbridos reais; fechou looseness do EXPIRED; edge MFA declarado. Ver PM 7.8 + §4.
- **Vitrine obedece o tema (7.9+7.15)** ✅ `462a24d` — `vitrineTextColor` agora rege todo texto de corpo (var `--producer-text` + regras espelhadas do member no globals.css, gate duplo de wrapper); ProfilePage compartilhado herda dentro da vitrine, intocado no global. Ver PM 7.9.
- **Webhook history sibling-scope (7.16)** ✅ `944e152` — arms do `webhook-logs` escopados ao ws ativo (era producer-wide → ws irmão vazava). ⚠️ Tenancy: `getCurrentWorkspace` rejeita hint de ws alheio NA ORIGEM (owner-check antes do gate) — produtor nem resolve ws de outro dono. Ver PM 7.16.
- **Badge do sino + nível (7.10)** ✅ `6f27ee6` — var-com-fallback (`--producer-primary`) nos 4 elementos; número via `--producer-button-text`; glow color-mix fallback indigo. Padrão var-com-fallback = POUCOS elementos (vs wrapper CSS = MUITOS). Ver PM 7.10.
- **Painel obedece o tema (7.11)** ✅ `875429e` — o painel já tinha `.producer-layout` (só faltavam as LACUNAS de azul: tints/hovers/focos/gradientes); fix = estender o ruleset no `globals.css` (~28 regras, molde member). ✅ **FAMÍLIA hardcode-vs-tema ENCERRADA** (7.9+7.15+7.10+7.11). Ver PM 7.11.
- **Fade do curso (7.12) + cores do login (7.13)** ✅ `6a9f635` — 1 migração agrupada (5 colunas: 3 `courseBannerFade*` + `loginTextColor` + `loginSecondaryTextColor`). Fade controlável (molde vitrine); login com 2 campos + cascata, o "Entrar" segue a cor (emenda do dono), as 3 telas de auth cobertas. Prod migrate deploy ANTES do push (ordem-gate); 0/43 cursos + 0/29 ws mudaram. Ver PM 7.12/7.13.
- **Upload honesto (7.14 Fase A)** ✅ `874d251` — hint mentia (5MB vs teto ~4.5MB da lambda) + 2 fronts com `res.json()` antes do `res.ok` (413 mascarado); fix = helper `upload-image.ts` (guarda client + leitura defensiva). **Fila noturna 2026-07-16 = 8/8 em prod.** Ver PM 7.14.
- **Upload de imagem signed-url (7.14 Fase B)** ✅ `cf660b7` — imagens sobem **direto browser→Supabase** (emissora nova `/api/upload/signed-url`, endurecida: valida `image/*`+tamanho ANTES de assinar); teto da Vercel fora do caminho; **10MB único** em 3 camadas (client·emissora·bucket). 4 superfícies via o helper (contrato da Fase A segurou: fronts = 1 hint each). ⚠️ **Correção do registro:** o bucket estava `null` em staging E prod — a parede de bucket nasceu AQUI (10485760 nos 2). Lambda `/api/upload` viva pros 4 uploaders FormData não-migrados (**Fase C candidata**); órfãos timestampados = candidato de limpeza. Ver PM 7.14.
- **Raiz Inteligente (7.7 · §6a)** ✅ `6b89c0c` — **o épico que ENCOLHEU:** o apex já apontava pro `/producer/login` → **proxy INTOCADO**, a página evoluiu (5 arquivos). Staff loga e roteia por role (admins→`/admin`); aluno puro → senha contra `WorkspaceCredential` → **lista COMPLETA inline** → nova guia no ws-login (sessão nasce lá). 3 falhas = neutra byte-idêntica; rate-limit dia-um; órfão `/login`→raiz. ⚠️ **G2 (timing): dummy REFUTADO por experimento de controle** (o oráculo é o bcrypt do GoTrue, pré-existente) → constant-time = candidato 2.4. **§6 inteiro (Trava+Raiz) fechado.** Ver PM 7.7.

**ABERTO:**
- 1.5, 1.6 (convite) · 2.4 PARCIAL (Peça A shared-store ✅ `75c07be` com chave por-rota · **Peça B.1 origin lockdown OBSERVE ✅ `53748b2` FINALIZADA 2026-07-18** — vigia em Node grava no-stamp/webhook-external/exempt-cron nas 10 rotas, SEMPRE passa, tela `/admin/origin-lock`; env LIGADA: `ORIGIN_LOCK_SECRET` na Vercel + Transform Rule 'Origin Lock Stamp' no Cloudflare, carimbo provado em prod (nav do admin silenciosa; único no-stamp foi o login pré-propagação); **Peça B.2 enforce ⛔ BLOQUEADA INDEFINIDAMENTE** (descoberto 2026-07-19 na tela em prod): há **webhooks de pagamento REAIS** (Applyfy axios/1.13.2 — kingdomacademy 114, home-office-lucrativo 55, mentoria-juncao-milionaria 38 etc. apontando pra *.vercel.app) **E login legítimo** (`/api/w/{slug}/login`, IPs Cloudflare) chegando na origem SEM carimbo → ligar o bloqueio quebraria vendas. Pré-req: (1) migrar os produtores pro domínio, (2) corrigir a lacuna da Transform Rule no login. NUNCA ligar sem os 2. B.1 observação segue rodando. Ver bloco 🔴🔴 na §2.4 do PLANO-MESTRE — **+ constant-time login** do G2 da Raiz) · 2.5 (CSP) · 4.5 (console.error) · FASE 3 (email A retry + B EmailLog) · FASE 5 quick-wins (5.1 custom domain / 5.2 admin-nav integrations) · **FASE 6 (épico multi-gateway) — 6.0 fundação: 8 decisões travadas + contrato `GatewayAdapter`/`processGatewayWebhook` desenhado (Hubla = 1º gateway). ⭐ **FUNDAÇÃO 6.0 COMPLETA + 6.1 HUBLA PONTA-A-PONTA em prod** — 3 fatias: SCHEMA `50edb79` (CourseExternalProduct +gateway, WorkspaceGatewaySecret cifrada; Applyfy byte-idêntico, 30 mapeamentos backfillados) · CORE `c5f2f7a` (lib comum `processGatewayWebhook` da escopada + adapter Hubla + rota `/api/webhooks/hubla/[slug]`; verify() REAL x-hubla-token vs secret cifrado + x-hubla-idempotency no dedup + user??payer; recordTransaction OFF sem amount; matriz a-f verde) · UI `5f6a80e` (tela config Hubla + card no hub + endpoints hubla-secrets cifrado/hubla-courses gateway=hubla, requireWorkspaceOwner; Applyfy intocado; card Applyfy destacado "Recomendado" dourado). **+ 6.1b KIWIFY (2º gateway) ✅ `142b960`** — mecânico (adapter+rota+tela+card, zero migração, fundação/Applyfy/Hubla intocados). ⭐ 3º padrão de auth: **HMAC-SHA1 sobre o corpo cru, assinatura na QUERY `?signature=`** (corpo cru chega intacto — rota não consome antes do verify); provado por MATCH REAL no staging (par casado assinatura+corpo). ⭐ 1º gateway com **recordTransaction** (amount `charge_amount` em centavos→/100 → vendas no dashboard; provado R$17,70). Leitura defensiva (CPF/CNPJ MAIÚSCULOS). GRANT order_approved + REVOKE order_refunded provados; chargeback/subscription_canceled = nome ASSUMIDO (candidato a confirmar). Um gateway novo = só adapter+rota+tela+card (molde=Hubla/Kiwify). ⚠️ em prod as rotas Hubla/Kiwify são configuráveis mas INERTES até um produtor cadastrar o token (capacidade nova, não muda o existente). ⚠️ risco cross-gateway ACEITO (Applyfy resolve sem filtro gateway [slug]:66; blindar tocaria o Applyfy, decisão 7 veta). 6.2 multi-token ✅ já implementado; 6.3 cancelamento = greenfield (só entrada)** · FASE 9 (débito/QA).
- **Raiz Inteligente (§6a / PM 7.7)** — decisões travadas, sem código · Órfãos restantes do §3 (proxy role-blind :88 · sidebar logo `href="/"` · landing CTA · `/login`→`/admin/login`) · BUG C-irmão housekeeping.

---

## 6) REGRAS DE NEGÓCIO NOVAS — §6 INTEIRO ✅ IMPLEMENTADO (6a Raiz `6b89c0c` + 6b Trava `9d8b7a2`, ambas em produção)

Definidas pelo Vinicius:

### 6a) Raiz Inteligente — ✅ **IMPLEMENTADO (merge `6b89c0c`, PM 7.7)** — evoluiu o `/producer/login` (o apex já apontava pra lá; **proxy INTOCADO**)
O login recebe **email + senha** e IDENTIFICA a conta, ramificando (decisão **binária** do dono):
- **Qualquer STAFF** (PRODUCER · COLLABORATOR · STUDENT-collab · ADMIN · ADMIN_COLLABORATOR) com senha global válida → **LOGA** e roteia por role (admins → `/admin`; resto → `/` e o proxy roteia). MFA carrega o `redirect` pro pós-challenge.
- **SÓ aluno** → a global falha → `verifyPassword` contra as `WorkspaceCredential` do email (discriminador do dual-auth §4, **nunca "tem credencial"**) → **≥1 bate → LISTA COMPLETA inline** (`{slug,name,logoUrl}`) → clicar → **NOVA GUIA** `/w/{slug}/login` (a sessão do aluno nasce LÁ; a raiz não cria sessão de aluno). Legado global-real → mesma lista.

⚠️ **REGRA DE SEGURANÇA (como ficou):** os **3 casos-falha** (email inexistente · aluno sem credencial · senha errada) devolvem a MESMA mensagem neutra **"Credenciais inválidas"** (byte-idêntica, provada por curl). A distinção "aluno-que-é-também-producer confirma existência" da spec original foi **subsumida** pela lei binária: se a senha global bate, loga (é staff/híbrido); senão, ou vira lista (aluno) ou neutra. Rate-limit dia-um nas 2 rotas. **⚠️ Timing (G2):** o oráculo de existência de email é o `signInWithPassword` do **GoTrue** (pré-existente em toda rota), não o 7.7 — o dummy-verify foi **refutado por medição** (controle staff-real prova); **constant-time login → candidato do 2.4**.

**Refs canônicas do fluxo:** ramo só-aluno em `producer-login/route.ts` (após o erro do signIn) · agrupamento compartilhado `src/lib/student-workspaces.ts` (email-fallback + lista consomem a mesma fonte) · lista inline em `producer/(auth)/login/page.tsx`.

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

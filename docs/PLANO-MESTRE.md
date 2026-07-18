# Members Club — Plano Mestre de Execução

> **O mapa único.** Tudo que falta, em fases, por dependência × gravidade × esforço.
> Documento vivo: marque `[x]` ao concluir, adicione itens novos na fase certa.
>
> **Estado:** `main` em `cf4e979` · auditoria de segurança crítica FECHADA · plataforma em produção com clientes pagantes.
> **Última atualização:** reconciliado 2026-07-13 (sessão #13).

---

## ⚖️ REGRAS DE EXECUÇÃO (valem para TODOS os itens, sem exceção)

Estas regras não são decoração. Elas moldam cada etapa abaixo. Um item só está "feito" quando passou por todas.

1. **Skill 100% + Dev Brabo 100%.** Toda mudança segue o protocolo: investigação read-only → proposta com trade-offs → aprovação do Vinicius → implementação incremental → build verde entre etapas → validação no staging → merge `--no-ff` → deploy → teste em produção.
2. **As 7 Perguntas antes de escrever QUALQUER código.** Precisa existir? Já existe no projeto? A plataforma já faz nativo? Dá em 1 linha? Abstração mais simples? Adiciona manutenção? Menor mudança possível? — Princípio: **reusar > nativo > 1 linha > código novo.**
3. **Nunca agir no escuro.** Causa provada por evidência (file:line, query, log) ANTES de qualquer alteração. Nunca por suposição.
4. **Trava de segurança operacional.** Toda operação de banco no staging: `npx dotenv -e .env.staging` E provar `SUPABASE_REF=wxynnsyartxcvglqwmdw` no topo do script. Destrutivo sem prova de alvo = PARAR. (Produção = `wyamxwmdgbvqrfcqfbyh` — nunca confundir.)
5. **Sinuca.** Mapear TODOS os elementos afetados antes de mudar um. Calcular cada bola que a tacada vai tocar.
6. **Proatividade com rigor.** Se no caminho aparecer bug ou oportunidade de melhoria, propor e melhorar o que já existe — sempre no mesmo padrão da plataforma. Nunca deixar o código pior do que estava.
7. **Plataforma viva.** Clientes pagantes. Zero regressão. Branch para tudo que toca módulo sensível. Rollback via `git revert -m 1` sempre disponível.
8. **Intensidade sustentável.** A skill proíbe trabalho no cansaço — é o que protege a plataforma. Fases pequenas, validadas, com pausa entre blocos. "Cansaço é como erro entra em produção."
9. **Migrações e fecho de item** seguem o Migration Runbook e a Definition of Done da skill (canônico: `.claude/skills/membersclub-engineering`, desde `cf4e979`).

**Legenda de tamanho:** 🟢 P (Pequeno, ~1 sessão parcial) · 🟡 M (Médio, ~1 sessão) · 🔴 G (Grande, várias sessões) · ⚫ ÉPICO (multi-item).
**Legenda de status:** `[ ]` aberto · `[~]` em andamento · `[x]` feito.

---

# 🎯 O FIM ESTÁ AQUI

O backlog parecia infinito porque ninguém tinha cruzado a lista com o que já está em produção. Cruzando:

- **A segurança CRÍTICA já está fechada** (8 furos graves, todo o cross-tenant, o sequestro de conta) — a parte mais difícil JÁ PASSOU.
- **~12 features que pareciam pendentes JÁ ESTÃO FEITAS** (player YouTube mascarado, login sou aluno, dislike oculto, vitrine 100%, aba enriquecida, e mais) — eram fantasmas no backlog. *(narrativa histórica; sem lista item a item)*
- **O que resta até o marco "PRONTO" são as Fases 1–7** — finitas, categorizadas, com file:line.
- **As Fases 8–9 são crescimento de produto** (app nativo, marketplace, escala) — "dá pra fazer um dia", NÃO "falta pra terminar".

**O MARCO "PRONTO" está marcado abaixo, entre a Fase 7 e a Fase 8.** É ali que a plataforma está sólida, segura e completa. O resto é evolução.

---

# FASE 1 — Segurança restante 🟢 (SEM item de código em aberto)

> **Por que primeiro:** risco em produção vem antes de tudo. São os furos que a auditoria mapeou.
> **✅ FASE 1 COMPLETA no código (12 itens):** 1.1, 1.2, 1.3, 1.4, 1.7, 1.9, 1.10, 1.11, 1.12, 1.14, 1.8, 1.13 — todos fechados e validados no staging (`requireWorkspaceOwner`, `requirePermission` + `hasWorkspaceAccess`, catálogo de permissões, workspace-scope por `collaboratorCanActOnCourse`, `canManageStudentsOfCourse`, plan-limit por `!== ADMIN`, select explícito nas reviews).
> **⚠️ NÃO HÁ MAIS NENHUM ITEM DE CÓDIGO EM ABERTO na Fase 1.** Restam SÓ **1.5 e 1.6** (magic-link + token single-use no convite) — **BLOQUEADOS pela Fase 3** (dependem de email confiável). Assim que a Fase 3 (email) entrar, 1.5/1.6 saem.

### 1.1 — `MANAGE_LIVES` + Lives writes ungated 🟡 ✅ FEITO (`78275d4`)
**Problema:** `producer/lives/route.ts:53`, `[id]/route.ts:50,94`, `[id]/status/route.ts:27` são `requireStaff` puro — qualquer colaborador cria/edita/exclui live e dispara push em massa (status→push). Gravidade ALTA (blast outbound).
**Abordagem:** mesmo molde do `MANAGE_AUTOMATIONS` (já documentado em `project_manage_automations_permission.md`). Nova permissão `MANAGE_LIVES`.
**Etapas:**
- [x] Investigação read-only: confirmar gates atuais de cada rota de live + onde o nav lista "Lives" (espelhar a correção do `collaboratorLinks` aprendida no `MANAGE_AUTOMATIONS`).
- [x] As 7 Perguntas (a 7ª permissão espelha as 6 existentes).
- [x] Etapa 1 — catálogo: `+"MANAGE_LIVES"` no `COLLABORATOR_PERMISSIONS` + label parentético no `PERMISSION_LABELS`. Build verde. (catálogo só, não gateia ainda.) — commit `0c96c6f`.
- [x] Etapa 2 — gates: `requirePermission(staff, "MANAGE_LIVES")` em **10 métodos** (CRUD/status/moderate + moderators via `verifyOwnership`, 8 ocorrências) + entrada nova no `collaboratorLinks`. Catches já mapeavam "Sem permissão"→403. Build verde. — commit `b1df3dd`.
- [x] Staging: colaborador SEM → 403 nos 10 (status→push barrado antes do notifyStudents; GETs 403 não 500); COM → passa nos 10; dono PRODUCER → passa; nav filtrado (perms via /api/auth/me). Provas de count (live intacta, count 1, LiveModerator 0).
- [x] Merge `--no-ff` (as 2 etapas juntas) → `78275d4`.
**Dependência:** nenhuma. Reusa molde pronto. **Status: concluído — o cross-tenant guard `hasWorkspaceAccess` do moderators permanece (camada independente).**

### 1.2 — Tags standalone ungated 🟡 ✅ FEITO (`8e8ceaa`)
**Problema:** `tags/route.ts:9,40`, `[id]/route.ts:7-16` — CRUD de tags é `requireStaff` puro. Tags = segmentação + alvo de automação.
**Abordagem:** `requirePermission(staff, "MANAGE_AUTOMATIONS")`. ⚠️ **Corrigido na investigação (a premissa do plano estava errada):** a gestão de tags vive sob a seção **Automações** (`/producer/automations/tags`, uma aba do `automations/layout.tsx`) e as tags são o alvo dos triggers/ações de automação (HAS_TAG/ADD_TAG) — `MANAGE_AUTOMATIONS` mantém coerência com o nav. `MANAGE_STUDENTS` (a proposta original) **quebraria o colaborador de automações**. Sinuca: só `automations/tags/page.tsx` consome `/api/producer/tags`; o filtro de alunos e o editor de automação têm fonte própria (não quebram). Não precisa permissão nova (reusa a 6ª). Inclui o ajuste do catch do `[id]` ("Sem permissão"→403, trap FURO#5 — os catches do `[id]` mapeavam só 401/404/500).
**Etapas:**
- [x] Read-only: confirmar gates + sinuca (só a aba de tags sob Automações consome as rotas; filtro de alunos e editor de automação têm fonte própria). **Achado: premissa MANAGE_STUDENTS errada → MANAGE_AUTOMATIONS.**
- [x] Aplicar `requirePermission(MANAGE_AUTOMATIONS)` — 3 ocorrências/5 métodos (route.ts GET+POST via replace_all; `[id]` 1 linha no `getOwnedTag` cobre GET/PUT/DELETE) + ajuste dos 3 catches do `[id]` ("Sem permissão"→403). commit `4ccda53`.
- [x] Staging: colab SEM (só MANAGE_STUDENTS) → **403 nos 5** (incl. `[id]` dando 403 não 500 — catch validado); COM (MANAGE_AUTOMATIONS) → passa; dono PRODUCER → passa. Provas de count (tag intacta, count 1).
- [x] Merge `--no-ff` → `8e8ceaa`.
**Dependência:** depois de 1.1 (mesma sequência de permissões). **Status: concluído. Isolamento de ws já existia (getOwnedTag valida a tag no workspace) — foi só permissão + o ajuste do catch.**

### 1.3 — `workspaces/[id]` PATCH+DELETE + uploads → owner-only 🔴 ✅ FEITO (`65190bd`)
**Problema:** o cluster de escrita de branding/config do ws usa `canAccessWorkspace` (dono OU colaborador) onde devia ser `requireWorkspaceOwner` (só dono). NÃO existe "PUT" — a rota é `PATCH`+`DELETE`. Gravidade ALTA, não média: um colaborador sem NENHUMA das 7 permissões consegue, via API crua, (a) setar `masterPassword` → senha universal → **account-takeover em massa de qualquer aluno** (login em `w/[slug]/login` compara plaintext e minta sessão via magic-link); (b) injetar `emailCustomHtml` → **phishing/exfiltração da senha temp `{senha}`** no email transacional de todo comprador; (c) `isActive=false` (ou o DELETE, soft-delete) → **DoS total** (derruba login de aluno E dropa webhook de pagamento).
**Escopo (4 gates, mesmo cluster):**
- `workspaces/[id]/route.ts` — PATCH (:11) e DELETE (:139).
- `workspaces/[id]/logo/route.ts` — POST (:11) sobrescreve `logoUrl`.
- `workspaces/[id]/login-images/route.ts` — POST (:13) troca bg/logo/favicon da tela de login PÚBLICA.
**Fora do escopo:** `vitrine` já é owner-only (findFirst por ownerId→404); `workspaces/route.ts` fica de fora (GET owner-scoped, POST não toca ws alheio — mas ver 1.8).
**Abordagem:** trocar `canAccessWorkspace` por `requireWorkspaceOwner` nos 4 pontos (família FURO #1/#3); trocar o import nos 3 arquivos (canAccessWorkspace fica órfão). Catches já mapeiam 403 — não tocar. Sem migração.
**Etapas:**
- [x] Read-only: gate atual dos 4 + sinuca (nenhum fluxo legítimo de colaborador usa) + `requireWorkspaceOwner` cobre.
- [x] Aplicar os 4 gates + trocar os 3 imports. commit `ab68a6f`.
- [x] Staging: colaborador → 403 nos 4 (não seta masterPassword, não desfigura, não desativa); dono → passa; ADMIN → passa. Prova: masterPassword AINDA null + isActive AINDA true após os exploits do colab (account-takeover + DoS mortos).
- [x] Merge `--no-ff` → `65190bd`.
**Dependência:** nenhuma. **Achados adjacentes derivados desta investigação → itens 1.8 e 2.6.**

### 1.4 — Cluster integrations + course-support 🔴 (era "médio") ✅ FEITO (`7d6c8b8`)
**Problema:** o plano dizia "3 rotas médias sem gate". A investigação a fundo (7 agentes) achou **5 frentes reais, 2 delas 🔴**, incluindo uma irmã que NÃO estava no plano. Varredura completa = 10 rotas nos 2 diretórios (`producer/integrations/**` + `producer/course-support/**`); sem 6ª irmã; `applyfy-tokens` já era owner-only (FURO#3); `status` GET benigno (boolean+logo).
**As 5 frentes (gate real aplicado):**
- `integrations/courses/[id]` PATCH → **owner-only** (`requireWorkspaceOwner`). 🔴 Reescreve o binding `externalProductId↔curso` que o webhook Applyfy lê p/ matricular (`findCourseByExternalId`) — colaborador com zero perm sequestrava fulfillment de pagamento (acesso grátis / sabotagem de receita). Família FURO#3 (token de pagamento).
- `integrations/webhook-logs` GET → **owner-only + união `{workspaceId}` no where.OR**. 🔴 **NÃO estava no plano** (achado na investigação): o scope só existia p/ `role==="PRODUCER"`; COLLABORATOR caía em `where={}` e lia `WebhookLog` de TODOS os tenants (email/CPF/valor do comprador). Vazamento cross-tenant de PII de pagamento (LGPD). A união cobre os logs do webhook per-slug (que carregam `workspaceId`); as vias legadas `courseId`/`productExternalId` cobrem os do webhook global.
- `integrations/courses` GET → **owner-only** (5º fix, por coerência — seção integrations = território do dono). 🟡 read escopado dos externalProductIds.
- `integrations/request` POST → **owner-only** (por coerência). 🟢 fila global "fale com o admin" (model sem workspaceId), sem cross-tenant — baixo, mas gated junto.
- `course-support` (tickets, tickets/[id] PATCH, messages POST, unread-count) → **`requirePermission("MANAGE_STUDENTS")` no resolver `resolveProducerSupportScope` (1 linha, DRY, cobre as 4 rotas)**. 🟡 a UI já exigia MANAGE_STUDENTS (nav+badge), a API não; premissa do plano CORRETA aqui (≠ 1.2). Course-scope já existia via `getStaffCourseIds`. Sem cross-tenant (ws-isolation airtight).
**Etapas:**
- [x] Read-only a fundo (7 agentes): 5 frentes + varredura completa (10 rotas, sem 6ª) + helpers p/ reuso.
- [x] Aplicar os 5 gates (4 owner + 1 resolver) — commit `f30ee97`. Build verde, 0 `canAccessWorkspace` sobrando.
- [x] Staging: colab-COM (MANAGE_STUDENTS) → 403 nas 4 de integrations, passa em course-support; colab-SEM (VIEW_ANALYTICS) → 403 até em course-support; **cross-tenant webhook-logs PROVADO** (dono A vê A1/A2 não B1/B2, simétrico; A2 via workspaceId = união load-bearing); dono grava binding (200→null revertido); nenhum 5xx.
- [x] Merge `--no-ff` → `7d6c8b8`.
**Dependência:** nenhuma. **Lição:** o "médio" do plano subestimou — a investigação a fundo (não assumir o rótulo) achou o vazamento de PII cross-tenant do webhook-logs, que era o pior do cluster.

### 1.5 — Magic-link no convite (ITEM 1a) 🟡
**Problema:** `invite/[id]/accept` signup — convite pré-empta email sem conta; link vazado cria conta nova. Hardening do fluxo de convite.
**Abordagem:** usar `supabase.auth.signInWithOtp` / `generateLink` NATIVO (NÃO construir do zero — a plataforma já tem via o resend). Pareado com a Fase 3 (email confiável).
**Etapas:**
- [ ] Read-only: confirmar o fluxo de signup do convite + onde o `generateLink`/OTP nativo encaixa.
- [ ] As 7 Perguntas (magic-link é nativo do Supabase — reusar, não reinventar).
- [ ] Implementar via API nativa do Supabase.
- [ ] Staging: convite → magic-link chega → aceita sem criar conta por link vazado.
- [ ] Merge `--no-ff`.
**Dependência:** **Fase 3 (email A+B)** — o magic-link depende do envio de email confiável.

### 1.6 — Token single-use no convite (ITEM 1c) 🟡
**Problema:** REVOKE → reconvidar revive o link antigo (mesmo id). Token deveria ser single-use.
**Abordagem:** coluna nova de controle (ex.: `usedAt` ou rotação de token) + migração.
**Etapas:**
- [ ] Read-only: o lifecycle do token de convite + onde marcar como usado.
- [ ] Schema: coluna nova + migração manual (`migrate deploy`, nunca `migrate dev` no pooler).
- [ ] Lógica: invalidar token ao usar/revogar.
- [ ] Staging: usar → token morre; revogar→reconvidar → link velho não revive.
- [ ] Merge `--no-ff`.
**Dependência:** relaciona com **D1 (migrations do zero)** — coordenar a migração.

### 1.7 — ITEM 3: `MANAGE_LESSONS` em criar/excluir curso 🟢 ✅ FEITO (`12355d3`)
**Problema:** o blanket-403 de colaborador é só em criar curso (`courses/route.ts:245`) e excluir curso (`courses/[id]/route.ts:283`). Módulos/seções JÁ honram MANAGE_LESSONS via `canEditCourse`.
**Decisão de produto (Vinicius):** colaborador pode **CRIAR e EDITAR** cursos. **NUNCA EXCLUIR** (ação destrutiva fica só com o dono).
**Abordagem:** liberar o POST de criar curso para `MANAGE_LESSONS`; manter o DELETE como blanket-403 para colaborador.
**Descobertas da investigação (2026-07-02) — premissas corrigidas:**
- ❌ **"A UI já esconde Excluir do colaborador" era FALSO.** O botão Excluir em `producer/courses/page.tsx` usava `hasManageLessons` — colaborador COM a permissão via o botão (o clique dava 403 na API, mas a UI expunha). Fix: botão gated por `!isCollaborator`.
- **Ownership errado no create:** `ownerId: staff.id` — colaborador criando curso viraria DONO do curso (curso fora do controle do dono do workspace, quebra `canEditCourse`/vitrine por ownerId). Fix: `ownerId` ancorado em `workspace.ownerId`.
- **Plan-limits bypassável:** `checkPlanLimits` só rodava `if role===PRODUCER` contando por `staff.id` — colaborador criando curso não consumia (nem respeitava) a quota do plano do dono. Fix: roda para `!ADMIN`, contando pelo `workspace.ownerId` (a quota é sempre do produtor pagante). Mesma família do 1.8.
**Etapas:**
- [x] Read-only: confirmar os 2 pontos exatos (create:245, delete:283) + o catch. → Investigação a fundo derrubou a premissa da UI e achou ownership/plan-limits (acima) + 6 achados novos (1.9–1.12 + nota groups).
- [x] Liberar create para `requirePermission(MANAGE_LESSONS)`; ancorar plan-limits + `ownerId` no `workspace.ownerId` (roda para `!ADMIN`); estender o catch (Não autorizado→401, Sem permissão/Forbidden→403, resto→500); esconder Excluir do colaborador na UI (`!isCollaborator`).
- [x] Manter delete blanket-403 (colaborador nunca exclui) — DELETE e PUT intactos.
- [x] Staging: 17/17 PASS — colab COM cria (201, **ownerId=dono** provado por SQL ⭐⭐), edita (200), exclui → 403 ⭐; colab SEM → 403; dono → tudo intacto; cenário do plan-limit (sub temp + guard de runtime) → colab barrado no limite do DONO ("Limite de N cursos…", não "Assine um plano") ⭐⭐, cleanup revertido e provado (exempt 504d8495 vence de novo, dono cria 201).
- [x] Merge `--no-ff` (12355d3, branch deletada).
**Dependência:** nenhuma.

### 1.8 — `checkPlanLimits` bypass em criar workspace 🟡 ✅ FEITO (`da47e05`)
**Problema:** `workspaces/route.ts` POST rodava `checkPlanLimits` só `if (staff.role === "PRODUCER")` (:33). Um colaborador (role COLLABORATOR/STUDENT-com-Collab, que passa no `requireStaff`) caía fora do check e **criava workspaces ilimitados**, virando dono deles (`ownerId: staff.id`), bypassando o limite do plano. Abuso de plano. Achado à parte durante a investigação do 1.3.
**Natureza = TÉCNICO (não decisão de produto):** o `Plan.maxWorkspaces` (default 10) EXISTE no schema e o `checkPlanLimits` JÁ tem o branch `type === "workspace"` (`count(workspace where ownerId===userId) >= maxWorkspaces → throw`). O limite existe e funciona — o furo era só a condição do `if`.
**Fix (1 linha, espelha o 1.7 dos cursos):** `if (staff.role === "PRODUCER")` → `if (staff.role !== "ADMIN")`. Agora todo não-ADMIN entra no check. Anchor `staff.id` já correto (no workspace o criador É o dono, ≠ do curso onde ancora em workspace.ownerId). Catch já certo (`PlanLimitError → 403` no try/catch interno). Colaborador sem Subscription → `!sub → throw → 403 "Assine um plano"` (bloqueio real, não vira 500).
**Etapas:**
- [x] Read-only: gate `requireStaff` (aceita colab); o check estava atrás de `=== "PRODUCER"`; `maxWorkspaces` existe + branch workspace do helper; molde = courses/route.ts (1.7); catch já mapeia PlanLimitError→403; sinuca limpa (só courses+workspaces são plan-limitados).
- [x] Fix 1 linha (`=== "PRODUCER"` → `!== "ADMIN"`), corpo/anchor/catch intactos, +1/−1, build verde.
- [x] Staging (as 2 metades): colab-sem-plano → **403 "Assine um plano"** (bypass fechado ⭐⭐); producer-test (plano max2, owns 1) → #1 **201** (abaixo), #2 **403 "Limite de 2 workspaces"** (limite aplicado ⭐); dono A exempt → 201; anônimo → 401. Prova: os 3 caminhos barrados NÃO criaram workspace-fantasma (count antes==depois; slugs test18 = só os 3 que passaram). Zero 5xx.
- [x] Merge `--no-ff` (`da47e05`, branch deletada local+remota).
**Dependência:** nenhuma. **Decisão de produto resolvida:** colaborador só cria ws se tiver plano próprio com folga (sem plano → 403); espelha o tratamento do 1.7. Bloqueio explícito não foi necessário (o check já barra o colab-sem-plano).

### 1.9 — GET `/api/courses/[id]` SEM AUTH (content leak anônimo) 🔴 ✅ FEITO (`ca8a81b`)
**Problema:** o GET de `courses/[id]/route.ts` não exige autenticação — qualquer anônimo com o id do curso baixa o curso COMPLETO (estrutura de módulos/aulas e conteúdo, **`videoUrl` de todas as aulas** + escalares do curso), inclusive curso pago/não publicado. Content leak direto do produto vendido. Achado durante a investigação do 1.7 (não estava no plano).
**Abordagem:** novo `assertCanViewCourse` (read-gate, mais amplo que `assertCanEditCourse`): `getCurrentUser()` → 401; ADMIN ou PRODUCER dono (por `course.ownerId` **ou** `workspace.ownerId`) passam; senão `collaboratorCanActOnCourse(user.id, courseId, anyOf)`. O `anyOf` = as 5 permissões cujas sub-telas de editor legitimamente fazem esse fetch: `[MANAGE_LESSONS, MANAGE_STUDENTS, REPLY_COMMENTS, MANAGE_COMMUNITY, MANAGE_LIVES]`. O helper já embute o guard cross-tenant (`course.workspaceId !== rec.workspaceId → false`) + course-scope. PUT/DELETE seguem gateados por owner/`MANAGE_LESSONS` (inalterados). O `findUnique` interno do gate (ownerId + workspace.ownerId) nunca é retornado ao cliente.
**Dilema `VIEW_ANALYTICS` — resolvido por evidência, não por decisão:** ficou FORA do `anyOf`. O analista de métricas não precisa do conteúdo — a tela de analytics tem endpoint próprio que não consome `videoUrl`. Provado no staging (colab só-`VIEW_ANALYTICS` → 403, sem quebrar analytics).
**Etapas:**
- [x] Read-only: confirmado que a resposta vaza `videoUrl` de todas as aulas + escalares; consumidores mapeados — o aluno usa `by-slug` (não o by-id de editor), então o gate por staff-role não quebra o player.
- [x] Gate: `assertCanViewCourse` (auth + autorização por staff-role/ownership/colaborador com course-scope + cross-tenant).
- [x] Staging **8/8 PASS** ⭐: (1) anônimo → **401** com body `{"error":"Não autorizado"}` (conteúdo NÃO vaza — provado pelo body) ⭐⭐; (2) dono A → 200; (3) colab `MANAGE_LESSONS` → 200; (4) colab `REPLY_COMMENTS` (o moderador do 1.7) → **200** (não regrediu o 1.7) ⭐; (5) colab `VIEW_ANALYTICS` → **403** (fora do anyOf) ⭐; (6) aluno-puro matriculado → **403** no by-id com body `{"error":"Sem permissão"}`; (8) o MESMO aluno → **200** no `by-slug` — o par 6+8 prova o fix cirúrgico (fechou o by-id de editor SEM tocar no caminho legítimo do aluno) ⭐⭐; (7) cross-tenant: colab do ws A → curso do ws B → **403**. Zero 5xx no monitor.
- [x] Merge `--no-ff` (`ca8a81b`, branch deletada local+remota).
**Dependência:** nenhuma.

### 1.10 — Read ungated: customize GET (branding) 🟡 ✅ FEITO (`05cc24b`) (metade quiz = FALSO-POSITIVO)
**Correção da premissa (metade do quiz — investigação do 1.9, 2026-07-04):** ❌ **"o GET de quiz vaza `isCorrect`" era FALSO.** O student quiz GET (`lessons/[id]/quiz/route.ts`) JÁ é gated (`getCurrentUser()` → 401) e o `select` das options é `{ id, text, sortOrder }` — **sem `isCorrect`**. O gabarito nunca vai pro aluno no GET; `isCorrect` só existe no POST (correção server-side), que devolve `correctOptionId` apenas DEPOIS de submeter (comportamento correto). Nada a fazer nessa metade.
**Problema (o que sobra):** o GET de customize (`producer/courses/[id]/customize/route.ts:31`) expunha a config de branding do curso (member* cores/welcomeText/layout) SEM gate — anônimo com o id do curso baixava.
**Abordagem:** espelhar o gate do PUT/DELETE do MESMO arquivo no GET — `requireStaff()` + `canEditCourse(staff, id)`→403 (MANAGE_LESSONS/owner) + estender o catch do GET pra mapear `"Não autorizado"→401` e `"Sem permissão"→403` (trap FURO#5). `canEditCourse` = mais estreito que o anyOf do 1.9 (customize é sub-tela de EDIÇÃO, não de visualização geral). SELECT_FIELDS/retorno inalterado — a aba recebe o mesmo payload; só gateia QUEM acessa. Único consumidor = a aba "Personalizar" do editor; o **aluno pega branding server-side via `getCourseMeta`** (lê Course direto, independente do endpoint).
**Etapas:**
- [x] Read-only: rota `producer/courses/[id]/customize/route.ts:31`; retorna só branding; consumidor único = editor; aluno via getCourseMeta (independente).
- [x] Gate: `requireStaff` + `canEditCourse` no GET + catch estendido (401/403), espelhando PUT/DELETE. 1 arquivo, 0 deleções, build verde.
- [x] Staging **5/5 PASS** ⭐: (1) anônimo → **401** body `{"error":"Não autorizado"}` (branding NÃO vaza) ⭐; (2) dono → 200 com a config real; (3) colab `MANAGE_LESSONS` → 200; (4) colab `REPLY_COMMENTS` sem MANAGE_LESSONS → **403** body `{"error":"Sem permissão para editar este curso"}` ⭐; (5) **não-regressão da área de membros** — dupla prova: (código) `getCourseMeta` lê member* direto do Course; (runtime) login aluno → `/course/curso-teste` **200** com branding renderizado server-side (7× `--member*`, `style=`, título) ⭐⭐. Zero 5xx (o `console.error` do "Não autorizado" é o caminho tratado → 401, não 500).
- [x] Merge `--no-ff` (`05cc24b`, branch deletada local+remota).
**Dependência:** nenhuma. **Achado adjacente:** o reviews GET (terceiro primo ungated) → item **1.13** (decisão de produto, NÃO corrigido aqui).

### 1.11 — menu/reorder PATCH não amarra `courseId` (cross-tenant) 🟡 ✅ FEITO (`82cb150`)
**Problema:** o PATCH de `courses/[id]/menu/reorder/route.ts:21` fazia `prisma.menuItem.update({ where: { id }, data: { order } })` com os `itemIds` **crus do body** — sem `courseId`. O gate `canEditCourse(params.id)` prova acesso ao curso da URL, mas os itens no body podiam ser de OUTRO curso. **Cross-tenant confirmado** (`MenuItem → Course → Workspace`, sem guard; + o menu GET é auth-only, entregando os ids de qq curso): staff do ws X reordena o menu de um curso do ws Y. Dano = vandalismo de integridade (só o campo `order`). Achado na investigação do 1.7.
**Abordagem (fix cirúrgico, espelha as irmãs):** (1) `where: { id, courseId: params.id }` (molde de `courses/[id]/reorder:61` e `modules/[id]/reorder:21` — id fora do curso → `P2025` → `$transaction` rollback atômico). (2) alinhar o catch ao molde das irmãs (`msg === "Não autorizado" ? 401 : "Sem permissão" ? 403 : 500`) — fecha o trap FURO#5 (o catch era 500 genérico → anônimo tomava 500 em vez de 401).
**Etapas:**
- [x] Read-only: rota `menu/reorder:21` (`where: { id }` cru); gate MANAGE_LESSONS existe; cross-tenant confirmado; molde nas irmãs. Sinuca: `groups/reorder` tem o MESMO furo → item **1.14** (não dobrado).
- [x] Fix: `where: { id, courseId: params.id }` (commit `8ebcbe7`) + alinhar catch 401/403 (commit `454c903`, após o staging revelar anônimo=500).
- [x] Staging **5/5 PASS** ⭐: (1) colab reorder do próprio curso A → 200 (order invertida, provado por SQL); (2) **cross-tenant** (ids do B via rota do A) → **500 (P2025/rollback)** e **baseline do curso B `0/1/2` INTACTA** (provado por SQL — o colab do ws A não embaralhou o menu do ws B) ⭐⭐; (3) via rota do curso B (sem acesso) → 403 (gate inline); (4) anônimo → **401 pós-catch** (body `{"error":"Não autorizado"}`, era 500). Restart do dev:staging eliminou ambiguidade do código servido. Zero 5xx inesperado (o 500 do cenário 2 é o rollback; o P2025/"Não autorizado" no log são caminhos tratados).
- [x] Merge `--no-ff` (`82cb150`, branch deletada local+remota).
**Dependência:** nenhuma. **Achado adjacente → item 1.14** (`groups/reorder` cross-tenant, mesma classe, NÃO dobrado — domínio de comunidade).

### 1.12 — overrides/release-all/resend: `MANAGE_LESSONS` onde deveria `MANAGE_STUDENTS` 🟡 ✅ FEITO (`ef312d9`)
**Problema:** as rotas de overrides, release-all e resend (`courses/[id]/students/[enrollmentId]/**`) gateiavam por `canEditCourse` (`MANAGE_LESSONS`), mas são ações per-`enrollmentId` sobre ALUNOS (liberar módulo/aula, liberar tudo, reenviar email de acesso) — a permissão correta é `MANAGE_STUDENTS`. As irmãs `students/[enrollmentId]` e `students/` já usavam `canManageStudentsOfCourse` (MANAGE_STUDENTS) — os 3 filhos eram os outliers.
**Abordagem (drop-in, zero lógica nova):** trocar `canEditCourse` → `canManageStudentsOfCourse` (mesma assinatura `(staff, courseId)`, trata ADMIN/PRODUCER-dono igual) nos **5 handlers** (overrides GET/POST/DELETE + release-all POST + resend POST) + o import em cada um dos 3 arquivos. `loadEnrollment` (o cross-tenant no nível da matrícula) + os catches (já 401/403) + o corpo dos handlers ficam byte-idênticos.
**⚠️ Confirmação decisiva (a UI):** a aba "Alunos" do editor de curso (`course-edit-tabs.tsx:90`) já tem `requires: "MANAGE_STUDENTS"` — o fix **alinha o backend à UI**. Não era só "não quebrar": era o par CONSERTO+FECHAMENTO — hoje o MANAGE_STUDENTS-só via a aba mas tomava 403 (fluxo quebrado), e o MANAGE_LESSONS-só conseguia via API crua (buraco).
**Etapas:**
- [x] Read-only: 3 rotas / 5 handlers com `canEditCourse`; o pai `students/[enrollmentId]` já usa `canManageStudentsOfCourse`; a UI já exige MANAGE_STUDENTS; sinuca = só esses 3 (courses/[id] é falso-positivo, é editor de curso).
- [x] Troca drop-in (3 arquivos, +8/−8, imports substituídos sem órfão, loadEnrollment/catches/corpo intactos).
- [x] Staging: colab MANAGE_STUDENTS → **200** nas 3 (CONSERTO ⭐⭐); colab MANAGE_LESSONS-só → **403** nas 3 (FECHAMENTO ⭐⭐); dono → 200; anônimo → 401. Prova SQL: override escrito pelo MANAGE_STUDENTS (count 1, baseline era 0 → conserto real), revertido a 0 no cleanup. Zero 5xx.
- [x] Merge `--no-ff` (`ef312d9`, branch deletada local+remota).
**Dependência:** nenhuma.

### 1.13 — reviews GET vazava id do reviewer (courses/[id]/reviews) 🟡 ✅ FEITO (`e71e39c`)
**Problema:** o GET de reviews (público, sem gate) expunha ao anônimo **a identidade interna do autor** (`user.id` + o escalar `review.userId`) de todas as reviews de qualquer curso. Achado na varredura de primos do 1.10.
**Decisão de produto (Vinicius) — resolvida por evidência:** **Opção A** (manter público, stripar o id). A investigação provou que a **Opção C (exigir login) QUEBRARIA a vitrine pública** — `/course/[slug]` é acessível por anônimo (o layout não bloqueia; `getCurrentUser()` sem redirect) e renderiza o `CoursePreview` → `ReviewsSection` = prova social pública legítima. As reviews DEVEM ser públicas; só o id interno não pode vazar. (B/isPublished não foi necessária — as reviews aparecem só em cursos que o produtor expõe.)
**Abordagem (causa-raiz, 2 commits):** (1) `7162e6a` — stripar `user.id` do select aninhado + ajustar o `interface ReviewItem` do front. (2) `002abfd` — ⚠️ o 1º foi **insuficiente**: o `include` trazia TODOS os escalares da Review, incl. **`review.userId`** (o mesmo id, por outro campo). Trocar `include` → **`select` explícito** que retorna só `{ id, rating, comment, createdAt, user:{name,avatarUrl} }` (os 6 campos que o front usa, mapeados por evidência) — omite `userId`/`courseId`/`updatedAt`. **POST intacto** (retorna o id do próprio autor logado, não é leak).
**Etapas:**
- [x] Investigação: quem consome o GET (a vitrine pública consome → C quebraria); o front usa só 6 campos; A é a opção certa.
- [x] Fix causa-raiz (strip user.id + include→select), 2 arquivos (`route.ts` + `reviews-section.tsx`), build verde.
- [x] Staging: anônimo GET → **200** (público preservado); **payload cru** provou **nenhum `userId`, nenhum `user.id`, nenhum `courseId`/`updatedAt`** — só `id/rating/comment/createdAt/user{name,avatarUrl}`. ⚠️ O payload cru pegou o vazamento que o status 200 escondia (o 1º commit "passava" mas vazava `review.userId`).
- [x] Merge `--no-ff` (`e71e39c`, leva `7162e6a`+`002abfd`, branch deletada).
**Dependência:** nenhuma. **Lição:** validar o PAYLOAD, não só o status — um 200 pode esconder o vazamento; e stripar um campo não basta se o ORM traz o mesmo dado por outro (`include` vs `select` explícito).

### 1.14 — community/groups cross-tenant (CLUSTER de 6 handlers) 🟠 ✅ FEITO (`e0d3171`)
**Problema (era "groups/reorder", virou CLUSTER):** o rótulo do plano cobria só o reorder, mas a investigação (lição do 1.4 — não confiar no rótulo) achou que **os 6 handlers de `producer/community/groups/**` operavam por id/courseId cru sem validar o workspace do recurso** — nenhum resolvia o escopo do staff. `CommunityGroup → Course → Workspace` (sem workspaceId direto; rota do reorder/GET/POST sem `[id]`). Vetores cross-tenant: DELETE (destrutivo :161), POST (cria em curso alheio :83), PUT (edita/censura), reorder, e os 2 GETs (o `groups` GET ainda disparava `ensureDefaultGroup` = **write cross-tenant por um read**).
**Abordagem (molde reusado, zero helper novo):** bloco de 3 ramos inline (ADMIN → PRODUCER-dono via `course.ownerId`/`workspace.ownerId` → `collaboratorCanActOnCourse(staff.id, courseId, ["MANAGE_COMMUNITY"])`), espelhando `posts/[id]`. O helper do 1.9 já embute o guard cross-tenant + o course-scope do colaborador. Origem do courseId por handler: `group.courseId` (findUnique pré-op nos `[id]`), `courseId` da query/body (GET/POST), e no **reorder (bulk)** = findMany → cada courseId distinto validado, `$transaction` filtrado aos ids validados (all-or-nothing; ids inexistentes ignorados, sem P2025). Os 6 catches já mapeavam 401/403 (sem FURO#5). Fatiado: **Fatia 1** = DELETE+POST (`dca846c`, os destrutivos, authz antes do isDefault leak); **Fatia 2** = reorder+GET+`[id]` GET/PUT (`3210447`).
**Etapas:**
- [x] Read-only a fundo: os 6 handlers + o model + o molde (`community/route.ts`/`posts/[id]`); sinuca = posts/** já é seguro (valida o curso do recurso — é o molde), o cluster é só groups/**.
- [x] Fatia 1 (DELETE+POST) + Fatia 2 (reorder+GET+[id] GET/PUT) — 3 arquivos, +147/−6, 6 blocos de 3 ramos (ramo dono nos 6).
- [x] Staging **10/10 PASS** (2-ws): DELETE/POST/PUT/reorder/GET cross-tenant → 403; **write-por-read barrado** (GET do curso B → 403, `count(B)` = 2 → `ensureDefaultGroup` NÃO criou default) ⭐; **reorder all-or-nothing provado isolado** (lote misto A+B com order 9 → 403, nada virou 9) ⭐; grupo B name/order inalterados; anônimos → 401; dono legítimo no curso A (GET/PUT/reorder) → 200. Zero 5xx. (Percalço de infra: `.next` corrompeu com 2 dev servers concorrentes → 404 em tudo; resolvido com `rm -rf .next` + restart limpo.)
- [x] Merge `--no-ff` (`e0d3171`, leva `dca846c`+`3210447`, branch deletada local+remota).
**Dependência:** nenhuma. Achado adjacente do 1.11 (NÃO dobrado no 1.11 — domínio de comunidade). Correção de escopo diferente do menu: **join relacional `group→course→workspaceId`**, não `where` composto (o grupo não tem workspaceId; a rota não tem `[id]`).

> **Nota menor — RESOLVIDA pelo 1.14:** o GET de groups tratava COLLABORATOR como staff SEM course-scope. O fix do 1.14 usa `collaboratorCanActOnCourse(..., ["MANAGE_COMMUNITY"])`, que embute o course-scope (courseIds do colaborador) — então o colaborador com escopo restrito não enxerga mais groups além do escopo. Fechado junto com o cluster.

---

# FASE 2 — Infra de segurança 🟡 (2.1 + 2.2 + 2.3 + 2.6 + 2.6b ✅ código; 2.7 + Candidato-2 ✅ confirmado-seguro)

> **Abertos:** 2.4 PARCIAL (rate limit — **Peça A shared-store Upstash ✅ `75c07be`** · **Peça B.1 origin lockdown OBSERVE ✅ `53748b2`**; abertas: **Peça B.2 enforce** (após janela de observação limpa) + **constant-time login** do G2 da Raiz; stopgap **2.4a** ✅ `c3bad5a`) · 2.5 (CSP `unsafe-inline`/`unsafe-eval`).
> **Fechados:** 2.7 (cores dos `<style>` vs CSS-injection — não-item, 19 cores já hex-validadas; ver §2.7) · 2.6b (path themed sanitizado; ver §2.6b) · Candidato-2 (preview `email-tab.tsx` — não-item, iframe `sandbox=""`). ✅ **MARCO: família email/sanitize completa** (raw+themed+preview).

> **Por que aqui:** barata e importante. Fecha a camada de infra que a auditoria de código não cobre. A maioria é trivial (1 header, 1 comando).
> **Progresso:** ✅ **2.1 HSTS** (`de00875`) + ✅ **2.2 npm audit** (`7eaaf66`) + ✅ **2.3 lesson.description XSS** (`3d40bc3`) + ✅ **2.6 emailCustomHtml sanitize** (`aa0e1a2`) + ✅ **2.6b themed sanitize** (`98b1381`) + ✅ **2.7 cores/CSS-injection** (não-item) + ✅ **Candidato-2 preview** (não-item). ABERTOS: **2.4** rate limit (2.4a stopgap ✅ + **Peça A shared-store ✅ `75c07be`** + **Peça B.1 lockdown OBSERVE ✅ `53748b2`**; Peça B.2 enforce + constant-time pendentes) + **2.5** CSP.

### 2.1 — HSTS 🟢 ✅ FEITO (`de00875`)
**Problema:** `next.config.mjs` tinha X-Frame/CSP/nosniff/Referrer/Permissions mas faltava `Strict-Transport-Security`. (HSTS não existia em lugar nenhum — nem no `proxy.ts` middleware, nem no `vercel.json`.)
**Abordagem + ⚠️ decisão dos custom domains:** adicionar `{ key: "Strict-Transport-Security", value: "max-age=2592000" }` (30 dias) no bloco `/(.*)` do `next.config.mjs`. **SEM `includeSubDomains`** — a investigação achou `Workspace.customDomain String? @unique` (schema:120): o `headers()` aplica em TODAS as respostas incl. os custom domains de cliente, então `includeSubDomains` imporia HTTPS em subdomínios de domínios que **não controlamos** (ex.: `mail.cliente.com`) e poderia quebrá-los. **SEM `preload`** — irreversível (lista embutida dos browsers). Bare host só (já é HTTPS via Vercel).
**Etapas:**
- [x] Read-only: confirmar que HSTS não existia (next.config/proxy.ts/vercel.json); mapear os domínios (apex + app + vercel.app + custom domains) → todos HTTPS na Vercel; a decisão sem includeSubDomains/preload.
- [x] Adicionar o header (1 entrada no array `/(.*)`) — build verde, os 5 outros headers intactos.
- [x] Staging: `curl -sI` provou `Strict-Transport-Security: max-age=2592000` servido, **sem includeSubDomains/preload** no value, + os 5 outros headers presentes.
- [x] Merge `--no-ff` (`de00875`, branch deletada).
**⚠️ AÇÃO FUTURA (sem urgência):** ramp do `max-age` **30d → 1 ano (`31536000`)** quando confirmado estável em prod — 1 edição pontual do value no `next.config.mjs`.
**Dependência:** nenhuma.

### 2.2 — `npm audit` (CVEs transitivas) 🟢 ✅ FEITO (`7eaaf66`)
**Problema:** 2 CVEs, **ambas transitivas**: **dompurify <=3.4.10** (moderate, via `jspdf@4.2.1` — NÃO via tiptap como o plano supôs; o app usa `sanitize-html` no server, não dompurify) + **@babel/core <=7.29.0** (low, via `eslint-config-next` → dev-tooling). Ambas com fix por `npm audit fix` SEM `--force` (bump patch).
**Blast radius ≈ 0:** o app **não importa dompurify** (grep zero; sanitizador = `sanitize-html`); o único consumidor de jspdf é `certificate-pdf.ts`, que usa a **API de desenho** (`doc.rect/text/line`), **não** `.html()`/`fromHTML` (o caminho HTML→dompurify vulnerável). @babel/core é só lint (fora do runtime).
**Fix:** `npm audit fix` (sem --force) → dompurify 3.4.2→3.4.11, @babel/core 7.29.0→7.29.7. **Só o `package-lock.json` mudou** (84/84), package.json intacto (nenhuma é dep direta).
**⚠️ LIÇÃO — o fix-fantasma:** o `npm audit fix` atualizou o **lockfile** mas **NÃO reinstalou o node_modules** (a versão velha 3.4.2 satisfazia o range `^3.3.1` do jspdf, então o `npm install` não forçou o pin exato). Resultado enganoso: `npm audit` reportava 0 e o build "passava" — **mas contra o código VELHO**. Validar exige **`npm ci`** (instala exato do lockfile, do zero — o que a Vercel faz) ANTES do build, senão o "build verde" testa o código velho. Só após o `npm ci` o node_modules ficou em 3.4.11/7.29.7 e o build exercitou o código patcheado.
**Etapas:**
- [x] Read-only: `npm audit` (2 CVEs transitivas) + `npm ls` (jspdf→dompurify, eslint→@babel) + grep (app não usa dompurify) + `--dry-run` (17 patch-bumps, zero major).
- [x] `npm audit fix` (sem --force) + ⚠️ `npm ci` pra sincronizar node_modules ao lockfile + build verde contra as versões corrigidas.
- [x] Verificação dobrada: audit 0 (todas severidades), node_modules E lockfile em 3.4.11/7.29.7, jspdf 4.2.1 intacto sem caminho HTML, só o lockfile no diff.
- [x] Merge `--no-ff` (`7eaaf66`, branch deletada). Prod: a Vercel roda `npm ci` → instala as versões patcheadas do lockfile.
**Dependência:** nenhuma.

### 2.3 — XSS sink: sanitizar `lesson.description` 🟡 ✅ FEITO (`3d40bc3`)
**Problema:** `(course)/.../lesson/[id]/page.tsx:669` renderizava `lesson.description` (producer-authored) via `dangerouslySetInnerHTML` **sem `sanitizeHtml`** — stored XSS producer→aluno (um colaborador com MANAGE_LESSONS injeta `<script>` na descrição → executa na aba do aluno matriculado).
**Investigação (varredura de TODOS os `dangerouslySetInnerHTML`):** 8 sinks — os **4 da comunidade** (pending-tab, posts-tab, post-card x2) **JÁ sanitizam** (`sanitizeHtml(content)`); os **3 de `<style>`** (course/w layout + producer-theme-provider) são **CSS-vars** (categoria à parte, não HTML de usuário); o **único cru de HTML de usuário era o `lesson.description`**.
**Fix (render, reusa o padrão da comunidade):** `sanitizeHtml(data.lesson.description)` no sink + o import `import { sanitizeHtml } from "@/lib/sanitize-html"` (byte-idêntico ao post-card). **Render-time** (não persistência) → protege o conteúdo **retroativo** (descrições já salvas nunca foram sanitizadas) e espelha os 4 sinks da comunidade. Null-safe pelo guard `data.lesson.description ?`. Roda client-side (a page é `"use client"`, como o post-card). A allowlist cobre o Tiptap do description (`rich-text-editor.tsx`, heading levels 1-2) → **sem perda de formatação** (só o `<hr>` menor sai, consistente com os posts). +2/−1, 1 arquivo.
**Etapas:**
- [x] Read-only: varredura dos 8 sinks (1 cru = lesson.description); o `sanitizeHtml` (allowlist rich-text) + o Tiptap (h1-2, coberto); render vs persistência (render protege o retroativo).
- [x] `sanitizeHtml(data.lesson.description)` no render (mesmo helper/import da comunidade).
- [x] Prova: rodei o `sanitizeHtml` com payload de ataque — `<script>`/`onerror`/`<iframe>`/`onclick` **neutralizados**, `<h2>/<strong>/<em>/<ul>/<a>/<blockquote>` **preservados**, `<a>` endurecido (`rel=noopener noreferrer nofollow`). Build verde.
- [x] Merge `--no-ff` (`3d40bc3`, branch deletada).
**Dependência:** relaciona com 1.7 (quem edita conteúdo).

> **Candidato 2.7 (sinuca do 2.3) → ✅ RESOLVIDO como NÃO-ITEM (ver 2.7 abaixo):** confirmado que TODAS as cores dos 3 sinks `<style>` (member* + vitrine + producer theme) são hex-validadas na escrita — não há CSS-injection. Nada a aplicar.

### 2.4 — Rate limiting: store compartilhado + origem 🔴 PARCIAL (2.4a stopgap ✅ `c3bad5a` · **Peça A shared-store ✅ `75c07be`** · **Peça B.1 origin lockdown OBSERVE ✅ `53748b2`** · Peça B.2 enforce + constant-time ABERTAS)
**2.4 Peça A ✅ FEITO (merge `75c07be`) — shared-store Upstash:** o contador saiu da memória per-instância (2.4a, teto real 100×N) pro **Upstash Redis compartilhado** (fixed-window por INCR + EXPIRE NX, 1 round-trip, provado no client 1.38.0). **Chave POR-ROTA** (pathname completo) conserta o defeito por-segmento abaixo. **Fail-open com fallback local + timeout 800ms** (Upstash down → o Map do 2.4a assume, ninguém trancado). **Env só em Production** → staging/dev no fallback por design. Assinatura virou `async` (bloqueador provado na investigação) → **18 call-sites +await** (2 greps anti-esquecimento limpos). **PROVA FÍSICA do shared-store no staging:** com o processo MORTO, o Redis mantém count=105; pós-restart 1 request → **429** (o Map teria zerado → seria 400). Fix por-rota provado ao vivo (chaves `rl:::1:/api/auth/login` e `.../producer-login` separadas). ⚠️ **Lição do falso-400:** a 1ª tentativa do restart deu 400 ambíguo (a janela de 60s expirou no restart lento do Turbopack + a chave usa o IP `::1`, não `unknown`) — resolvido inspecionando o store DIRETO, não aceitando o resultado ambíguo. **ABERTO no 2.4:** **Peça B — origin lockdown** (a origem `applyfy-mvp.vercel.app` segue exposta; ⚠️ os 2 vetores mapeados na investigação: webhooks `*.vercel.app` do README histórico + o Vercel Cron direto — ambos quebram num lockdown seco) · **constant-time login** (herdado do G2 da Raiz). *(2.4a rebatizado de "stopgap 1.2/1.3", encerrando a colisão com os itens 1.2/1.3 da FASE 1.)*
**Problema (o que segue aberto):** `src/lib/rate-limit.ts` cobre **17 rotas** (`grep -rl "rateLimit(" src/app/api`, recontado 2026-07-13; inclui a `w/[slug]/password` do BUG C), in-memory per-instance. CRUD producer sem proteção. **Origem `applyfy-mvp.vercel.app` diretamente exposta** (requests podem pular o Cloudflare → origin lockdown faz parte deste item).
**⚠️ INPUT comprovado em staging (T5 do stopgap, com contraprova):** a chave `ip:pathname.split('/')[2]` agrupa **TODAS** as `/api/w/*` sob o segmento `w` → o teto de 100/min é **por-segmento, não por-rota**. Provado ao vivo: 100 logins esgotaram o balde e a `forgot-password` do MESMO IP tomou 429 (IP limpo → 200). Um brute-force no login consome o mesmo balde de forgot/reset/password/troca-de-senha daquele IP. ⚠️ **O redesign DEVE usar chave POR-ROTA** — a chave atual `split('/')[2]` é o defeito a corrigir, seja qual for a arquitetura.
**Estado da decisão (2026-07-17):** store compartilhado **FEITO (Peça A `75c07be`)** — o Upstash/Redis voltou a ser o plano corrente e entregou; o pivô WAF-puro foi descartado como substituto do store (o lockdown de borda é complementar, não substituto). **Restam no 2.4:** a Peça B (lockdown) e o constant-time.
**Etapas:**
- [x] **Peça A — store compartilhado** (Upstash + fallback local, chave POR-ROTA) — `75c07be`.
- [x] **Peça B.1 — origin lockdown MODO-OBSERVAÇÃO** ✅ (merge `53748b2`) — vigia em **NODE** (helper `observeOrigin`, chamado das rotas; **proxy INTOCADO**, provado por diff vazio, matando os 3 riscos-edge do desenho: env-in-edge, crypto-in-edge, waitUntil nunca usado). Registra requests SEM o carimbo Cloudflare (header Vercel + `ORIGIN_LOCK_SECRET` nosso — o header puro é forjável, valida-se o VALOR por `safeCompare`) na tabela nova `OriginLockLog` (enxuta: path/method/ip/UA/reason/createdAt) e **SEMPRE deixa passar** — zero bloqueio nesta fase. **Escopo (recomendação do desenho, delegada): 10 rotas** = 4 webhooks (`webhook-external`, o Vetor-1 do README `*.vercel.app`) + 3 crons (`exempt-cron`, isentos via CRON_SECRET, vigia DEPOIS do gate) + 3 logins admin/producer/student (`no-stamp`). As 18 rate-limited fora de propósito (browser só via Cloudflare → diff sem sinal). Tela `/admin/origin-lock` (gate `VIEW_AUDIT`, molde do audit) agrega por rota, rotula webhook/cron como esperado. **Deploy-safe sem env:** falta de `ORIGIN_LOCK_SECRET` → tudo vira `no-stamp`, nada quebra. **Staging validado** (4 casos por curl + query direta: carimbo-válido silencia, no-stamp/webhook-external/exempt-cron gravam; cleanup 8→0). **Prod:** migração `20260717234855_add_origin_lock_log` aplicada via `migrate deploy` ANTES do push (ordem-gate), tabela provada vazia. ⚠️ **Falta o operador ligar:** `ORIGIN_LOCK_SECRET` na Vercel (Production) + Transform Rule no Cloudflare setando `x-origin-lock` (segredo gerado em `.origin-lock-secret.txt` gitignored, pro Vinicius copiar e apagar).
- [ ] **Peça B.2 — origin lockdown ENFORCE** — só APÓS uma **janela de observação limpa** (a tela confirmar que só webhook-external/exempt-cron aparecem, nenhum tráfego legítimo inesperado). Bloquear no-stamp. ⚠️ **fail-OPEN se a env faltar** (deploy quebrado não pode trancar o site inteiro). O `webhook-external` é o gate real: migrar os produtores que apontam Applyfy pra `*.vercel.app` ANTES de cortar.
- [ ] **constant-time login** (do G2 da Raiz) — mascarar o oráculo de existência do GoTrue (pré-existente).
**Dependência:** nenhuma; a Peça B.2 é config-de-painel + a janela de observação (o desenho já mapeou o CRON_SECRET pra isentar o cron; o furo do proxy no-op pra `/api/` foi contornado indo pro Node).

### 2.5 — CSP `unsafe-inline`/`unsafe-eval` (avaliar) 🔴
**Problema:** `next.config.mjs:36-49` — CSP com `unsafe-inline`+`unsafe-eval` no script-src (enfraquece proteção XSS). Difícil (Next + embeds).
**Abordagem:** investigar viabilidade de nonce/hash sem quebrar Next/embeds. Pode ficar como "avaliado, risco aceito documentado" se o custo for alto demais.
**Etapas:**
- [ ] Read-only: o que depende de inline/eval hoje (Next runtime, players, etc.).
- [ ] Avaliar nonce-based CSP; se inviável sem regressão, documentar a decisão.
- [ ] (se viável) implementar + staging extensivo (players, embeds, PWA).
- [ ] Merge `--no-ff` OU registro de risco aceito.
**Dependência:** nenhuma. Candidato a adiar se o custo/risco não compensar agora.

### 2.6 — Sanitizar `emailCustomHtml` (defense-in-depth) 🟡 ✅ FEITO (`aa0e1a2`)
**Problema:** o path RAW do `buildAccessEmail` (`email-templates.ts:219-223`) injetava o `emailCustomHtml` do produtor no corpo do email de acesso SEM sanitizar (`html: applyVars(config.emailCustomHtml, vars)`). Enviado a TODO comprador novo (enrollment, import, add-students, resend, webhooks Applyfy).
**Fix (`aa0e1a2`):** `sanitizeEmailHtml` novo em `src/lib/sanitize-html.ts` (ao lado do `sanitizeHtml`) + wrap no sink → `applyVars(sanitizeEmailHtml(config.emailCustomHtml), vars)`. Render-time. **2 arquivos, +45/−1.**
**⚠️ A PREMISSA DO PLANO ESTAVA ERRADA:** o plano dizia "reusar o `sanitizeHtml` do 2.3". **Não serve** — a allowlist do 2.3 é rich-text de PÁGINA (p/strong/ul/h1-3/…) e apagaria o layout de EMAIL (provado tag a tag: `table`/`thead`/`tbody`/`tr`/`td`/`th`/`div`/`center`/`font`/`hr`/`h4-6` AUSENTES, e `style` só era permitido em `<img>`). → Precisou de uma **allowlist de EMAIL própria** (`EMAIL_OPTIONS`): permissiva pra layout (tabelas + `style=""` inline em todas as tags + `align`/`bgcolor`/`width`/`height`/`cellpadding`/`cellspacing`/`border`/`colspan`/…) mas que ainda **bloqueia** `script`/`on*`/`iframe`/`object`/`embed`/`form`/`link`/`javascript:`+`data:` URIs/`<style>` blocks (só `style=""` inline sobra).
**Ordem `sanitize → applyVars`:** sanitiza a estrutura crua do produtor PRIMEIRO, injeta as vars DEPOIS. As 6 vars foram rastreadas a file:line: `senha`/`link` = **sistema** (temp password rotacionada + env/slug); `curso`/`workspace` = **do produtor** (dono, mesma fronteira de quem escreve o campo); `nome`/`email` = **do próprio destinatário** (self-targeted). **Nenhuma é "terceiro ataca vítima diferente"** → sanitizar antes é seguro e evita mangar uma senha/link com char especial.
**Provas:** 12 vetores bloqueados rodando a config exata (execução real da lib) + **13/13 no fluxo completo do staging** (ws de teste com `emailUseCustomHtml=true`, round-trip `@db.Text` idêntico, `sanitizeEmailHtml` transpilado da FONTE REAL): layout preservado (`table`/`cellpadding`/`bgcolor`/`width`/`td style`/`h1 style`/`a href`) + payload neutralizado (`<script>` sumiu, `onerror` stripado, `<iframe>` sumiu) + vars injetadas (`{nome}`→`Maria Silva`, etc.). Build exit 0.
**Risco:** defense-in-depth de risco BAIXO — input é **owner-only** (fechado no 1.3) + clientes de email já sandboxam JS. Blinda o cliente raro que renderiza JS, webview in-app, e phishing via `<iframe>`/`<form>`.
**⚠️ 2 RESÍDUOS declarados e aceitos:**
- (a) o `<a>` em email usa `rel="noopener noreferrer"` **sem** `nofollow`/`target="_blank"` forçado (adaptado ao contexto de email — `nofollow` é SEO, e clientes de email reescrevem/sandboxam links; forçar `target` só sobrescreveria a intenção do produtor sem ganho). `href`/`target`/`style` do produtor preservados.
- (b) o `sanitize-html` **não faz deep-sanitize do VALOR do `style`** (permite `style="…url(javascript:)…"`/`url(data:)`). Não executa em browser moderno nem em email sandboxed, e o autor do style é o próprio owner; restringir via `allowedStyles` quebraria layout legítimo. Aceito dado o risco-base baixo.
**CANDIDATOS gerados — AMBOS FECHADOS:**
- **2.6b** ✅ FEITO (`98b1381`) — sanitizar o path THEMED. Ver §2.6b abaixo.
- **Preview `email-tab.tsx`** ✅ CONFIRMADO SEGURO (não-item). Ver §Candidato-2 abaixo.

### 2.6b — Sanitizar o path THEMED do `buildAccessEmail` 🟡 ✅ FEITO (`98b1381`)
O path THEMED (`email-templates.ts:259-326`, roda quando há campos visuais setados) injetava **4 campos de produtor crus** no HTML montado: `emailBody`→`<div>` (:304), `emailTitle`→`<h1>` (:303), `emailFooter`→`<p>` (:316) — HTML cru — e `emailLogoUrl`→`<img src="${logoUrl}">` (:296) — **attribute-injection** via breakout de aspas (`x" onerror="…`, URL só length-cap, sem validação de formato). Owner-only (1.3), mesma classe do 2.6 (raw), só que via themed.
**Fix (abordagem B):** 1 linha no return do themed (:326) — `html` → `sanitizeEmailHtml(html)` (reusa o helper do 2.6, já importado). Envolve o **HTML montado** (depois do molde + `applyVars`), cobrindo os 4 num lugar só — **inclusive o logo breakout, que um sanitize per-campo NÃO pegaria** (o `onerror` do atributo é stripado). +1/−1, 1 arquivo.
**Vigilância central provada (execução real + staging 13/13):** o NOSSO molde sobrevive (`<table role=presentation>`, `style` inline, `<h1>/<div>/<p>`, CTA `<a target>`, `<img>`); as vars/link sobrevivem (`{nome}/{curso}/{senha}/{workspace}` + `{link}` com query — o `&`→`&amp;` é **encoding HTML correto**, o cliente decodifica ao seguir → não quebra); os 4 vetores morrem (`<script>`/`<iframe>` removidos, `onerror` do title E do logo stripados). Build exit 0.
**Escopo:** só o return themed (:326). O RAW (:223, do 2.6) e o DEFAULT (:247/:256, molde hardcoded sem campos de HTML de produtor) inalterados.
**Risco:** defense-in-depth BAIXO (owner-only + email sandboxa JS), idêntico ao 2.6.

### Candidato-2 — Preview do email (`email-tab.tsx`) 🟢 ✅ CONFIRMADO SEGURO (NÃO-ITEM)
O preview renderiza o `emailCustomHtml` num **`<iframe srcDoc={previewHtml} sandbox="">`** (`email-tab.tsx:329-333`). **`sandbox=""` vazio = restrição máxima** (sem `allow-scripts` → JS não executa) → não há self-XSS. Sanitizar seria redundante. **Não-item.**
**Nuance de UX (NÃO furo, registrada):** pós-2.6/2.6b o email ENVIADO é sanitizado, mas o preview mostra o `emailCustomHtml` cru → o preview diverge do que sai. Alinhar (sanitizar o preview) seria WYSIWYG mais fiel — **decisão de produto, não segurança**.

### Candidato cosmético — SUBJECT do path themed 🟢 (trivial, NÃO furo — registrar)
O wrap do 2.6b sanitiza só o `html` (corpo). O **subject** do themed continua cru (`subjectFor(emailTitle)`) — no teste saiu `subject: "Acesso <img … onerror=…> liberado"`. **NÃO é furo:** o header Subject é renderizado como **texto puro** pelos clientes (a tag aparece literal, não executa). Só fica feio se o produtor puser tag no título. `stripHtml(subject)` de 1 linha resolveria — **candidato cosmético, não segurança**.

### ✅ MARCO — família email/sanitize COMPLETA
Os 3 paths do `buildAccessEmail` que tocam HTML de produtor estão cobertos: **RAW** (`emailCustomHtml`, 2.6 `aa0e1a2`) + **THEMED** (`emailBody`/`emailTitle`/`emailFooter`/`emailLogoUrl`, 2.6b `98b1381`) + **PREVIEW** (não-item, `<iframe sandbox="">`). Resíduos declarados: subject cosmético (acima) + os 2 do 2.6 (rel sem nofollow/target; style-value não deep-sanitizado).
**Dependência:** mitigado por 1.3 (owner-only).

### 2.7 — Validar cores dos `<style>` vs CSS-injection 🟢 ✅ CONFIRMADO SEGURO (NÃO-ITEM, sem código)
Os 3 sinks `<style>` (`course/[slug]/layout.tsx`, `w/[slug]/layout.tsx`, `producer-theme-provider.tsx`) injetam **19 valores de cor** em `:root{}`. A investigação (READ-ONLY) provou que **NÃO há CSS-injection**, em 3 camadas:
1. **Todos os 19 são hex-validados** `/^#[0-9a-fA-F]{6}$/` → 400 na escrita (member* `customize/route.ts:8,72-79`; vitrine* `validations.ts:264` via `vitrine/route.ts:100`; accentColor tb no PATCH owner-only `workspaces/[id]/route.ts:19,43-63`; producer-theme `theme/route.ts:73-79`) — um `}` é rejeitado.
2. O input é **`<input type="color">`** (`color-field.tsx:26`) que SÓ emite `#rrggbb` → a validação hex-only **não quebra cor legítima** (zero falso-positivo).
3. **Zero cor não-hex salva no staging** (1 curso × 6 + 1 ws × 7 + 4 users × 7 = todos hex; sem risco retroativo).
**Fios soltos verificados:** `darkenHex` é safe-by-construction (`color-utils.ts:2` valida antes); as 5 rotas restantes usam os campos em `select:` (leitura de valores já validados na origem); `supportButtonColor` (`courses/[id]/route.ts:174`) + `login*`/`email*` (`workspaces/[id]/route.ts:43-53`) **também** hex-validados. O `producer-theme` (sink 3) é ainda **self-scoped** (só o próprio dashboard, `user.themeConfig` lido só no `producer/layout.tsx`).
**VERDICT:** não-item, nada a aplicar. **A validação hex das cores já fecha o vetor de CSS-injection.** (Categoria era diferente do 2.3: CSS-injection, não JS-XSS.)

---

# FASE 3 — Confiabilidade do email (A + B) 🟡

> **Por que aqui:** afeta cliente pagante DIRETO (aluno paga, email de acesso falha em silêncio, ninguém sabe). E é PRÉ-REQUISITO do magic-link (1.5). Crítico.

### 3.1 — Fase A: retry + backoff + timeout no `sendEmail` 🟡
**Problema:** `src/lib/email.ts:17-54` — 1 chamada Brevo, sem retry/timeout, catch engole o erro, `messageId` descartado. Fire-and-forget: se o Brevo falha, o email se perde e ninguém fica sabendo. ~15 call sites.
**Abordagem:** envolver o `sendEmail` com retry + backoff exponencial + timeout. Resolve ~90% dos casos.
**Etapas:**
- [ ] Read-only: confirmar o `sendEmail` + os ~15 call sites + o shape do retorno do Brevo.
- [ ] As 7 Perguntas (há lib de retry no projeto? ou implementar mínimo?).
- [ ] Implementar retry/backoff/timeout no ponto central `sendEmail` (1 lugar, cobre os 15 sites).
- [ ] Staging: **forçar o Brevo a falhar** (key inválida/timeout) → confirmar retry → confirmar que o erro não é mais engolido.
- [ ] Merge `--no-ff`.
**Dependência:** nenhuma. **Desbloqueia 1.5 (magic-link).**

### 3.2 — Fase B: tabela `EmailLog` 🟡
**Problema:** zero auditoria de email — não dá pra saber o que foi enviado, o que falhou, pra quem.
**Abordagem:** tabela `EmailLog` (to/type/status/messageId/attempts) — trilha de auditoria.
**Etapas:**
- [ ] Read-only: confirmar que não há log hoje + o schema ideal.
- [ ] Schema: `EmailLog` + migração manual (`migrate deploy`).
- [ ] Gravar no `EmailLog` em cada envio (sucesso e falha) no ponto central.
- [ ] (opcional) UI admin pra visualizar os logs.
- [ ] Staging: enviar → log gravado; forçar falha → log com status FAILED + attempts.
- [ ] Merge `--no-ff`.
**Dependência:** depois de 3.1. Relaciona com D1 (migração).
**Nota:** Fase C (fila + cron) só quando o volume justificar — NÃO agora.

---

# FASE 4 — Bugs conhecidos 🟢 (4.1 ✅ via 1.12 · 4.2 ✅ `022f933` · 4.3 ✅ `159fc0f` · 4.4 ✅ condição eliminada; aberto: 4.5)

> **Candidato de UX (registrado, item separado):** student deslogado é mandado pro `/producer/login` (esquisito). Deveria ir pro `/w/{slug}/login` — mudar no middleware (`proxy.ts:75-86`) **E** no guard (`course-shell`) JUNTOS, com validação própria. O slug está disponível via `useParams`.

> **Candidato separado (registrado, NÃO fazer):** moderação de comunidade exigir `MANAGE_COMMUNITY` (hoje `REPLY_COMMENTS` já basta — para colab-por-role E STUDENT-collab). Apertaria os DOIS personas → fora do escopo da paridade do 4.2. Avaliar em item futuro.

> **Por que aqui:** bugs reais registrados, mas todos de gravidade baixa-média (nenhum crítico). Limpeza antes das features.

- [x] **4.1 — resend de credencial: permissão errada** 🟢 ✅ FEITO (via `ef312d9` — item 1.12). RESOLVIDO pelo 1.12, que trocou `canEditCourse` → `canManageStudentsOfCourse` em `courses/[id]/students/[enrollmentId]/resend/route.ts:14`. Prova antes→depois: pai `39e7279` usava `canEditCourse` (MANAGE_LESSONS); main usa `canManageStudentsOfCourse` (MANAGE_STUDENTS). Disambiguação: as outras rotas de "resend" (`producer`/`admin` collaborators = convite de colaborador; `analytics` = falso-positivo de string) são de outro domínio e não são o alvo do 4.1. **NÃO-ITEM — o plano estava desatualizado.**
- [x] **4.2 — STUDENT-com-collab: capacidade de moderação** 🟢 ✅ FEITO (`022f933`). Era FURO REAL remanescente (a hipótese "não-item" foi **refutada** por varredura adversarial de 21 getCurrentUser-direct paths → **3 mishandled, 18 safe, 0 falsos-positivos**).
  - **⚠️ CORREÇÃO DE MODELO MENTAL:** o título ("getCurrentUser não promove") descrevia **design CORRETO** — `getCurrentUser` devolve identidade crua de propósito; a promoção vive em `requireStaff` (C6) + helpers row-based. O furo real: rotas que consomem `getCurrentUser` **direto** e gateiam **CAPACIDADE** em `isStaff(user)` (`auth.ts:196`, sem row-lookup → `false` pro STUDENT-collab por construção). **Fix-incompleto do Stage C:** de-role-gatearam os gates de ACESSO, deixaram os de CAPACIDADE.
  - **3 rotas:** `posts/[id]/comments` (2 call sites: GET statusFilter + POST auto-approve), `courses/[id]/groups` (bool isStaff), `lessons/[id]/comments` (POST auto-approve).
  - **Fix = paridade:** `isStaff(user) || (await <row-lookup da própria rota>)`. O `||` curto-circuita (zero query pros que já passavam). Reuso puro: `collaboratorCanActOnCourse` + `collaboratorAllowed` local. **ZERO helper novo; `getCurrentUser`/`isStaff` intocados** (corretos por design). Semântica = replicar o `isStaff` atual (concede a qualquer colab que passou o acesso REPLY|MANAGE), NÃO apertar.
  - **BÔNUS:** `courses/[id]/groups` fechou um **over-broad** — o branch `role==="COLLABORATOR"` puro não tinha workspace/course/permission scope; colab de outro ws via grupos alheios. Era a ÚNICA rota com esse bypass (as de comentário já eram scoped no acesso desde o C6).
  - **Provado no staging (5 personas + regressões):** P1 STUDENT-collab ganha as 3 capacidades · P1==P2 (paridade, a inconsistência que era o bug) · P3 aluno puro não ganha nada (contra-teste) · P4 colab de outro ws e P5 colab sem REPLY|MANAGE perdem o bypass do groups (over-broad fechado) · ADMIN/PRODUCER-dono intactos. Ver [[project_student_collab_capability_4_2]].
- [x] **4.3 — redirect deslogado (raiz: cookie stale)** 🟢 ✅ FEITO (`159fc0f`). Era FURO REAL. **⚠️ MAS a solução que o item prescrevia ("espelhar o fix do /producer") estava ERRADA:** o molde do producer não tem defesa contra cookie-stale — ele só não trava porque o *logout* limpa o cookie. Espelhá-lo teria **plantado** o bounce em admin/student.
  - **GATILHO REAL (não é logout):** cookie **PRESENTE mas INVÁLIDO** (sessão expirada). O middleware (`proxy.ts:75`) checa `hasSessionCookie` = **presença, não validade** → deixa passar → `/api/auth/me` 401 → o AuthProvider fazia `setUser(null)` mas **NÃO limpava o cookie** → admin: layout retorna `null` (tela branca, sem guard); student: skeleton infinito (sem guard).
  - **FIX NA RAIZ (1 lugar, 3 contextos):** `auth-provider.tsx`, ramo `if (r === "unauth")` (após o retry), `try { await createClient().auth.signOut({ scope: "local" }) } catch {}` **antes** do `setUser(null)`. Generaliza o padrão já existente em `producer/(auth)/register:131` ("clear the stale session first — otherwise /producer/login reuses the old cookies and 401s"). + guards client em `admin/layout` (`replace /admin/login`) e `course-shell` (`replace /producer/login`), ambos respeitando `isLoading`/`authError`.
  - **⚠️ ISOLAMENTO DO 5xx (o risco central):** o ramo `"fail"` (5xx/rede) fica FORA do `if(unauth)` → `setAuthError`, nunca `setUser(null)`, nunca `signOut`. Harness curl + código: **unauth=1 signOut=1, fail(5xx/network)=0 signOut** (estruturalmente impossível deslogar num blip). **SIGNUP preservado:** signOut só após o retry 1× (1º 401 propagação → retry → ok). **PAYWALL preservado:** o guard lê o `user` da store (não `hasAccess`) → aluno logado sem enrollment continua no paywall.
  - Ver [[project_stale_cookie_clear_4_3]].
- [x] **4.4 — cookie ping-pong** 🟢 ✅ **CONDIÇÃO ELIMINADA** (via `159fc0f`, não um fix próprio). ⚠️ **REGISTRO HONESTO:** a condição que causaria o loop (`/producer`↔`/producer/login`) foi eliminada pelo 4.3 — o cookie stale não sobrevive ao 401, então o `redirectIfAuthed` (que faz bounce por **presença** de cookie nas rotas de login, `proxy.ts:102`) não dispara. **PORÉM o loop pleno NÃO foi reproduzido no harness** (que testa o middleware isolado, não o ciclo client→middleware→client). Provado por curl: COM cookie `/producer/login`→307→/producer (o bounce); SEM cookie→200 (fica). Não afirmamos que o loop existia; afirmamos que a **condição necessária** (cookie stale pós-401) não existe mais.
- [ ] **4.5 — `console.error` ruidoso no catch** 🟢 — loga "Sem permissão" como erro em todo 403 (cosmético, não é bug de status). **Forma DECIDIDA (2026-07-13): guard-por-status** — `console.error` apenas para status ≥500; 401/403/400 silenciosos. ⚠️ A forma anterior ("rebaixar error→debug") foi **REFUTADA**: `console.debug` some em produção — apagaria a observabilidade dos 500 reais. Escopo + helper: no desenho. Housekeeping.

Cada um: read-only → fix → staging (onde aplicável) → merge `--no-ff`.

### BUG A — produtor não conseguia subir material na aula 🔴 ✅ FEITO (merge `f2ea405`)
Reportado fora do backlog (upload não carregava, "aula não salvava"). Investigação achou **3 causas-raiz** (3 commits, rollback granular):
- **(1) `c71ac43`** — Windows reporta `.zip` como `application/x-zip-compressed`, ausente da allowlist → produtor Windows tomava **400 silencioso** mesmo em arquivo pequeno.
- **(2) `9ab3c11`** — o componente **engolia toda falha** (`if (res.ok)` sem else, `catch {}` vazio) → qualquer rejeição parecia "nada aconteceu". Agora valida tipo/tamanho no client, mostra erro (`setError` + `<p>` vermelho, padrão do projeto), lê o corpo defensivo.
- **(3) `e771ad0`** — o arquivo transitava pela função da Vercel, com teto **hard de ~4.5MB** (`FUNCTION_PAYLOAD_TOO_LARGE`) enquanto o código prometia 50MB → **upload direto do browser pro Supabase Storage via signed URL** (rota nova `materials/signed-url`); o POST vira gravação de metadado JSON.

**Decisões:**
- **Fonte única:** `src/lib/materials-constants.ts` (allowlist + MAX_SIZE + `sanitizeFileName` + `MATERIALS_BUCKET_NAME`), importado pela rota E pelo componente. *(O projeto duplica allowlists em 4 lugares — não expandimos o débito.)*
- **DELETE (`materials/[materialId]`) NÃO tocado:** `getPublicUrl` mantém o formato → o regex `/object/public/materials/(.+)` resolve o storagePath. **PROVADO por execução** (getPublicUrl real + upload 20MB + delete → sumiu do bucket staging), não assumido.
- **Guarda cross-workspace:** o servidor monta o path; o POST de metadado confere o prefixo `workspaces/{ws}/lessons/{id}/` → 400 se não bater (provado).
- **413 virou impossível** (o arquivo não passa mais pela lambda) → a branch do 413 saiu do C2.
- **Validado staging:** T1 (20MB direto pro `*.supabase.co`, não Vercel) + T3 (delete some do bucket) + T5 (prefixo barra) por execução real; T4/T2 confirmados no browser pelo dono.

**⚠️ REGISTRADO (escopo separado, NÃO feito):**
- `listBuckets/createBucket` em **8 OUTRAS rotas de upload** (auth/me, admin/integrations/logo, admin/platform-settings/upload, workspaces/[id]/login-images+logo, community/upload, upload) — round-trip inútil + recriaria o bucket **sem os limites/policies auditados** se alguém o apagasse.
- **Content-Type gravado = o que o BROWSER declara** (upload direto). Aceitável: o ator é o próprio produtor, no próprio ws, e o bucket serve download, não execução. Declarado.
- **`.zip` do Windows** (`x-zip-compressed`) provado por **código**, não testado em runtime Windows.
- POST de metadado **não confere se o arquivo existe** no storage (link quebrado possível) — endurecimento opcional.
- **hydration mismatch no `ThemeToggle`** (aria-label servidor≠cliente) — bug real, outro componente.
- **tiptap:** duplicate extension names `['link','underline']`.
- **Service Worker:** 11× "FetchEvent redirected response".

Cada um: read-only → fix → staging (onde aplicável) → merge `--no-ff`.

---

### BUG B — colaborador do painel ADMIN caía na landing ao entrar 🔴 ✅ FEITO (merge `4ad99f5`)
Reportado fora do backlog: uma **ADMIN_COLLABORATOR** (aceita, status ACCEPTED) logava em `/admin/login` e era **expulsa pra `/landing`** (página de marketing). A investigação (READ-ONLY, incl. 3 SELECTs em produção) **refutou** a 1ª hipótese (não era conta STUDENT/PENDING) e isolou a raiz.
- **Raiz:** `admin/page.tsx` gateava em `user.role !== "ADMIN"` (estrito) em **3 pontos solidários** — `:90` redirect (`router.replace`), `:102` return antes do fetch, `:116` return `<SkeletonCards/>`. Divergia de 4 peças que **já** reconhecem o papel: a API que a própria página chama (`/api/admin/dashboard` → `requireAdminOrCollab`, **retorna 200** pra ela), o `admin/layout.tsx:41` (`isAdminRole` inclui ADMIN_COLLABORATOR), o sidebar (Dashboard é o 1º item dela, sem `requires`) e as demais páginas de `/admin`. Os 3 pontos são **solidários**: mudar só o `:90` a tiraria da landing mas a prenderia num skeleton eterno (`:102` pula o fetch, `:116` mostra skeleton).
- **Fix (1 arquivo):** deriva `const isAdminRole = role==="ADMIN" || role==="ADMIN_COLLABORATOR"` (espelha o layout) e troca os 3 predicados por `!isAdminRole`. `isCollabLike` e os arrays de deps **intactos**. **Raio provado por tabela do enum inteiro:** só ADMIN_COLLABORATOR muda; ADMIN/PRODUCER/STUDENT/COLLABORATOR idênticos.
- **Zero dado novo:** a API já autorizava o papel (200 provado por curl no staging); o fix é 100% client-side, nenhuma rota tocada.
- **Validado staging (real Supabase):** persona ADMIN_COLLABORATOR criada (User + AdminCollaborator ACCEPTED). Por execução: login 200, `/api/auth/me` role=ADMIN_COLLABORATOR + `adminPermissions` reais, `/api/admin/dashboard` **200** (anônimo → 401), sidebar determinística (Dashboard/Produtores/Suporte/Planos/Assinaturas · esconde Relatórios/Logs/Colaboradores/Configurações). No browser (dono): baseline reproduziu a expulsão → `/landing`; com o fix cai em `/admin` com dados reais; ADMIN inalterado (R1). Cleanup: persona removida (count=0 em Session/AdminCollaborator/User/Auth).

**⚠️ REGISTRADO (mesma família de roteamento, NÃO corrigido — escopo separado):**
- **Órfão 2 — `producer/layout.tsx:34`:** `isStaff` não inclui ADMIN_COLLABORATOR → é o **terminal** que despeja o papel na `/landing` (o `admin/page.tsx` era só o gatilho; este é o destino).
- **Órfão 3 — `proxy.ts:88`:** middleware **role-blind**; `authed && "/"` → `/producer` (não considera ADMIN_COLLABORATOR).
- **BUG D — STUDENT logado sem cookie de activeWs e sem Collaborator** → `/landing` (mesmo órfão de roteamento do proxy/producer-layout).
- **`sidebar.tsx:392` — logo `href="/"`:** clicar no logo manda pra `/` → **re-expulsa** a ADMIN_COLLABORATOR pela mesma cadeia.
- **`landing:98` — CTA "Entrar" → `/producer/login`**, que **rejeita** ADMIN_COLLABORATOR com 403 (a entrada dela é `/admin/login`).
- **Produto:** a home `/admin` mostra MRR/churn/receita da plataforma. Granularidade por permissão (esconder KPIs financeiros de quem não tem VIEW_REPORTS/BILLING) seria decisão de produto **na API**, não na página — item novo.

Cada um: read-only → fix → staging (onde aplicável) → merge `--no-ff`.

---

### BUG C — aluno não consegue trocar senha ("senha atual incorreta") 🔴 ✅ FEITO (merge `9fac2d9`)
Relatado como regressão ("antes funcionava"). Investigação READ-ONLY completa (código + caso real em prod + contagens agregadas) → fix aplicado e validado.

**O FIX (3 arquivos, branch `2e1bfb4` → merge `9fac2d9`):** rota nova **`/api/w/[slug]/password`** (irmã de reset-password): rateLimit → sessão (`getCurrentUser`) → **discriminador do login** (`STAFF_ROLES.has(role) || acceptedCollab` → 403; nunca "tem credencial") → workspace por slug → credencial `userId_workspaceId` (sem credencial → 404 apontando o forgot) → `verifyPassword` (timing-safe, chamada idêntica ao login:142) → `generateSalt`+`hashPassword`+update com **`resetToken:null`** (mata reset links pendentes) → **`logAudit("workspace_password_change")`** — a 1ª troca de senha auditada do sistema. Form: prop `workspaceSlug` + `isPureStudent = STUDENT && !collaborator` → POST escopado; staff mantém PATCH global **intocado**; TRAVA Opção 2 = `return null` no `/profile` global só pra aluno puro (ADMIN_COLLABORATOR continua vendo — é a única tela dela). `producer/profile` e `/api/auth/password` **intocados**.

**Validado STAGING por execução real (T1-T10):** troca do aluno 200 → senha nova loga (200), antiga falha (401) · hash da credencial A mudou; **global provada INTOCADA funcionalmente** (`signIn` com a global antiga ainda sucede; com a nova de ws falha) · credencial do ws B **inalterada** (multi-ws isolado) · senha atual errada → 400 · resetToken pendente **nulificado** na troca · PRODUCER troca global idêntico · STUDENT-collab usa global e a escopada o rejeita (403) · anônimo 401 · staff na escopada 403 · aluno puro na global 400 (inerte) · AuditLog +2 rows · rate-limit 429 exato na req #101. Cleanup count=0; preservados producer-staging/aluno-staging/ws A/curso A (⚠️ senha global do producer-staging foi resetada p/ testes — após o stopgap 2.4a (ex-"1.2/1.3") está em `ProdStaging_New2#2026`; era desconhecida antes, resetável via `/forgot-password`).

**RAIZ PROVADA:** `/api/auth/password:28` valida a senha **GLOBAL** (`signInWithPassword` efêmero) e atualiza a global (`:40` `updateUserById`) — toca `WorkspaceCredential` **0 vezes**. Aluno-comprador tem global **aleatória** (`webhook-helpers:70` `generateTempPassword`, comentário: *"legacy fallback only"*); a senha real vive em `WorkspaceCredential.passwordHash`. Rota tocada pela última vez em **2026-05-06**; o dual-auth nasceu em **2026-05-08** (migração `20260508000000_workspace_credential`). **Regressão ESTRUTURAL: o split mudou o chão sob a rota** — ninguém a revisitou.

**CASO REAL:** Juliana (jurocha1985@gmail.com), compradora 2026-07-02 (timeline atômica de 1.1s: Auth user → email auto-confirmado +64ms → User → credencial → enrollment → WebhookLog `TRANSACTION_PAID`), 1 credencial intocada, `last_sign_in_at` = hoje (o login FUNCIONA — só a troca falha). **Determinístico: nenhum input faz a rota funcionar pra ela.**

**4.3 (`159fc0f`) REFUTADO — 3 provas:** fora do `--stat` (só admin/layout, auth-provider, course-shell); o fluxo de troca não chama `/api/auth/me` (o único gatilho do 4.3); e o sintoma "Senha atual incorreta" (`:34`) exige `authUser` presente (`:13`) = sessão **VIVA** — se o cookie tivesse sido limpo, a rota retornaria "Não autenticado" (`:14`), mensagem diferente.

**DECISÕES DE PRODUTO (Vinicius):** a troca altera SÓ a credencial do workspace corrente. Caso marginal (`/profile` global, 4 acessos STUDENT/90d na telemetria AccessLog): **OPÇÃO 2** — o form some para ALUNO PURO ali; ele troca em `/w/[slug]/profile` (slug na URL, zero cookie, zero tamper).
⚠️ **TRAVA:** o esconder deve ser `role==="STUDENT" && !collaborator`. Se for "todos no global", **ADMIN_COLLABORATOR (Larissa) fica SEM tela de troca** — o header do admin manda "Meu Perfil" → `/profile` (header.tsx:126) e é a ÚNICA tela linkada dela.

**MOLDE (precedente triplo no repo):** escopo slug→ws→404 (`reset-password:31-40`) + validar a atual (`login:132-145` — `findUnique userId_workspaceId` + `verifyPassword` timing-safe) + gravar (`reset-password:58-68` — `generateSalt` + `hashPassword` scrypt + `update`). Discriminador = o do login (`:91-100`: `STAFF_ROLES.has(role) || !!collab`) — **NUNCA "tem credencial"** (6 PRODUCERs + 1 STUDENT-collab têm rows MORTAS). O form é o ÚNICO caller da rota (contrato pode mudar).

**NÚMEROS (prod, agregado):** 17.575 credenciais STUDENT · 253 alunos com >1 credencial (até 5 ws) · cenário 2 (lazy-migrate sincronizado) ≤79 (0,45%) · cenário 1 (global aleatória, quebra imediata) ~99,5%. *(snapshot 2026-07-10 — histórico, não re-auditado)*

**✅ As 3 leituras pendentes foram feitas antes do desenho (todas fechadas):** (1) master-password (`login:23-90`) = ortogonal — não toca credencial, sessão via magic-link, só STUDENT com access; (2) `/api/auth/reset-password` global = rotaciona a GLOBAL, o fluxo normal do aluno NÃO passa lá (rastreado elo a elo: workspace-login-form→w/forgot→w/reset→credencial); (3) `webhook-helpers` integral = global e credencial são **2 sorteios independentes** de `generateTempPassword` (raiz confirmada).

**⚠️ ITENS-IRMÃOS revelados pela investigação (NÃO corrigidos — escopo próprio):**
- **BUG C-irmão** — ⚠️ hipótese "tranca" **REFUTADA** por investigação a fundo → rebaixado a **housekeeping** (ver seção própria `### BUG C-irmão` abaixo).
- `/api/auth/forgot-password` **sem gate de role** — aluno puro na tela errada (`/forgot-password` do producer/admin) rotaciona a global → divergência conhecida-vs-credencial; sem credencial, fabrica cenário 2 via lazy-migrate.
- **Cenário 2 (≤79 contas): já desincronizados** por lazy-migrate + troca global antiga. O fix corrige daqui pra frente; **NÃO sincroniza os já afetados**. Paliativo (ex.: reset dirigido) = item próprio.
- **Master-password em PLAINTEXT** (`Workspace.masterPassword`, comparação `===` no login:80). Registrado.
- ~~`w/[slug]/login` NÃO tem rateLimit~~ ✅ **FECHADO (merge `c3bad5a` = o stopgap 2.4a)** — rateLimit in-memory aplicado em `w/[slug]/login` E `/api/auth/password` (padrão idêntico às 4 irmãs; provado method-agnostic — só lê IP+pathname, precedente GET em invite/[id]). Staging T1-T6: fluxo normal 200 em todos os ramos, burst 429 exato na #101, rota do BUG C funciona sob o limite. **Stopgap** — o teto continua per-instance e por-segmento; upgrade real = 2.4.
- Nota: `/api/auth/password` (global) segue **sem gate de aluno-puro** — inerte (aluno não conhece a global), endurecer junto com o irmão do reset global.

---

### BUG C-irmão — 🟢 HOUSEKEEPING (não é bug de acesso)
**VEREDITO: a hipótese inicial ("add-manual manda o aluno pro reset global que não loga → tranca") foi REFUTADA** por leitura integral + prova de produção. O add-manual **envia a senha `mc-`** via `sendCustomAccessEmail` (`students:313`, com `tempPassword`), **idêntico ao comprador** (webhook `applyfy:415`) e ao import CSV (`import:255`). O aluno recebe a senha da credencial e loga normalmente. O link de recovery **global** (`sendWorkspaceAccessEmail`) é gerado, retornado no JSON e **DESCARTADO** (`grep accessLink` em `.tsx` = 0 consumidores) — **não é emailado**.

**PROVA de que `generateLink` NÃO auto-envia** (sem inbox): as rotas de forgot fazem `generateLink` → **`sendEmail` MANUAL** (`auth/forgot:47-69`, `w/forgot:79-91`). Se `generateLink` auto-enviasse, **todo reset em produção mandaria 2 emails** — nunca reportado em 17k+ usuários. Reforços: a resposta do `generateLink` não tem campo `sent` (só `action_link`/`otp`/`token`); e o design que retorna-e-descarta o link só faz sentido se ele não é auto-entregue.

**3 ACHADOS REAIS (housekeeping, baixa prioridade):**
1. **Código morto:** `sendWorkspaceAccessEmail` em `students:257` + `resend:39` gera um recovery global que ninguém usa. Remover.
2. **Comentário errado:** `students:249` afirma "which auto-emails 'Reset password'" — **falso**. Corrigir.
3. ⚠️ **RESEND sem senha (único UX gap):** `resend:47` chama `sendCustomAccessEmail` **SEM `tempPassword`** → email com login URL mas **sem a `mc-`**. Quem esqueceu a senha e pede "reenviar acesso" não recupera nada — o caminho certo é `/w/{slug}/forgot-password`. Vale um fix, mas é "resend inútil", não "aluno trancado".

**⚠️ Nota:** confirmação empírica final (contar emails num inbox) só é possível em **PRODUÇÃO** (`BREVO_API_KEY` vazia em staging → app não envia email lá; e a prova via log do Brevo é inviável). A prova lógica de produção acima é conclusiva; se restar dúvida, um add-manual real com email próprio em prod confirma.

---

# FASE 5 — Quick-wins escondidos 🟢🟡

> **Por que aqui:** features quase-prontas com backend já construído. ALTO valor, BAIXO esforço. A varredura achou estas "surpresas" — dinheiro no chão.

### 5.1 — Custom domain (destravar) 🟡
**Achado:** ~80% pronto. `info-tab.tsx:160-175` tem o campo com badge "Em breve" + `disabled`, MAS o backend já existe: `Workspace.customDomain` (coluna unique + migração) e o PATCH `workspaces/[id]/route.ts:88` já persiste. Falta: destravar a UI + registro do domínio na Vercel + roteamento no proxy.
**Etapas:**
- [ ] Read-only: confirmar o backend pronto + o que falta no proxy/Vercel.
- [ ] Destravar a UI (remover disabled + badge).
- [ ] Registro do domínio na Vercel (API) + roteamento no proxy (sub-fases 4.1.2-3 do roadmap).
- [ ] Staging: configurar domínio de teste → roteia pro workspace.
- [ ] Merge `--no-ff`.
**Dependência:** Vercel API + proxy. (Feature grande parada atrás de 1 input — alto impacto.)

### 5.2 — Tela de admin de integrações no nav 🟢
**Achado:** `admin/integrations/page.tsx` + `admin/integrations/requests/page.tsx` (gestão de gateways + aprovar `IntegrationRequest`) EXISTEM e funcionam (gated FULL_ACCESS), mas não estão no `adminLinks` (`sidebar.tsx:180-193`). Undiscoverable — só via URL direto. **É a base do épico de integrações.**
**Etapas:**
- [ ] Read-only: confirmar as páginas + o `adminLinks`.
- [ ] Adicionar a(s) entrada(s) no `adminLinks` (gated FULL_ACCESS).
- [ ] Staging: admin vê o link → acessa.
- [ ] Merge `--no-ff`.
**Dependência:** nenhuma. Trivial. **Desbloqueia visibilidade pro épico de integrações (Fase 6).**

### 5.3 — Toggle do box de info do curso 🟢 ✅ FEITO (merge `943b8e4`) — client demand #3 entregue
**Pedido (Vinicius):** um novo card na aba "Configurações" do editor de curso pra mostrar/esconder o box (nome + módulos + aulas + progresso) abaixo do banner na área de membros. **Mesmo padrão dos toggles existentes** (`showStudentCount`, `showLessonSupport`).
**Etapas:**
- [x] Schema: `showCourseInfoBox Boolean @default(true)` no Course + migração (`20260712233817_add_course_info_box_toggle`).
- [x] API: aceitar o campo no PUT `/api/courses/[id]` (destructure + spread, molde do irmão).
- [x] Admin: card nas **DUAS** páginas (decisão do Vinicius): Configurações (ícone `InfoBoxIcon` + "Exibir resumo do curso" + `disabledHint` honesto — avisa que progresso e contagem de alunos saem juntos) e Personalizar (entrada com tooltip honesto; `toggleFlag` genérico já cobriu o save).
- [x] Área do aluno: condicional `!== false` (molde default-true do showLessonSupport) + **pt do wrapper agora depende de banner×box** — box oculta com banner nunca deixa o conteúdo encostado (o `-mt`/`pt` eram acoplados; comentário do wrapper atualizado).
- [x] Retornar o campo na API que alimenta a área do aluno → **zero edits, provado**: init route e GET usam `include` + spread (todo escalar novo flui). CoursePreview (vendas), getCourseMeta: intocados.
- [x] Staging: validado ①-⑧ (4 estados banner×box, as 2 páginas do produtor, aluno real via init; default intocado; cleanup count(false)=0). Prod: `migrate deploy` ANTES do push, coluna provada (boolean/default true/NOT NULL), **0 de 37 cursos** mudaram.
- [x] Merge `--no-ff` (`943b8e4`; branch apagada).
**Dependência:** nenhuma. Baixo risco (padrão repetido) — confirmado: 6 arquivos, +48/−4.

### 5.4 — CSV no editor de curso 🟢 ✅ FEITO (merge `2c2ef5b`)
**Achado:** o `<ImportStudentsModal>` existe na tela global Meus Alunos, POSTa pra `students/import/route.ts` (gated `canManageStudentsOfCourse` por curso). A aba "Alunos" do editor não tinha import.
**⚠️ Correção da premissa "reuso trivial":** o modal é **GENÉRICO** — recebe `courses: CourseOption[]` e tem um **step 2 de seleção de cursos**. Não aceitava courseId único. Fix = **modo escopado** (prop opcional `scopedCourseId`): pré-seleciona o curso e **pula o step 2** (upload→resultado). Título do curso é inútil no escopado (nunca exibido nem enviado) → prop é só `string`, sem plumbing. **2 arquivos** (modal + aba); backend/schema intocados; **uso global byte-idêntico** (prop opcional; indicator DRY com equivalência provada pro caminho de 3 passos).
**Validado staging (com 2 cursos):** cada import escopado (aba de A / aba de B) matriculou **só no seu curso**, zero vazamento cruzado (05:06→só A, 05:14→só B); fluxo global de 3 passos inalterado. Cleanup: 73 users + 146 enrollments + curso-B de teste removidos (count=0), curso A + personas preservados.
**⚠️ LIÇÃO (staging):** os testes usaram 73 emails com **aparência real** (gmails). Em staging sem Brevo foi inócuo, mas o **mesmo hábito em prod dispararia 73 emails reais**. Dado de teste = sempre FICTÍCIO e identificável (`@staging.test`).

---

# FASE 6 — Épico: Integrações multi-gateway ⚫

> **Por que aqui:** depois da segurança, dos bugs e dos quick-wins, com a base de integrações já visível (5.2). O maior valor competitivo. **Estrutura: 1 fundação + N gateways.**
>
> **Objetivo:** produtor vende em vários gateways (Hubla, Cakto, Kirvano, Perfect Pay, Kiwify, Hotmart). Integra os cursos em cada. Aluno recebe acesso de qualquer origem.
>
> **⚠️ AÇÃO DO VINICIUS:** a cada gateway, o Claude PEDE a documentação do webhook daquele gateway (formato do payload, autenticação, eventos). O Vinicius busca e envia. O Claude mapeia a integração específica encaixando no padrão.

### 6.0 — Fundação: arquitetura comum 🔴
**Abordagem:** abstrair o padrão do Applyfy (que já funciona) num formato reutilizável — de modo que adicionar um gateway novo seja "encaixar", não reescrever. Aproveitar a tela de admin de integrações + o fluxo de `IntegrationRequest` que já existem.
**Etapas:**
- [ ] Read-only: mapear COMO o Applyfy processa webhook → concede acesso, ponta a ponta.
- [ ] As 7 Perguntas (o que já é reutilizável? o `IntegrationRequest`/admin já cobre quanto?).
- [ ] Desenhar a abstração comum (interface de gateway: parse payload → validar auth → mapear evento → conceder/revogar acesso).
- [ ] Refatorar o Applyfy para usar a abstração (provar que o padrão funciona com o gateway que já existe, sem regressão).
- [ ] Staging: Applyfy via a nova abstração → acesso concedido igual antes (zero regressão).
- [ ] Merge `--no-ff`.
**Dependência:** 5.2 (visibilidade da tela de integrações).

### 6.1 a 6.N — Cada gateway (um por vez) 🟡 cada
Para CADA gateway (Hubla, Cakto, Kirvano, Perfect Pay, Kiwify, Hotmart):
- [ ] **Claude pede a documentação do webhook** → Vinicius busca e envia.
- [ ] Read-only: mapear o payload/auth/eventos daquele gateway contra a abstração.
- [ ] Implementar o adapter específico encaixando no padrão da fundação.
- [ ] Staging: simular webhook daquele gateway → acesso concedido.
- [ ] Merge `--no-ff`.
**Ordem dos gateways:** definir com o Vinicius (provavelmente por demanda de cliente).

### 6.2 — Múltiplos tokens Applyfy por workspace 🟡
**Achado (conversa):** produtor com 2+ contas Applyfy. Já tem a opção de vários IDs, MAS cada conta gera um token novo, e hoje só aceita 1 token/workspace (`Settings.applyfy_token:workspaceId`).
**Abordagem:** aceitar múltiplos tokens por workspace (encaixa na arquitetura da fundação 6.0).
**Etapas:**
- [ ] Read-only: como o token único é armazenado/usado hoje.
- [ ] Schema/lógica: suportar N tokens por workspace.
- [ ] Staging: 2 tokens → webhooks de ambas as contas concedem acesso.
- [ ] Merge `--no-ff`.
**Dependência:** 6.0 (fundação).

### 6.3 — Cancelamento bidirecional via API Applyfy 🟡
**Achado (conversa):** hoje é mão-única. Cancelar no admin NÃO cancela na Applyfy (continua cobrando). Vinicius pediu pra fazer.
**Abordagem:** chamar a API de cancelar assinatura da Applyfy quando o produtor cancela no admin.
**⚠️ AÇÃO DO VINICIUS:** trazer a doc da API de cancelar da Applyfy (`app.applyfy.com.br/docs`) + credenciais (x-public-key/x-secret-key).
**Etapas:**
- [ ] Vinicius traz a doc da API de cancelamento + credenciais.
- [ ] Read-only: o fluxo de cancelamento atual no admin.
- [ ] Implementar a chamada à API da Applyfy no cancelamento.
- [ ] Staging: cancelar no admin → confirma cancelamento na Applyfy (sem cobrança futura).
- [ ] Merge `--no-ff`.
**Dependência:** doc + credenciais da Applyfy.

---

# 🏁 MARCO: PLATAFORMA PRONTA

> **Concluídas as Fases 1–6, a plataforma está:**
> - **Segura** — toda a auditoria fechada (crítica + restante + infra).
> - **Confiável** — email com retry, sem perder acesso de cliente.
> - **Sem bugs conhecidos** — os registrados, resolvidos.
> - **Completa** — quick-wins entregues, integrações multi-gateway funcionando.
>
> **A partir daqui, tudo é CRESCIMENTO, não pendência.** A plataforma pode operar, vender e escalar. As Fases 7–9 são evolução de produto — feitas por valor de negócio e feedback de cliente, no ritmo que a receita justificar. **O túnel termina AQUI.**

---

# FASE 7 — Features novas 🟡🔴

> Features registradas que agregam, mas não bloqueiam o "pronto". Por valor de negócio.

- [ ] **7.1 — Push test screen** 🟡 — ferramenta de debug no admin: seleciona usuário, vê devices registrados, dispara push de teste, reporta quantos receberam. Espelha o `test-email` que já existe (`api/admin/test-email`). Infra de envio (`sendPushToUser`) pronta; a tela é do zero. Útil pra diagnosticar "não recebo notificação".
- [ ] **7.2 — IA integrada** 🔴 — Claude/Anthropic: chat do aluno + geração de conteúdo pro produtor (quiz gerado, resumo de aula). 6 sub-fases. Requer API key Anthropic. ÉPICO próprio.
- [ ] **7.3 — Relatório de cliques em links** 🟡 — `ClickLog` (model nem existe ainda) + tab Links na analytics. Rastrear cliques nos links/botões.
- [ ] **7.4 — Log de arquivos da comunidade** 🟢 — termos já feito; falta `community-files` (upload de arquivos além de imagens na comunidade).
- [ ] **7.5 — QuizAttempt: UI de resultados** 🟢 — tentativas já são gravadas (`lessons/[id]/quiz/route.ts`), mas não há dashboard de histórico/analytics de quiz pro produtor. Gap parcial.
- [x] **7.6 — Trava de Contexto (§6b do SYSTEM-MAP) — FASE 1** ✅ FEITO (merge `9d8b7a2`) — acesso cross-área agora bloqueia COM AVISO acionável (`ContextLockNotice`) no lugar de redirect silencioso, despejo na landing ou logout global. **Mata 3 fantasmas:** Órfão 2 (ADMIN_COLLABORATOR→landing), BUG D (aluno na raiz→landing) e o **logout GLOBAL do 403 da vitrine** (derrubava a sessão de TODOS os devices num acesso cross-tenant). "Sair" do aviso = signOut **local** (preserva multi-abas, o design do ws-login:196-200). Botão do aluno resolve o destino REAL via `/api/student/workspace` — o **β** provou que `href="/"` morre no middleware (proxy 307a raiz authed pra área atual, curl com header RSC); aluno sem workspace ganha mensagem honesta no lugar. **ADMIN fica travado por área** (decisão do dono; impersonate é o caminho de suporte). `/w/**` segue governado por **VÍNCULO** (`hasWorkspaceAccess`); **ADMIN bypassa o init por design** (`init/route.ts:55`) → ADMIN×vitrine = ACESSA. Staging: matriz 16 passos × 7 personas + prova de 2 navegadores (cross-tenant não derruba mais outras sessões) + falso-alarme da etapa 11 (anti-enum mascarou email errado como "senha incorreta"). Proxy, logins e impersonate intocados. 6 arquivos, zero schema.
- [x] **7.8 — Master password cega para alunos-híbridos** 🟡 ✅ FEITO (merge `1fdfd1e`) — BUG de produção reportado (Ronei, PRODUCER matriculado no ws `shop-club` alheio, tomava "Senha incorreta" na master). **Raiz (design pré-existente, `903e147`, NÃO regressão):** o bloco 1 do ws-login gateava a master em `role === "STUDENT"` → cega para TODO staff-role que também é aluno legítimo (enrollment ACTIVE). **Raio real:** 20 híbridos em prod (16 PRODUCER + 1 ADMIN + 2 ADMIN_COLLAB + 1 COLLAB com enrollment ACTIVE em ws alheio); **14 num ws com master setada** sentiam o bug. **Decisão de produto (Vinicius):** a master vale por **VÍNCULO DE ALUNO** (Enrollment ACTIVE no ws), qualquer role; **NUNCA por vínculo de staff** (owner/collab sem matrícula → senha global). **Fix (1 arquivo, predicado):** `role === "STUDENT" && hasWorkspaceAccess` → `findFirst(enrollment ACTIVE no ws) + isEnrollmentActive` (o critério canônico de "acesso agora"). Deliberadamente **NÃO** `hasWorkspaceAccess` (concede via owner/collab → seria porta de staff). **De carona:** fechou o looseness pré-existente de EXPIRED passar a master (`hasWorkspaceAccess` inclui EXPIRED; `isEnrollmentActive` não). **Limitação DECLARADA e aceita:** híbrido ADMIN/PRODUCER **com MFA verificado** não usa a master (a sessão AAL1 do magic-link é rejeitada pelo `getCurrentUser:138-147` → usa global+challenge). Vira item só se doer em usuário real. **STUDENT-collab imune** (role STUDENT já passava; 4 em prod). Staging 7/7 (híbrido entra · 3 negações staff-sem-vínculo · CANCELLED negado · master errada · regressões · prova de sessão AAL1/otp → init 200). Blocos 2/3, MFA gate e o gate final `hasWorkspaceAccess:212` intocados.
- [x] **7.7 — Raiz Inteligente (§6a) — FASE 2** 🔴 ✅ FEITO (merge `6b89c0c`) — **o épico que ENCOLHEU na leitura:** a decisão de arquitetura (opção B) caiu por um fato reaberto — o apex `/` **já aponta** pro `/producer/login` (é o catch-all unauthed da plataforma, `proxy.ts:82-84`, ramo `/producer` e default byte-idênticos) → **proxy INTOCADO**, a página evoluiu no lugar. Metade da lógica já existia onde a lei mandou reusar. **Raio final: 5 arquivos** (helper `student-workspaces.ts` novo · `producer-login/route.ts` · `student-workspaces/route.ts` · a página · o órfão `/login`). **Como ficou:** staff com senha global válida (híbridos inclusos) loga e **roteia por role** (ADMIN/ADMIN_COLLAB, antes 403+signOut, agora entram → `/admin`; o resto → `/` e o proxy roteia; o `requiresMfa` carrega o `redirect` pro pós-challenge); aluno puro → discriminador do dual-auth (**NUNCA "tem credencial"**, L22) → `verifyPassword` contra as `WorkspaceCredential` do email com **short-circuit** → ≥1 bate → **lista COMPLETA inline** (decisão C do dono; payload mínimo `{slug,name,logoUrl}`, select explícito) → cada item abre `/w/{slug}/login` em **nova guia**, onde a sessão do aluno nasce (a raiz NÃO cria sessão de aluno). Os 3 casos-falha (inexistente · sem credencial · senha errada) convergem no MESMO 401 neutro "Credenciais inválidas" (byte-idêntico, provado). Legado global-real → mesma lista. **Rate-limit dia-um** nas 2 rotas (colateral: `student-workspaces` era a ÚNICA irmã `/api/auth` sem freio). Órfão absorvido: `/login`→raiz (antes `/admin/login` — recebia, errado, aluno-sem-ws e convite aceito). **⚠️ G1 (custo scrypt multi-ws) MEDIDO:** pior caso 5 verificações sequenciais + lista = **~0.85s** (< 1.5s, PASSA). **⚠️ G2 (timing anti-enum) — a DECISÃO DO DUMMY FOI REFUTADA POR MEDIÇÃO:** um **experimento de CONTROLE** (email staff real + senha errada, que roda **ZERO scrypt meu**, já é ~0.25s vs ~0.13s do inexistente) provou que o oráculo de existência de email é o **`signInWithPassword` do GoTrue** (bcrypt em email real vs fast-fail no inexistente) — **pré-existente em toda rota de login, não introduzido pelo 7.7**; e meu scrypt (~0.05s) é mais barato que o bcrypt → **o dummy não alcança o piso, não fecha o oráculo dominante** → **NÃO aplicado** (Regra de Ouro: mudança que provadamente não resolve = não entra). O sinal NOVO do 7.7 (aluno-real ~0.43s vs staff-real ~0.25s, das 2 queries do ramo) distingue **tipo de conta** entre emails já-reais (baixo valor) → **aceito**; o rate-limit limita a amostragem; **constant-time login registrado como candidato do 2.4**. Matriz 9 células provada por curl (redirect por role · lista dos 5 · as 3 neutras byte-idênticas). Staging: 7 personas descartáveis (incl. aluno 5-ws) + G1/G2 medidos, cleanup 0/0/0, `producer-staging` intacto. INTOCADOS provados por ausência no diff: proxy · ws-login · Trava.

> **✅ FILA NOTURNA 2026-07-16 — 8/8 EM PRODUÇÃO:** 7.9+7.15 (`462a24d`) · 7.10 (`6f27ee6`) · 7.11 (`875429e`) · 7.12+7.13 (`6a9f635`) · 7.16 (`944e152`) · 7.14 Fase A (`874d251`). Todo o report noturno da Ana Luiza/`shop-club` fechado e deployado. **7.14 Fase B (signed-url) ✅ (`cf660b7`)** e **7.7 Raiz Inteligente ✅ (`6b89c0c`)** — **a FASE 7 está ZERADA de itens novos** (o §6 inteiro do SYSTEM-MAP — Trava + Raiz — em produção). Abertos seguem só os candidatos estruturais transversais: 2.4 (rate-limit shared-store + origem + **constant-time login**, herdado do G2 do 7.7) · 2.5 CSP · 4.5 · Fase 3 email · 7.14 Fase C (4 uploaders FormData) · limpeza de órfãos de storage.
>
> **FAMÍLIA "hardcode ignora personalização" — ✅ ENCERRADA (2026-07-16):** 7.9+7.15 (`462a24d`) · 7.10 (`6f27ee6`) · 7.11 (`875429e`) todos FEITOS. **Os 2 mecanismos canônicos nomeados:** (1) **wrapper CSS** (`.course-customized`/`.vitrine-*`/`.producer-layout` + regras escopadas no `globals.css`) para MUITOS elementos ou um wrapper que já existe; (2) **var-com-fallback direto no className** para POUCOS elementos. Ambos: fallback no hex EXATO = byte-idêntico sem customização; semânticos (verde/vermelho/âmbar) imunes por construção (só azul/texto é remapeado). Report original: Ana Luiza / `shop-club`.

- [x] **7.9 + 7.15 — A vitrine inteira obedece o tema** 🔴🟡 ✅ FEITO (merge `462a24d`, os dois juntos numa tacada) — o `vitrineTextColor` existia e era editável mas só alimentava `--producer-button-text` (texto de botão); todo texto de corpo era hardcoded (~10 na página + 16 no shell + o ProfilePage compartilhado do 7.15). **Fix = ZERO edits de className** — espelha o mecanismo do member (regras CSS escopadas no `globals.css` atrás de classes-wrapper condicionais injetadas pelo layout; UMA cor rege a hierarquia por `opacity`; fallbacks nos hex EXATOS de hoje). **Gate DUPLO** (`vitrine-customized` = accent||texto p/ os azuis→accent · `vitrine-text-customized` = só texto p/ os textos) mantém a Regra de Ouro do item **por construção**: sem cor setada = sem classe = zero regras = **byte-idêntico**. **7.15**: o `ProfilePage` compartilhado herda o tema DENTRO da vitrine (o wrapper é ancestral) e fica **intocado no `/profile` global do staff** (lá não existe wrapper — por construção); a TRAVA do BUG C (`isPureStudent`) nem entra no diff. Azuis do profile (botão foto/barra/nível/submit senha) → accent. **3 arquivos** (`layout.tsx`+`workspace-shell.tsx`+`globals.css`), zero schema. Validado visual no staging (matriz 6 passos × light/dark × página/shell/profile + N1 contraste-claro-em-light + N2 accent-como-texto-dark + profile global idêntico + BUG C vivo nos 2 contextos). ⚠️ **LIMITAÇÃO CONHECIDA (aceita, idêntica ao member):** uma cor de texto × dois temas (light/dark) — garantir contraste é responsabilidade do produtor (o mesmo trade-off do member area há meses). Candidato futuro: preview de contraste no editor — só se doer em produtor real.
- [x] **7.10 — Badge do sininho + nível de gamificação seguem o accent** 🟡 ✅ FEITO (merge `6f27ee6`) — a badge (`bg-blue-500` + glow indigo), o dot e o fundo da linha não-lida (`notifications-bell.tsx`) e o nome do nível (`header.tsx:81`) eram hardcoded. Fix = **var-com-fallback direto no className** (`var(--producer-primary,#hexexato)`) nos 4 elementos — sem wrapper CSS (poucos elementos, 1-2 arquivos; o namespace `--producer-*` é injetado nas 2 superfícies: painel SEMPRE via provider, vitrine com accentColor). Byte-idêntico sem customização nas duas. ⚠️ **Reconciliação Q2→button-text:** o desenho previu `text-white` no número (convenção dos botões do course-card), mas a decisão final consumiu **`--producer-button-text`** (a var de contraste que o produtor já controla) com fallback `#ffffff` (byte-idêntico + respeita a var) — estritamente melhor. ⚠️ **Emenda do glow:** o fallback do `color-mix` foi fixado no **indigo original `#6366f1`** (não `#3b82f6`) → default byte-idêntico ao par azul-badge+glow-indigo de hoje. Header:81 (nível) entrou por decisão do Vinicius. Validado visual no staging (painel themeConfig vs vitrine accent, independentes; defaults intocados). Badges vermelhas de contagem (semânticas) intocadas. 2 arquivos.
- [x] **7.11 — Painel do produtor obedece o tema** 🔴 ✅ FEITO (merge `875429e`) — ⚠️ **PREMISSA CORRIGIDA na leitura (L18):** o plano supôs "painel não tematiza → fatiar em N branches por componente". FALSO — o painel **já** tinha `.producer-layout` (`producer-shell.tsx:23`) com um ruleset no `globals.css:237-256` mapeando o azul SÓLIDO (`bg/text/border/ring-blue-500/600`) → `--producer-primary`. Por isso botões primários já obedeciam mas hovers/focos/tints ficavam azul. **O 7.11 real = as LACUNAS do ruleset** (tints via `color-mix`, `hover:bg-blue-700`, `focus:ring-blue-500` plano, `text-blue-300/700`, `dark:` variants, gradientes). **Fix = estender o MESMO bloco `.producer-layout`** (~28 regras, espelhando os percentuais provados do member theme), **1 arquivo** (`globals.css`), zero edits de componente → tematiza TODO o painel de uma vez (provado: sem modais em portal escapando). **Só azul remapeado → semânticos (verde/vermelho/âmbar/status/webhook) IMUNES por construção.** **Condição α estrutural:** `.producer-layout` só no painel → admin/vitrine/member sem wrapper ficam azul-fallback (contraprova admin PROVADA ao vivo com tema rosa ativo, zero vazamento). Validado visual staging (default byte-idêntico + custom rosa + admin azul + dark/light). ⚠️ **Limitação β (documentada junto das irmãs):** focus-ring/tint muito claro × accent claro = contraste é do produtor, idêntico ao trade-off do member.
- [x] **7.12 — Fade do banner do curso (controlável)** 🟡 ✅ FEITO (merge `6a9f635`) — o fade hardcoded do curso (`(course)/course/[slug]/page.tsx`: 2 overlays — fade-topo + vinheta lateral) virou controlável (toggle/cor/intensidade) espelhando o molde provado da vitrine (`vitrineBannerFade*`). 3 colunas novas no Course (`courseBannerFade{Enabled,Color,Opacity}`), defaults = valores EXATOS de hoje (enabled true/opacity 1) → **byte-idêntico** em curso existente. Editor: nova seção "Fade do banner" na aba Personalizar (salva via PUT genérico); init flui por include+spread (0 edits, provado). CoursePreview (vendas) intocada.
- [x] **7.13 — Cores de texto do login (2 campos + cascata)** 🟢 ✅ FEITO (merge `6a9f635`, migração AGRUPADA com o 7.12) — o login auto-derivava o texto da luminância da box; agora 2 campos: **`loginTextColor`** (título, inputs, **e o texto do botão "Entrar"** — ⚠️ **EMENDA 3 do dono**: vetou o `text-white` fixo, o botão segue a cor da página, contraste = responsabilidade do produtor que controla a cor do botão à parte) + **`loginSecondaryTextColor`** (subtítulo + labels). **Cascata:** secundário setado → a cor · NULL → hierarquia por opacidade da principal (0.6/0.75, **emenda 2**) · tudo NULL → auto-derive de sempre (byte-idêntico). Placeholders ficam na principal a 40%. ⚠️ **EMENDA 1:** as 3 telas de auth (login/forgot/reset) herdam via `getLoginTheme` (1 arquivo). ⚠️ **Enhancement futuro anotado:** `loginButtonTextColor` (cor do texto do botão independente da página) — só se o par página+botão gerar contraste ruim recorrente. ⚠️ **Ambiente:** schema mudou com o dev no ar → Prisma Client stale (parar→generate→reiniciar; lição na memória).
- [x] **7.16 — Histórico de Webhooks vazava entre workspaces do mesmo produtor** 🔴 ✅ FEITO (merge `944e152`) — ws recém-criado exibia os eventos do workspace IRMÃO (emails de comprador na tela errada). **VEREDITO da investigação (por leitura + payload):** **(a) SIBLING-ONLY, NÃO cross-producer** — o furo eram os arms 2/3 do `where.OR` filtrarem cursos por `ownerId: staff.id` (producer-wide, todos os ws do dono); mas o gate `requireWorkspaceOwner` + a query bounded a `staff.id` impediam produtor B de ver produtor A. **(b) MESMA rota do 1.4** (`7d6c8b8`), furo DISTINTO (o 1.4 matou o COLLABORATOR `where={}`; este é o escopo dos arms do PRODUCER); consumidor único (a página applyfy). **Fix (1 arquivo):** os arms 2/3 derivam dos cursos do **workspace ATIVO** (`course where workspaceId: ws.id`), não do dono. O gate já prova ownership (a fronteira); a query escopa dentro. Logs legados (courseId setado, workspaceId null) continuam aparecendo no próprio ws e param de vazar pro irmão; órfãos totais seguem admin-only. COLLABORATOR (403 do 1.4)/ADMIN/`?event=` intocados. Staging 4/4 **por payload** (①ws novo=vazio de A ②ws A=nada some incl. legado ③cross-producer isolado ④filtro vivo). **⚠️ ACHADO (útil p/ tenancy futura):** a ③ provou que **`getCurrentWorkspace` REJEITA hint de ws alheio NA ORIGEM** (valida `ownerId === userId` antes de aceitar o header `x-workspace-id`) → o isolamento cross-producer vale **uma camada ANTES do gate** (produtor nem *resolve* ws de outro dono; retorna 200-vazio do próprio ws, não 403).
- [x] **7.14 FASE A — Erros de upload honestos (thumbnail/banner do curso · capa do módulo)** 🟡 ✅ FEITO (merge `874d251`) — **DOIS bugs empilhados** (a investigação provou os dois): (1) o hint prometia 5MB mas as 3 imagens passam pela **lambda** `/api/upload` (teto ~4.5MB da Vercel) → a janela 4.5-5MB falhava "dentro do limite" com 413 (mesmo teto do BUG A `f2ea405`, provado por código + boundary test staging: 4.8MB local passa na rota → a falha em prod é o cap da plataforma); (2) os 2 fronts (`thumbnail-upload`/`banner-upload`, `handleFileChange` byte-idêntico) chamavam `res.json()` ANTES do `res.ok` → o 413 não-JSON quebrava o parse → catch vazio → "Erro ao fazer upload" genérico. **Fix:** helper compartilhado `src/lib/upload-image.ts` (matou a duplicata, net −6 linhas) com guarda de tamanho no CLIENT (4MB, antes da rede, com o tamanho real na mensagem) + leitura defensiva do erro; rota+bucket 5MB→**4MB** (prometido = aceito nas 2 pontas); hints 4MB nas 3 superfícies. Material (signed-url do BUG A) intocado. Staging: 4.8MB → 400 "máx. 4MB" (era 413 mascarado) · 2MB → 200.
- [x] **7.14 FASE B — Upload de imagem direto (signed-url) 🟡 ESTRUTURAL** ✅ FEITO (merge `cf660b7`) — o teto ~4.5MB da Vercel **saiu do caminho das imagens**: o helper `upload-image.ts` (contrato da Fase A intacto) agora pede signed URL à **emissora nova** `/api/upload/signed-url` e sobe **direto browser→Supabase** (molde BUG A). **Limite novo: 10MB único** (decisão do dono), enforçado em 3 camadas: guarda client · emissora (**endurecida**: `image/*` + tamanho declarado ANTES de assinar, extensão sanitizada `[a-z0-9]`) · `fileSizeLimit` do bucket. Gate = paridade literal com a lambda (ADMIN∥PRODUCER) — zero persona muda. **Raio real = 4 superfícies** (o desenho achou a 4ª: banner da vitrine via o mesmo `BannerUpload`); os 2 fronts com **1 linha de hint cada** no diff (o contrato segurou) + os **3 hints "5MB" órfãos da Fase A** corrigidos (`course-form:344`/`modules-manager:661`/`appearance-tab:272` — o diff `6883260` só tocou os defaults). **⚠️ CORREÇÃO HONESTA do registro da Fase A:** o `fileSizeLimit` do bucket estava **`null` (SEM limite) em STAGING E EM PROD** — o "rota+bucket 5MB→4MB" só valia no literal do `createBucket` (que nunca roda com bucket existente); a Fase A enforçava só client+rota. **A parede de bucket nasce AGORA** (10485760 nos 2 ambientes, ANTES/DEPOIS registrados, public/MIME preservados; prod atualizado ANTES do push). **2 desvios da instrução, justificados por evidência:** (a) a rota antiga **NÃO virou** a emissora — 4 uploaders vivos postam FormData nela (PDF de termos · email-logo · botão-suporte · thumb de live, este ainda com o bug pré-7.14 do `res.json()` sem guarda) → **CANDIDATO FASE C: migrar os 4 e aí decidir a morte da lambda**; (b) **sem `upsert:true`+path determinístico** — o molde não faz isso (`Date.now()` no path do material) e path fixo+overwrite plantaria **destruir-no-cancelar** (upload roda no selecionar, antes do Salvar) + cache velho de CDN na mesma URL; token nasce `upsert:false`/TTL 2h (provado no payload) → **CANDIDATO: limpeza de órfãos timestampados** (débito pré-existente das trocas de imagem, 3 buckets). Staging: curls 401/400-tipo/400-tamanho/200 + upload real via token direto no `*.supabase.co` + **placar visual do dono ①-④ verde com PNG de 9.1MB no banner da vitrine**; cleanup provado (objetos=0, campos=0, persona=0).
- [x] **7.15 — Perfil do aluno herda o tema** 🟡 ✅ FEITO junto do 7.9 (merge `462a24d`) — hipótese arquitetural CONFIRMADA (é o wrapper de 17 linhas do `ProfilePage` global) e resolvida pela herança do wrapper da vitrine, sem tocar o componente compartilhado (o `/profile` global e a TRAVA do BUG C ficaram fora do diff). Detalhe completo no 7.9 acima.

Cada um: Dev Brabo completo (read-only → proposta → staging → merge `--no-ff`).

---

# FASE 8 — Roadmap de crescimento ⚫

> **"Dá pra fazer um dia" — explicitamente NÃO é "falta pra terminar".** Features de expansão, por estratégia de negócio. Sem prazo.

- [ ] **8.1 — App nativo** (React Native/Expo) — app mobile dedicado.
- [ ] **8.2 — Marketplace de cursos** — vitrine pública de cursos entre produtores.
- [ ] **8.3 — Planos tiered** — níveis de assinatura do produtor.
- [ ] **8.4 — White-label completo** — marca 100% do produtor.
- [ ] **8.5 — i18n** — internacionalização.
- [ ] **8.6 — API pública** — API pra produtores integrarem.
- [ ] **8.7 — Stripe Connect (split)** — pagamentos com split.
- [ ] **8.8 — Analytics avançado** — cohort, LTV, retenção.

---

# FASE 9 — Débito técnico & polimento 🟢🟡

> Qualidade interna e QA. Não bloqueia o "pronto", mas mantém a casa em ordem. Pode ser intercalado entre as outras fases quando houver fôlego.

### Débito
- [ ] **9.1 — Migrations do zero (D1)** 🟡 — 77 migrations (em 2026-07-13, inclui a do 5.3) não reconstroem do zero; ~10 tabelas só via `db push` + RLS fora das migrations. Bloqueia novos ambientes. Ritual reset→push→resolve→RLS. **Coordenar com 1.6, 3.2 (migrações novas).**
- [ ] **9.2 — Staging completo (D2)** 🟢 — aplicar `storage-policies.sql` + seed de contas no staging.
- [ ] **9.3 — README stale (D3)** 🟢 — descreve Next 14/React 18/NextAuth/Stripe/"Applyfy — Área de Membros"; real é Next 16/React 19/Supabase Auth/"Members Club". Reescrever.
- [ ] **9.4 — DEPLOY_CHECKLIST stale** 🟢 — `src/docs/DEPLOY_CHECKLIST.md` com produto Applyfy R$97 (é R$597) + checklist pós-deploy unchecked. Atualizar.
- [ ] **9.5 — Guard `findUnique` antes de `user.create` (D4)** 🟢 — nas 2 rotas de aceite de convite (consistência).
- [ ] **9.6 — 4 branches stale (D5)** 🟢 — deletar `origin/fix/ios-pwa-carousel-scroll`, `origin/fix/webhook-await-send-email`, `origin/fix/ensure-user-paginated-auth-lookup`, `origin/perf/automation-execute-batch` (remotas; todas ahead 0, já na main — prefixos reais conferidos 2026-07-13). Housekeeping git.
- [ ] **9.7 — Carrossel (branch `feat/course-banner-carousel`)** 🟡 — 2 ahead/**128 behind** (2026-07-13 — custo de rebase 4× desde o registro; pesa na decisão terminar-ou-descartar). `Course.bannerExtra` no schema da branch. Precisa: rebase + `db push` do `bannerExtra` no staging + validação visual + merge. **Decidir: terminar ou descartar.**
- [ ] **9.8 — BLOCO E refactor (D6)** 🟡 — E4 (DRY) feito; E1 (tipagem/`any`)/E2 (hooks) abertos; E3/E5/E6 parciais. Qualidade interna.
- [ ] **9.9 — `let`→`const` parkeado (D7)** 🟢 — cosmético.
- [ ] **9.17 — Investigar inverter o default de `npm run dev`** 🟡 — hoje `npm run dev` = **PRODUÇÃO** (L20: `.env.local` não sobrepõe o DB). Candidato: dev→staging por padrão, prod só explícito. Toca Vercel/env/workflow — investigação read-only primeiro. *(Numerado 9.17 — 9.8/9.9 já existiam.)*
- [ ] **9.18 — Housekeeping: bloco morto `{!hasAccess}` no member page** 🟢 — o early return em `(course)/course/[slug]/page.tsx:379` garante `hasAccess`; o bloco em :525+ nunca renderiza (provado na investigação do 5.3). Remover.

### QA & Observabilidade
- [ ] **9.10 — Error boundaries** 🟡 — em páginas críticas (player, dashboard, checkout).
- [ ] **9.11 — Sentry (G2)** 🟢 — monitoring de erro em tempo real (grátis 5k/mês). Recomendado cedo.
- [ ] **9.12 — Playwright smoke tests (G3/2.4)** 🟡 — testes E2E automatizados (pagamento, aluno, automação, lives, support, CSV, dark-mode).
- [ ] **9.13 — Design tela-a-tela** 🟢 — auditoria "nível Apple" das telas restantes (a tela de curso pendente) + banner focal-point mobile + "sidebar pulo no load". User-reported.
- [ ] **9.14 — Arte real do logo Applyfy** 🟢 — substituir placeholder.
- [ ] **9.15 — Cloudflare Pro + pentest** 🟡 — divulgados na landing como segurança, ainda não executados. Quando a receita justificar (Cloudflare $20/mês gated em 10+ produtores; pentest R$5-15k).
- [ ] **9.16 — Backfill phone/CPF + UPDATE Plan R$597 no banco** 🟢 — scripts existem; rodar (2.5/2.6 do roadmap).

---

## 📐 SEQUÊNCIA RECOMENDADA (a ordem ótima)

A ordem dentro das fases, otimizada por dependência:

```
SEGURANÇA       1.1 MANAGE_LIVES → 1.2 Tags → 1.3 workspaces-owner → 1.4 cluster → 1.7 ITEM 3 → 1.9 GET-curso-anon ✅
                → 1.10 customize ✅ → 1.11 menu-reorder ✅ → 1.14 groups-cluster ✅ → 1.12 overrides-perms ✅ → 1.8 plan-limit-ws ✅ → 1.13 reviews-id ✅ | FASE 1 SEM código aberto — restam SÓ 1.5/1.6 (Fase 3)
                (1.5 magic-link + 1.6 token DEPOIS da Fase 3)
INFRA BARATA    2.1 HSTS ✅ → 2.2 npm audit ✅ → 2.3 XSS sanitize ✅
EMAIL           3.1 retry → 3.2 EmailLog   [desbloqueia 1.5]
CONVITE         1.5 magic-link → 1.6 token single-use   [agora que o email é confiável]
INFRA PESADA    2.4 store+origem (2.4a stopgap ✅) → 2.5 CSP (avaliar)
BUGS            4.1 ✅ → 4.2 ✅ → 4.3 ✅ → 4.4 ✅ → 4.5
QUICK-WINS      5.2 admin-nav → 5.3 toggle-box ✅ (943b8e4) → 5.4 CSV-editor ✅ (2c2ef5b) → 5.1 custom-domain   [5.2 segue aberto]
INTEGRAÇÕES     6.0 fundação → 6.2 multi-token → 6.1 cada gateway → 6.3 cancelamento
                ────────────────── 🏁 MARCO PRONTO ──────────────────
CRESCIMENTO     Fase 7 (push-test, IA, click-report, ...) → Fase 8 (app, marketplace, ...)
CONTÍNUO        Fase 9 intercalada quando houver fôlego (Sentry cedo; migrations com 1.6/3.2)
```

**Higienes:** senha Postgres staging ROTACIONADA ✅ (confirmado 2026-07-13) · pendentes: consolidar memória (cheia 30/30) · atualizar o estado-mestre da auditoria na memória.

---

*Fim do plano. Documento vivo — atualizar a cada item concluído e a cada feature nova que surgir. O backlog é finito e conhecido; o "pronto" está marcado; o resto é evolução.*

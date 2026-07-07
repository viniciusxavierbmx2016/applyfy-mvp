# Members Club — Plano Mestre de Execução

> **O mapa único.** Tudo que falta, em fases, por dependência × gravidade × esforço.
> Documento vivo: marque `[x]` ao concluir, adicione itens novos na fase certa.
>
> **Estado base:** `main` em `36bb6b5` · auditoria de segurança crítica FECHADA · plataforma em produção com clientes pagantes.
> **Última atualização:** sessão #08.

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

**Legenda de tamanho:** 🟢 P (Pequeno, ~1 sessão parcial) · 🟡 M (Médio, ~1 sessão) · 🔴 G (Grande, várias sessões) · ⚫ ÉPICO (multi-item).
**Legenda de status:** `[ ]` aberto · `[~]` em andamento · `[x]` feito.

---

# 🎯 O FIM ESTÁ AQUI

O backlog parecia infinito porque ninguém tinha cruzado a lista com o que já está em produção. Cruzando:

- **A segurança CRÍTICA já está fechada** (8 furos graves, todo o cross-tenant, o sequestro de conta) — a parte mais difícil JÁ PASSOU.
- **~12 features que pareciam pendentes JÁ ESTÃO FEITAS** (player YouTube mascarado, login sou aluno, dislike oculto, vitrine 100%, aba enriquecida, e mais) — eram fantasmas no backlog.
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

# FASE 2 — Infra de segurança 🟡 (2.1 + 2.2 + 2.3 ✅)

> **Por que aqui:** barata e importante. Fecha a camada de infra que a auditoria de código não cobre. A maioria é trivial (1 header, 1 comando).
> **Progresso:** ✅ **2.1 HSTS** (`de00875`) + ✅ **2.2 npm audit** (`7eaaf66`) + ✅ **2.3 lesson.description XSS** (`3d40bc3`). ABERTOS: **2.6** sanitizar `emailCustomHtml` (defense-in-depth, achado do 1.3) + **2.7** validar cores vs CSS-injection (candidato, sinuca do 2.3). Próximo natural = 2.6.

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

> **Candidato 2.7 (sinuca do 2.3, registrar — NÃO fazer agora):** os 3 sinks de `<style>` (`course/[slug]/layout.tsx`, `w/[slug]/layout.tsx`, `producer-theme-provider.tsx`) interpolam cores do config em `:root{...}` — **CSS-injection** se alguma cor não for validada (um `}` quebraria a regra e injetaria CSS). As cores `member*` são validadas como hex (customize PUT, do 1.10); vale confirmar num item futuro se TODAS (vitrine + producer theme) também são → **2.7 — validar cores contra CSS-injection**. Categoria diferente do 2.3 (CSS-injection, não JS-XSS; risco menor).

### 2.4 — Rate limiting compartilhado 🔴
**Problema:** `src/lib/rate-limit.ts` cobre ~14 rotas auth, in-memory per-instance (reseta em cold start, não compartilha entre lambdas). CRUD producer sem proteção.
**Abordagem:** Redis/Upstash (roadmap Fase 3 da infra). É o item maior da Fase 2.
**Etapas:**
- [ ] Read-only: mapear o rate-limit atual + as rotas que precisam de proteção.
- [ ] Decisão de arquitetura: Upstash (serverless-friendly) + trade-offs.
- [ ] Implementar o store compartilhado + aplicar nas rotas críticas (auth + CRUD sensível).
- [ ] Staging: simular brute-force → bloqueio compartilhado entre instâncias.
- [ ] Merge `--no-ff`.
**Dependência:** nenhuma, mas é o maior da fase — pode ir por último na Fase 2.

### 2.5 — CSP `unsafe-inline`/`unsafe-eval` (avaliar) 🔴
**Problema:** `next.config.mjs:36-49` — CSP com `unsafe-inline`+`unsafe-eval` no script-src (enfraquece proteção XSS). Difícil (Next + embeds).
**Abordagem:** investigar viabilidade de nonce/hash sem quebrar Next/embeds. Pode ficar como "avaliado, risco aceito documentado" se o custo for alto demais.
**Etapas:**
- [ ] Read-only: o que depende de inline/eval hoje (Next runtime, players, etc.).
- [ ] Avaliar nonce-based CSP; se inviável sem regressão, documentar a decisão.
- [ ] (se viável) implementar + staging extensivo (players, embeds, PWA).
- [ ] Merge `--no-ff` OU registro de risco aceito.
**Dependência:** nenhuma. Candidato a adiar se o custo/risco não compensar agora.

### 2.6 — Sanitizar `emailCustomHtml` (defense-in-depth) 🟡
**Problema:** `buildAccessEmail` (`email-templates.ts:219-224`) renderiza o HTML do produtor (`emailCustomHtml`, e `emailTitle`/`emailBody`/`emailFooter` inline em :263-303) SEM escapar, no email transacional de acesso enviado a TODO comprador novo (enrollment, import, add-students, resend, webhooks Applyfy). O template expõe as variáveis `{senha}` (senha temp em texto puro) e `{link}` → HTML malicioso pode exfiltrar a senha inicial do aluno (ex: `<img src>` para endpoint do atacante). Mais grave que o 2.3 (que é defacement; este vaza senha).
**Mitigação já aplicada:** o 1.3 fecha quem pode SETAR o campo (só o dono agora), removendo o vetor via colaborador. Este item é a camada defense-in-depth (um dono comprometido, ou futura reabertura do gate, ainda injetaria).
**Abordagem:** aplicar o `sanitizeHtml` server-side que já existe (reuso, mesma lib do 2.3), preservando os placeholders `{senha}`/`{link}`. Mesma família do 2.3.
**Etapas:**
- [ ] Read-only: confirmar o sink + o `sanitizeHtml` reusável + como não quebrar os placeholders de variável.
- [ ] Aplicar a sanitização no render/persistência do email custom.
- [ ] Staging: injetar `<script>`/`<img src=exfil>` no emailCustomHtml → neutralizado, email ainda renderiza.
- [ ] Merge `--no-ff`.
**Dependência:** relaciona com 2.3 (mesmo `sanitizeHtml`). Mitigado por 1.3.

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

# FASE 4 — Bugs conhecidos 🟢

> **Por que aqui:** bugs reais registrados, mas todos de gravidade baixa-média (nenhum crítico). Limpeza antes das features.

- [ ] **4.1 — resend de credencial: permissão errada** 🟢 — gateado por `MANAGE_LESSONS`, devia ser `MANAGE_STUDENTS`. Trocar o gate. (Relaciona com 1.1/1.2.)
- [ ] **4.2 — STUDENT-com-collab não promovido em `getCurrentUser`** 🟢 — resposta fica PENDING em alguns fluxos. Investigar `getCurrentUser` vs `requireStaff`.
- [ ] **4.3 — redirect deslogado: gap em admin/student** 🟢 — o fix do `/producer` (logout→login) não cobre admin (tela branca) e student (skeleton). Espelhar o fix existente para os outros 2 caminhos.
- [ ] **4.4 — edge: cookie inválido ping-pong** 🟢 — `/producer`↔`/producer/login` em caso de cookie inválido (edge case). Investigar `proxy.ts` + `producer/page.tsx`.
- [ ] **4.5 — `console.error` ruidoso no catch** 🟢 — loga "Sem permissão" como erro em todo 403 (cosmético, não é bug de status). Rebaixar o log de error→debug em todas as rotas. Housekeeping.

Cada um: read-only → fix → staging (onde aplicável) → merge `--no-ff`.

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

### 5.3 — Toggle do box de info do curso 🟢
**Pedido (Vinicius):** um novo card na aba "Configurações" do editor de curso pra mostrar/esconder o box (nome + módulos + aulas + progresso) abaixo do banner na área de membros. **Mesmo padrão dos toggles existentes** (`showStudentCount`, `showLessonSupport`).
**Etapas:**
- [ ] Schema: `showCourseInfoBox Boolean @default(true)` no Course + migração.
- [ ] API: aceitar o campo no PUT `/api/courses/[id]`.
- [ ] Admin: novo card toggle na aba Configurações (ícone + título "Exibir resumo do curso" + descrição + salvamento automático + toast), espelhando os cards existentes.
- [ ] Área do aluno: condicional — se false, esconder o box abaixo do banner.
- [ ] Retornar o campo na API que alimenta a área do aluno.
- [ ] Staging: toggle off → box some; on → box volta. Default true (não muda comportamento atual).
- [ ] Merge `--no-ff`.
**Dependência:** nenhuma. Baixo risco (padrão repetido).

### 5.4 — CSV no editor de curso 🟢
**Achado:** o `<ImportStudentsModal>` existe e funciona na tela global Meus Alunos (`students/page.tsx:79,669`), POSTa pra `students/import/route.ts` que já enforça `canManageStudentsOfCourse` por curso. A aba "Alunos" do editor (`courses/[id]/students/page.tsx`) só tem "Enviar acesso" + "Exportar CSV" — zero import.
**Abordagem:** renderizar o `ImportStudentsModal` que JÁ EXISTE na aba Alunos do editor, pré-escopado ao curso atual. **Zero mudança de backend** (a API já recebe `courseIds[]`).
**Etapas:**
- [ ] Read-only: confirmar o modal + a aba Alunos do editor + o pré-escopo por curso.
- [ ] Renderizar o modal na aba, pré-selecionando o curso atual.
- [ ] Staging: importar CSV de dentro do editor → alunos entram no curso correto.
- [ ] Merge `--no-ff`.
**Dependência:** nenhuma. Reuso trivial.

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
- [ ] **9.1 — Migrations do zero (D1)** 🟡 — 78 migrations não reconstroem do zero; ~10 tabelas só via `db push` + RLS fora das migrations. Bloqueia novos ambientes. Ritual reset→push→resolve→RLS. **Coordenar com 1.6, 3.2 (migrações novas).**
- [ ] **9.2 — Staging completo (D2)** 🟢 — aplicar `storage-policies.sql` + seed de contas no staging.
- [ ] **9.3 — README stale (D3)** 🟢 — descreve Next 14/React 18/NextAuth/Stripe/"Applyfy — Área de Membros"; real é Next 16/React 19/Supabase Auth/"Members Club". Reescrever.
- [ ] **9.4 — DEPLOY_CHECKLIST stale** 🟢 — `src/docs/DEPLOY_CHECKLIST.md` com produto Applyfy R$97 (é R$597) + checklist pós-deploy unchecked. Atualizar.
- [ ] **9.5 — Guard `findUnique` antes de `user.create` (D4)** 🟢 — nas 2 rotas de aceite de convite (consistência).
- [ ] **9.6 — 4 branches stale (D5)** 🟢 — deletar `ios-pwa-carousel-scroll`, `webhook-await-send-email`, `ensure-user-paginated-auth-lookup`, `perf/automation-execute-batch` (todas ahead 0, já na main). Housekeeping git.
- [ ] **9.7 — Carrossel (branch `feat/course-banner-carousel`)** 🟡 — 2 ahead/32 behind. `Course.bannerExtra` no schema da branch. Precisa: rebase + `db push` do `bannerExtra` no staging + validação visual + merge. **Decidir: terminar ou descartar.**
- [ ] **9.8 — BLOCO E refactor (D6)** 🟡 — E4 (DRY) feito; E1 (tipagem/`any`)/E2 (hooks) abertos; E3/E5/E6 parciais. Qualidade interna.
- [ ] **9.9 — `let`→`const` parkeado (D7)** 🟢 — cosmético.

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
INFRA BARATA    2.1 HSTS → 2.2 npm audit → 2.3 XSS sanitize
EMAIL           3.1 retry → 3.2 EmailLog   [desbloqueia 1.5]
CONVITE         1.5 magic-link → 1.6 token single-use   [agora que o email é confiável]
INFRA PESADA    2.4 rate-limit → 2.5 CSP (avaliar)
BUGS            4.1 → 4.2 → 4.3 → 4.4 → 4.5
QUICK-WINS      5.2 admin-nav → 5.3 toggle-box → 5.4 CSV-editor → 5.1 custom-domain
INTEGRAÇÕES     6.0 fundação → 6.2 multi-token → 6.1 cada gateway → 6.3 cancelamento
                ────────────────── 🏁 MARCO PRONTO ──────────────────
CRESCIMENTO     Fase 7 (push-test, IA, click-report, ...) → Fase 8 (app, marketplace, ...)
CONTÍNUO        Fase 9 intercalada quando houver fôlego (Sentry cedo; migrations com 1.6/3.2)
```

**Higienes pendentes (fazer quando conveniente):** rotacionar senha Postgres staging (vazou em transcripts) · consolidar memória (cheia 30/30) · atualizar o estado-mestre da auditoria na memória.

---

*Fim do plano. Documento vivo — atualizar a cada item concluído e a cada feature nova que surgir. O backlog é finito e conhecido; o "pronto" está marcado; o resto é evolução.*

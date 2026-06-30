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

# FASE 1 — Segurança restante 🔴

> **Por que primeiro:** risco em produção vem antes de tudo. São os furos que a auditoria mapeou e ainda não fecharam. Família dos 8 já resolvidos — mesmos padrões (`requireWorkspaceOwner`, `requirePermission` + `hasWorkspaceAccess`, nova permissão de colaborador).

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

### 1.2 — Tags standalone ungated 🟡
**Problema:** `tags/route.ts:9,40`, `[id]/route.ts:7-16` — CRUD de tags é `requireStaff` puro. Tags = segmentação + alvo de automação.
**Abordagem:** `requirePermission(staff, "MANAGE_STUDENTS")` (tags pertencem ao domínio de gestão de alunos; não precisa permissão nova).
**Etapas:**
- [ ] Read-only: confirmar gates + se há caller que leria tags sem a permissão (sinuca).
- [ ] Aplicar `requirePermission(MANAGE_STUDENTS)` nas rotas CRUD de tag + conferir o catch.
- [ ] Staging: colaborador sem MANAGE_STUDENTS → 403; com → passa.
- [ ] Merge `--no-ff`.
**Dependência:** depois de 1.1 (mesma sequência de permissões).

### 1.3 — `workspaces/[id]` PUT → owner-only 🟡
**Problema:** PUT usa `canAccessWorkspace` (devia ser `requireWorkspaceOwner`) — colaborador edita config do workspace.
**Abordagem:** trocar pelo helper `requireWorkspaceOwner` que já existe (família do FURO #1/#3).
**Etapas:**
- [ ] Read-only: confirmar o gate atual + que `requireWorkspaceOwner` cobre o caso.
- [ ] Aplicar + conferir catch.
- [ ] Staging: colaborador → 403; dono → passa.
- [ ] Merge `--no-ff`.
**Dependência:** nenhuma.

### 1.4 — Cluster médio: integrations + course-support 🟡
**Problema:** três rotas sem gate de permissão consistente:
- `integrations/courses/[id]` PATCH sem gate (padrão perm + course-scope).
- `integrations/request` POST sem workspace scope.
- `course-support/[id]` PATCH + messages sem gate (a UI exige MANAGE_STUDENTS, a API não).
**Abordagem:** aplicar o padrão de permissão + course-scope coerente em cada (mesma família do FURO #4/#5).
**Etapas:**
- [ ] Read-only nas 3 rotas: gate atual + qual permissão/escopo cada uma exige.
- [ ] Aplicar gate em cada (uma por vez, build entre elas) + conferir catch.
- [ ] Staging: colaborador sem a perm → 403 em cada; com → passa.
- [ ] Merge `--no-ff` (pode ser um por rota ou agrupado, decidir na investigação).
**Dependência:** nenhuma.

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

### 1.7 — ITEM 3: `MANAGE_LESSONS` em criar/excluir curso 🟢
**Problema:** o blanket-403 de colaborador é só em criar curso (`courses/route.ts:245`) e excluir curso (`courses/[id]/route.ts:286`). Módulos/seções JÁ honram MANAGE_LESSONS via `canEditCourse`.
**Decisão de produto (Vinicius):** colaborador pode **CRIAR e EDITAR** cursos. **NUNCA EXCLUIR** (ação destrutiva fica só com o dono).
**Abordagem:** liberar o POST de criar curso para `MANAGE_LESSONS`; manter o DELETE como blanket-403 para colaborador.
**Etapas:**
- [ ] Read-only: confirmar os 2 pontos exatos (create:245, delete:286) + o catch.
- [ ] Liberar create para `requirePermission(MANAGE_LESSONS)`; estender o catch para não dar 500; confirmar que o gap de plan-limits só roda para PRODUCER.
- [ ] Manter delete blanket-403 (colaborador nunca exclui).
- [ ] Staging: colaborador com MANAGE_LESSONS → cria curso (201), tenta excluir → 403; dono → ambos.
- [ ] Merge `--no-ff`.
**Dependência:** nenhuma.

---

# FASE 2 — Infra de segurança 🟡

> **Por que aqui:** barata e importante. Fecha a camada de infra que a auditoria de código não cobre. A maioria é trivial (1 header, 1 comando).

### 2.1 — HSTS 🟢
**Problema:** `next.config.mjs:26-50` tem X-Frame/CSP/nosniff mas falta `Strict-Transport-Security`.
**Etapas:**
- [ ] Adicionar o header HSTS (1 linha) em `next.config.mjs`.
- [ ] Build verde + confirmar o header na resposta.
- [ ] Merge `--no-ff`.
**Dependência:** nenhuma. Trivial.

### 2.2 — `npm audit` (dompurify CVE) 🟢
**Problema:** 1 moderate — dompurify <=3.4.10 (transitivo via tiptap; app usa sanitize-html no server). `npm audit fix` disponível.
**Etapas:**
- [ ] Rodar `npm audit` read-only, confirmar o escopo.
- [ ] `npm audit fix` (sem `--force` primeiro) + build verde + smoke test do editor (tiptap).
- [ ] Merge `--no-ff`.
**Dependência:** nenhuma.

### 2.3 — XSS sink: sanitizar `lesson.description` 🟡
**Problema:** `(course)/.../lesson/[id]/page.tsx:668` renderiza `lesson.description` (producer-authored) sem `sanitizeHtml`.
**Abordagem:** aplicar o `sanitizeHtml` que já existe no server (reuso, não nova lib).
**Etapas:**
- [ ] Read-only: confirmar o sink + onde o `sanitizeHtml` server-side já é usado (reusar o mesmo).
- [ ] Aplicar a sanitização no ponto de render/persistência.
- [ ] Staging: tentar injetar `<script>` na description → neutralizado.
- [ ] Merge `--no-ff`.
**Dependência:** relaciona com 1.7 (quem edita conteúdo).

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
SEGURANÇA       1.1 MANAGE_LIVES → 1.2 Tags → 1.3 workspaces-owner → 1.4 cluster → 1.7 ITEM 3
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

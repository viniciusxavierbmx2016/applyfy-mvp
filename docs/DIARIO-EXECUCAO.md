# DIÁRIO DE EXECUÇÃO — Members Club

> Registro **cronológico** do que foi feito, quando, e com que prova.
> A ordem e as camadas vivem no [ROADMAP-EXECUCAO.md](ROADMAP-EXECUCAO.md); o registro por
> item vive no [PLANO-MESTRE.md](PLANO-MESTRE.md). Aqui é a linha do tempo.

**Nenhuma etapa fecha sem entrada aqui** — é o que impede o item-fantasma (item fechado no
código e aberto no papel, ou o contrário; as duas faces já aconteceram).

**Regra de ouro:** este arquivo registra **fato**, não intenção. Nada entra como "vai ser
feito"; só entra o que **já foi**.

**Ordem das entradas:** mais recente no topo.

---

## Formato obrigatório de cada entrada

Copie o bloco abaixo e preencha todos os campos. Campo sem resposta = etapa não fechada.

```
## [DATA] — CAMADA X, ETAPA X.Y — <nome>

**Estado antes:** main em <sha>
**O que foi feito:** <2–5 linhas, o essencial>
**Arquivos tocados:** <lista>
**Como foi provado:** <matriz de staging + validação humana, com o resultado colado>
**SHA do merge:** <sha>  ·  **Rollback:** git revert -m 1 <sha>
**Mudou em produção para quem:** <§21 — quem sente a mudança, quem avisar>
**Ficou aberto:** <itens novos criados, com número>
**Regras conferidas:** §17 respondido ✅ · staging-first ✅ · gate humano ✅ · papelada ✅
```

---

<!-- As entradas começam abaixo desta linha, da mais recente para a mais antiga. -->

## 2026-08-14 — CAMADA 2, STORAGE PARTE 1 — Fechar a torneira (`community/upload`)

**Estado antes:** main em `febcfad`

**O que foi feito:** o achado **A2** da auditoria E2.1 — `POST /api/community/upload` tinha
`getCurrentUser()` como **único** gate, e escrevia num bucket público sem checar vínculo, sem
rate-limit e validando mime pelo header que o cliente escolhe. A rota passou a exigir **vínculo
real** com a plataforma, ganhou o rate-limit do helper da casa, teto de tamanho no servidor e
**allowlist de mime por assinatura de bytes** — com a extensão gravada derivada do conteúdo,
não do nome enviado.

**Arquivos tocados:** `src/app/api/community/upload/route.ts` (único; +127/−36)

**Como foi provado:**
- **Matriz 14/14** em staging (`wxynnsyartxcvglqwmdw`, impresso antes de cada bloco). Legítimos
  **200**: aluno matriculado (A e B), `colab-comunidade`, `colab-modonly`, `colab-reply`,
  ⭐ `colab-lessons` (o caminho do produtor), dono, `dono-b`, ADMIN. Negados **403**:
  `colab-zero`, `colab-students`, `colab-analytics` — e o **atacante do A2**, uma conta criada
  na hora por `/api/auth/register-producer` (rota pública, **201**, nascida com 0 workspace,
  0 curso, 0 matrícula). Anônimo **401**.
- **Fronteira de contexto** (o desenho escolhido): `aluno-b` sobe **200**, publica no curso A
  **403** *"Não matriculado neste curso"*, publica no próprio B **201**.
- **Sondas**: 6 MB → **413** · PDF, EXE (`MZ`) e SVG **declarados `image/png`** → **415** ×3 ·
  SVG honesto → **415** · rajada → **429** na #99, `Retry-After: 17`, `X-RateLimit-Limit: 100`.
- **Marcador positivo por tipo**: PNG/JPEG/GIF/WebP enviados como `application/octet-stream`
  e **sem extensão no nome** gravaram `.png/.jpg/.gif/.webp`.
- **Controle crítico**: post com `<img>` publica (201), sobrevive ao sanitize, volta no feed, e
  a URL pública serve **70 bytes, `image/png`, idênticos aos enviados**.
- **Gate humano 5/5** no palco `e92a68b`: (1) post com imagem renderiza · (2) comentário e
  resposta com imagem, 201 · (3) editar post trocando imagem, persiste após reload ·
  (4) ⭐ **produtor insere imagem na descrição de aula — o irmão fora da comunidade não quebrou**
  · (5) PDF barrado no client com a mensagem certa, em vermelho, sem sair requisição.

**SHA do merge:** `af28974`  ·  **Rollback:** `git revert -m 1 af28974`

**Mudou em produção para quem:** ninguém legítimo perde nada — todos os 5 call-sites do
`RichTextEditor` foram mapeados antes e cobertos. **Passa a levar 403**: conta autenticada sem
nenhum vínculo (o alvo do fix) · colaborador `ACCEPTED` **sem** `MANAGE_COMMUNITY`,
`REPLY_COMMENTS` ou `MANAGE_LESSONS` · **PRODUCER recém-registrado sem workspace** (aprovado
pelo dono: sem workspace não há curso, logo não há caminho legítimo). Ninguém a avisar.

**Ficou aberto:** **9.88** portas irmãs do bucket gateadas por `role` (cegas ao híbrido) ·
**9.89** rate-limit por contagem e não por peso (~500 MB/min por IP) · **9.90** comentário em
post `PENDING` falha em silêncio (achado humano) · **9.91** seed sem persona sem-vínculo.
⚠️ **A1 (bucket `materials` público e sem teto) segue 🔴 aberto — é a Storage Parte 2.**

**Efeito colateral no staging (registrado):** `aluno-b@staging.test` ganhou a senha do elenco
no ws B, usando `generateSalt`/`hashPassword` de `src/lib/workspace-auth.ts` (nunca cripto
replicada). O login dele falhava desde a varredura de QA e **envenenava sondas** — foi a origem
do falso positivo de IDOR. Contas `sem-vinculo` e `aluno-b2` criadas e apagadas (`count=0`);
posts de teste removidos.

**Regras conferidas:** §17 respondido ✅ · staging-first ✅ · gate humano ✅ · papelada ✅ ·
7 perguntas (reuso do `rateLimit` e dos helpers de gate, zero abstração nova) ✅ ·
irmãos mapeados antes do fix ✅

---

## 2026-08-14 — 📌 VARREDURA DE QA (staging) + TRIAGEM — não é etapa fechada

> Registro da varredura exploratória (trilha paralela, §7 do roadmap) e da
> triagem dos 7 achados. Nenhum código tocado; os itens nasceram no PLANO-MESTRE.

**Estado antes:** main em 5eacfc8 · palco de staging no ar (19 users, 2 workspaces)

**O que foi feito:** varredura de QA no painel do produtor, com as personas do
E0.3. Sete achados reportados, todos triados com investigação própria antes de
virar item.

**O resultado da triagem:**

| # | achado do QA | veredito |
|---|---|---|
| 1 | "IDOR cross-tenant em `/api/courses/[id]`" | 🔴 **FALSO POSITIVO, refutado com prova** → nota no **9.81** |
| 2 | dono se autoconvida e vira colaborador de si mesmo | ✅ real → **9.82** 🟠 |
| 3 | workspace de colaboração não aparece no seletor | já conhecido → é o **9.75**, sem item novo |
| 4 | convite revogado não reativa; sem botão | ✅ real → **9.83** 🟢 |
| 5 | tabela não responsiva no mobile | ✅ real → **9.84** 🟢 |
| 6 | botão desabilitado sem motivo | ✅ real → **9.85** 🟢 |
| 7 | textos de erro sem padronização | ✅ real → **9.86** 🟢 |

**+ 1 achado que o QA não viu e a investigação encontrou:** a rota devolve
`videoUrl` de todas as aulas a quem tem qualquer permissão do `anyOf` — em
produção, **1.833 aulas, 100% com vídeo, 3 colaboradores nessa condição**. É o
conteúdo do **9.81**.

**Como foi provado (o falso positivo):** a persona `dono-b` **tem** vínculo
`ACCEPTED` no workspace A com `MANAGE_COMMUNITY` — foi criada assim no E0.3. O
200 é por desenho. A prova do contrário é `aluno-staging`: sessão válida, **zero
linha de `Collaborator`**, recebe **403**.

**✅ O que veio LIMPO na varredura** (vale tanto quanto o que veio sujo): painel
do **admin**, área do **aluno**, e **10+ trocas de conta** sem vazamento de
estado entre sessões.

**Arquivos tocados:** docs/PLANO-MESTRE.md · docs/DIARIO-EXECUCAO.md — zero código
**SHA do merge:** n/a (commit direto na main, só docs) · **Rollback:** `git revert`
**Mudou em produção para quem:** ninguém
**Ficou aberto:** 9.81 🟠 · 9.82 🟠 · 9.83/9.84/9.85/9.86 🟢 — todos → Camada 3
**Regras conferidas:** §17 n/a (zero código) ✅ · staging-only ✅ · papelada ✅

⚠️ **Lição de processo desta varredura:** o handoff descrevia `dono-b` como
"dono do B **e** colaborador no A", e o agente usou a persona como "sem vínculo
no A". Handoff de QA precisa listar, por persona, **papel + permissões exatas +
escopo + o que ela DEVE e NÃO DEVE alcançar** — senão o relatório vira caça a
buraco inexistente. Virou memória permanente.

## 2026-08-14 — CAMADA 1 FECHADA, ETAPAS E1.1 + E1.2 — Bug do convite

**Estado antes:** main em 3a447ab

**O que foi feito:** investigado (E1.1) e corrigido (E1.2) o bug que travava o
aceite de convite quando o link era aberto num navegador com **outra conta
logada** — só funcionava em janela anônima, e ninguém sabia disso. A causa era
**ordem de checagem**: `accept/route.ts` lia o `mode` em `:33` e só o consultava
em `:81`, então o ramo de sessão (`:38-49`) interceptava o signup antes. O fix
despacha por modo **antes** da sessão, com condição composta, e a página passou a
avisar quando a sessão é de outra pessoa.

**Arquivos tocados:** `src/app/api/invite/[id]/accept/route.ts` ·
`src/app/invite/[id]/page.tsx`

**Como foi provado:** matriz de **6 cenários** antes/depois em staging, mais um
**teste de segurança** dedicado e verificação no banco:

```
(c) sessão de TERCEIRO + signup      400 → 200 created ✅   (sem janela anônima)
    ↳ userId gravado no vínculo      CONVIDADO (nunca o terceiro)
    ↳ pós auto-login, a sessão é     do convidado (o cookie É substituído)
(a) 200 created · (b) 409 useLogin · (d) 200 · (e) 200 (NÃO virou 409) ·
(f) revogado 400 / já aceito 200 alreadyAccepted
🔴 SEGURANÇA: A faz BIND no convite de B → 400, linha PENDING sem userId
Todos idênticos antes e depois, exceto o (c).
```

Humano: cenário (c) real, **sem anônima** — aviso âmbar apareceu, "Criar conta e
aceitar convite" funcionou, e terminou logado como o convidado. Bônus: reabrir o
link consumido mostrou "Convite já aceito", confirmando o (f) por acidente.

**SHA do merge:** 6510db1 · **Rollback:** `git revert -m 1 6510db1`

**Mudou em produção para quem:** ninguém perde nada — o fix só **destrava** um
caminho que antes recusava. Convidados futuros deixam de precisar de janela
anônima. Nenhum aviso a produtores é necessário.

**Ficou aberto:** ⚠️ **lacuna conhecida, baixo risco** — o botão "Sair e aceitar
como…" **não foi exercitado por humano** (o link já estava consumido quando se
pensou nele). Os dois comportamentos que ele compõe (logout · permanecer na
página do convite) foram provados isoladamente. Decisão do dono: não gerar
convite novo só para isso.

**Regras conferidas:** §17 respondido ✅ · staging-first ✅ · gate humano ✅ ·
papelada ✅

⭐ **Descoberta registrada no 9.80:** **convite NÃO EXPIRA** neste sistema —
`Collaborator` tem `invitedAt` e `acceptedAt`, sem `expiresAt`, e nenhuma rota
calcula idade. Elimina "convite expirado" de diagnósticos futuros.

## 2026-08-14 — 📌 DECISÃO REGISTRADA (não é etapa fechada) — CAMADA 4, ETAPA E4.3 criada

> ⚠️ **Esta entrada não fecha etapa nenhuma.** O diário registra fato, e o fato aqui é
> **a decisão de produto**, não uma implementação. A E4.3 nasce ⬜ pendente. Os campos do
> formato §2 que só fazem sentido para etapa executada estão marcados **n/a**.

**Estado antes:** main em e406309
**O que foi feito:** registrada a etapa **E4.3 — colaborador assistir aos cursos sem ocupar
matrícula** na Camada 4 do roadmap, com a decisão do dono e o que precisa ser investigado
antes de qualquer código.

**A decisão (13/08):**
- **Problema observado:** o colaborador com `ACCESS_MEMBER_AREA` entra na vitrine, mas os
  cursos aparecem **"Bloqueado"** e o player recusa. **Isso é desenho, não bug** — aula
  exige matrícula, decisão registrada no 9.77. Caso real: a colaboradora do `shop-club`
  precisa conhecer o conteúdo para dar suporte.
- **(A) ADOTADO AGORA:** matricular o colaborador (Vitalício). Já funciona hoje, é o
  caminho existente, e é o que **5 dos 12** colaboradores já fazem.
- **(C) REJEITADO:** incluir aulas no `ACCESS_MEMBER_AREA`. Colapsaria duas decisões
  diferentes numa permissão só — exatamente o erro do 9.76, agora na direção do dinheiro.
- **(B) FUTURO, com laudo antes:** permissão própria (`WATCH_COURSES`).

**Arquivos tocados:** docs/ROADMAP-EXECUCAO.md · docs/DIARIO-EXECUCAO.md — zero código
**Como foi provado:** n/a — nada foi implementado; a decisão vem do dono
**SHA do merge:** n/a (commit direto na main, só docs) · **Rollback:** `git revert` do commit
**Mudou em produção para quem:** ninguém
**Ficou aberto:** **E4.3** (⬜, prioridade 🟢 — o caminho A já atende). ⚠️ **A pergunta que
trava o (B):** colaborador com acesso por permissão **conta como aluno?** Impacta 5 pontos —
total de alunos do dashboard · **limite do plano (faturamento)** · analytics de engajamento ·
CSV de alunos · automações que disparam por matrícula. Palpite do dono: **não** deve contar;
mas é decisão de negócio e exige laudo do impacto em cada ponto antes de implementar.
**Regras conferidas:** §17 n/a (zero código) ✅ · staging-first n/a ✅ · gate humano n/a ✅ ·
papelada ✅

## 2026-08-14 — CAMADA 0, ETAPA E0.3 — Elenco completo do staging

**Estado antes:** main em 2b98ff2 · staging com 11 users, 1 workspace, 1 curso, 1 grupo

**O que foi feito:** criado `scripts/seed-staging.mjs` (idempotente, versionado) e
executado: **2º workspace** completo (`workspace-b-staging`, dono próprio, curso,
comunidade, aluno matriculado, 1 post), **2º curso no workspace A**
(`curso-teste-2`, para a persona de escopo restrito ter o que restringir), e as
**8 personas que faltavam**. O palco passa de 11 para **19 users** e de 1 para
**2 workspaces** — é o que torna qualquer teste cross-tenant real e destrava a
Camada 5 (9.74).

**Arquivos tocados:** scripts/seed-staging.mjs (novo) · docs/DIARIO-EXECUCAO.md ·
docs/ROADMAP-EXECUCAO.md — **zero código de produção**

**Como foi provado:** prova dupla de `SUPABASE_REF` em toda operação (staging
confirmado, produção abortaria); seed rodado **3×** até convergir sem erro
(idempotência real, não presumida); verificação final por SELECT com papel,
permissões, escopo, workspace e matrícula de cada persona; `auth.users` **19 ×
19** Prisma, zero órfão.

**SHA do merge:** commit direto na main — só docs + script de seed
**Rollback:** o staging é recriável pelo próprio seed; `git revert` do commit

**Mudou em produção para quem:** ninguém — nenhuma escrita em produção, nenhuma
linha de código de produção.

**Ficou aberto:** E0.1 (⏸️ aguardando ação do produtor) · E0.2 (avisos §21).

**Regras conferidas:** §17 respondido ✅ · staging-only ✅ · gate humano n/a ✅ ·
papelada ✅

### 📋 ESTADO DO PALCO (registrado aqui porque estado só na conversa se perde)

**Workspace A — `staging-teste`** (dono `producer-staging@staging.test`)
- Cursos: `curso-teste` (comunidade ON, grupo `Geral`/READ_WRITE) · `curso-teste-2` (novo)
- ⚠️ **`curso-teste` com as DUAS moderações LIGADAS** (`communityModerationEnabled` e
  `lessonCommentsModerationEnabled`) — ligadas de propósito no 9.68: sem elas toda
  sonda de moderação passa vazia. Comentário novo nasce PENDING; **não é bug**.
- ⚠️ **Cores do membro NULAS** — o 9.73 usou cores berrantes para a prova e as
  restaurou. Quem for testar tema precisa setá-las de novo (1 chamada na tela
  Personalizar).

**Workspace B — `workspace-b-staging`** (dono `dono-b@staging.test`)
- Curso `curso-b` (comunidade ON, grupo `Geral`/READ_WRITE, 1 post do dono)
- `aluno-b@staging.test` matriculado ACTIVE

**Elenco (19 users, senha `Staging@2026!`):**

| persona | papel |
|---|---|
| `producer-staging` | DONO do A |
| `dono-b` | **DONO do B + colaborador no A** `[MANAGE_COMMUNITY, VIEW_ANALYTICS]` — o retrato do `applyfybr`, persona-alvo do 9.74 |
| `admin-staging` | **ADMIN de plataforma** |
| `colab-duplo` | **colaborador nos DOIS** — A `[REPLY_COMMENTS]` · B `[MANAGE_COMMUNITY]` |
| `colab-escopo` | `[MANAGE_STUDENTS, MANAGE_LESSONS]` com **escopo restrito a 1 curso** |
| `colab-students` · `colab-lessons` · `colab-automations` | uma permissão isolada cada |
| `colab-dash` · `colab-analytics` · `colab-comunidade` · `colab-reply` | uma permissão + `ACCESS_MEMBER_AREA` |
| `colab-modonly` | `[MANAGE_COMMUNITY]` **sem** `ACCESS_MEMBER_AREA` (a célula ⭐ do 9.78) |
| `colab-zero` | `[]` — nenhuma permissão |
| `aluno-staging` · `aluno-b` | matriculados em A e B |
| `faxina-teste-1/2/4` | alunos matriculados em A (legado de sessões anteriores) |

**⚠️ Semeado FORA do caminho real** (não há rota, e está marcado no script):
`Subscription` EXEMPT dos produtores novos (é checkout de verdade) · `role=ADMIN`
do `admin-staging` (nenhuma rota promove a ADMIN de plataforma). Todo o resto —
registro, workspace, curso, convite, aceite, matrícula, post, escopo por PATCH —
passou pelas rotas reais.

## 2026-08-14 — CAMADA 0, ETAPA E0.4 — Sistema de documentação de execução

**Estado antes:** main em 76c9b58
**O que foi feito:** criados docs/ROADMAP-EXECUCAO.md (mapa de execução: 8
camadas, 26 etapas, ritual por etapa, Matriz de Regressão Padrão) e
docs/DIARIO-EXECUCAO.md (registro cronológico obrigatório por etapa);
CLAUDE.md passou a apontar os dois como leitura de início de sessão, com o
procedimento de recuperação de contexto.
**Arquivos tocados:** docs/ROADMAP-EXECUCAO.md · docs/DIARIO-EXECUCAO.md ·
CLAUDE.md
**Como foi provado:** integridade do roadmap conferida (346 linhas, primeira e
última linha, delimitador não vazado); diário com 0 entradas reais fora do
bloco de formato (confirmado por awk rastreando as cercas de código);
+386/−0, nenhum vizinho tocado.
**SHA do merge:** a7e302a (commit direto na main — só documentação)
**Rollback:** git revert a7e302a
**Mudou em produção para quem:** ninguém — documentação apenas.
**Ficou aberto:** E0.1 (fechar incidente PP com evidência), E0.2 (avisos §21 a
3 produtores), E0.3 (elenco de staging incompleto: faltam personas
MANAGE_STUDENTS/MANAGE_LESSONS/MANAGE_AUTOMATIONS, escopo restrito, ADMIN,
dono-de-outro-ws, colaborador de 2 ws, e um 2º workspace).
**Regras conferidas:** §17 respondido ✅ (só docs, risco nulo) · staging-first
n/a ✅ · gate humano ✅ · papelada ✅

> ⏱️ Datas deste diário em **UTC**. O commit `a7e302a` aparece como 2026-08-13T22:03-03:00
> no `git log` (fuso local) — é o mesmo instante. Convenção registrada aqui para a linha do
> tempo não parecer furada quando cruzada com o repo.

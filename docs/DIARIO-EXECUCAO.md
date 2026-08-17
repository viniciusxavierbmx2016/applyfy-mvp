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

## 2026-08-17 — CAMADA 3, ETAPA E3.5 — Telas de acesso e dias (9.60 · 9.57c)

**Estado antes:** main em `c359735` · 3 cópias do mesmo `onChange`, `expiresAt` sem validação

**O que foi feito:** o campo "Personalizado" de dias de acesso foi **redesenhado** (`type="text"`
com normalização própria, helper único nos 3 modais) e o servidor ganhou a validação que não
tinha (`expiresAt` com formato, futuro e teto). ⚠️ Foram **3 rodadas** até a causa completa —
duas correções minhas foram descartadas ou consertadas pelo caminho.

**Arquivos tocados:** `src/lib/days-input.ts` (novo) · `src/lib/validations.ts` ·
`enroll-student-modal.tsx` · `send-access-modal.tsx` · `edit-access-modal.tsx`

**Como foi provado:**
- **Simulação 16/16** com o helper **transpilado do fonte** (não uma cópia): `"30.5"` e `"30,5"`
  → **31 nos dois modelos de locale** · backspace esvazia e resolve para `null` · `"0"`→1 ·
  `"999999"`→36500 · `"abc"`→null · `"30,5,7"`→31 · blur de `"30,"`→`"30"`.
- **Sondas de servidor**: 9999 → **400** · passado → **400** · lixo → **400** · `null` → **200**
  gravando NULL · 90 dias → **200**. Nenhuma matrícula real alterada (as inválidas dão 400).
- **Gate humano 6/6 nos TRÊS modais**, com salvamento real: `30.5`→31 · `30,5`→31 · backspace
  esvazia (`value=""` conferido no DOM) e o botão trava com o motivo · campo limpo + `45`→45 ·
  Vitalício sem data e 90 dias com "Expira em 90d" · prévia não aparece com campo vazio.

**SHA do merge:** `e26e312`  ·  **Rollback:** `git revert -m 1 e26e312`

**Mudou em produção para quem:** **produtor**, nos 3 modais de acesso. O campo perde as setas
nativas (é `type="text"` agora) e ganha: aceitar `,` **e** `.`, esvaziar com backspace, e travar
o envio quando vazio. Aluno não sente nada — o que muda é o prazo passar a ser o que o produtor
digitou. Ninguém a avisar.

**Ficou aberto:** nada desta etapa.

**⚠️ TRÊS ERROS MEUS, REGISTRADOS PORQUE SÃO O APRENDIZADO DA ETAPA:**
1. **Modelo de locale errado.** Meu relatório de investigação afirmou que a **vírgula** era o
   caso quebrado e o ponto funcionava. É o **inverso** em pt-BR. Simulei em en-US **sem declarar
   a locale** e apresentei como medição. O agente de navegador mediu certo.
2. **Regressão introduzida e corrigida na mesma etapa.** A 1ª correção ("vazio preserva o
   anterior") tornou **impossível esvaziar o campo** — `value` controlado por número redesenha o
   valor antigo. Consertei o reset-para-1 e criei um campo que não limpa.
3. **A "solução óbvia" era 9× pior.** Bloquear a digitação do separador leva `"30.5"` a **305**
   em vez de 31, porque os dígitos vizinhos colam. Descartada **com número na mão**, e o porquê
   ficou no código.

⚠️ **A evidência de 12/08 do 9.60 (`30.5 → 15`) só faz sentido em locale en-US e NÃO foi
reproduzida em pt-BR** — fica marcada no item como **dado a reabrir, não a confiar**.

**Regras conferidas:** §17 respondido ✅ · helper único, sem 4ª cópia ✅ · servidor com a mesma
régua do client (`MAX_ACCESS_DAYS` compartilhado) ✅ · gate humano ✅ · papelada ✅

---

## 2026-08-16 — CAMADA 3, ETAPA E3.2 — "A interface que mente" (9.86 · 9.85 · 9.94)

**Estado antes:** main em `98af3ae` · 26 implementações locais de `showToast`

**O que foi feito:** criada a **régua** de aviso (`useToast` + `mensagemDeErro`), adotada em 1
tela, e consertados os dois pontos onde a tela mentia sobre a causa: o botão de convite que não
dizia por que estava travado, e a home do aluno que traduzia "não consegui carregar" como "você
não comprou nada". **O grupo encolheu de 5 para 3 itens** — ver abaixo.

**Arquivos tocados:** `src/hooks/use-toast.tsx` (novo) ·
`src/app/producer/settings/collaborators/page.tsx` · `src/app/(dashboard)/page.tsx`

**Como foi provado:**
- **A régua com 4xx reais**: `400 {"error":"Selecione ao menos uma permissão"}` e
  `409 {"error":"Já existe um convite ativo para este e-mail"}` — e o humano confirmou por
  **interceptação de fetch** que a UI exibe **exatamente** a string do servidor.
- **9.94, os dois estados**: aluno logado → **200 + 1 curso** (o empty-state nem aparece) · sem
  sessão → **401** → *"Não foi possível carregar seus cursos"*. Antes os dois caíam no mesmo
  texto.
- **Regressão dos toasts não migrados**: 3 telas conferidas mantendo `showToast` local; na tela
  migrada, **6 chamadas preservadas e 0 implementação local restante**.
- **Gate humano**: as três réguas com texto exato, frase e `disabled` medidos **juntos** em cada
  transição · `PATCH → 200 + status REVOKED + toast` alinhados (nada de toast verde sobre chamada
  morta) · aluno vê os cursos com `hasAccess` true / `isStaffViewer` false, e a ausência de "não
  está matriculado" testada por **regex no `innerText`**.

**SHA do merge:** `c088eb3`  ·  **Rollback:** `git revert -m 1 c088eb3`

**Mudou em produção para quem:** **produtor** — o botão de convite agora diz o que falta, e o
erro de convite traz a frase do servidor em vez de "Erro ao salvar". **Aluno** — só se a home
falhar ao carregar: em vez de "você não está matriculado", lê "não foi possível carregar" com
"Tentar de novo". Caminho feliz **idêntico**. Ninguém a avisar.

**Ficou aberto:** **9.106** (adoção nas 25 telas restantes) · **9.107** (82 candidatos a erro
engolido — ⚠️ **triar antes de virar fila**).

**⭐ O GATE HUMANO ACHOU UM DEFEITO NA MINHA RÉGUA — o achado mais valioso da etapa:**
o roteiro que escrevi para o 9.85 **passava por VACUIDADE**. O modal abre com
`ACCESS_MEMBER_AREA` **já pré-marcada**, então "ao menos uma permissão" já está satisfeita na
abertura — o estado 2 nunca era exercitado, e o roteiro passava sem testar nada.
**Roteiro corrigido: "digite o e-mail E DESMARQUE a permissão que vem marcada".**
⚠️ Uma régua que passa sem exercitar o caminho é **pior que régua nenhuma**: dá falsa confiança.

**⚠️ O GRUPO ENCOLHEU — dois itens saíram, e por motivos diferentes:**
- **9.90 → FANTASMA.** Já estava consertado desde `d5414b7` (**07/08**), **uma semana antes de o
  item nascer**. Veio de relato de QA não conferido contra o repo. E eu piorei: no E3.0 escrevi
  *"o servidor responde 403 e a tela engole"* a partir de **sonda de API sem abrir o client** —
  metade medida, metade afirmada.
- **9.79 → fora do grupo.** A mentira é do **SERVIDOR**, não da tela: *"Não matriculado neste
  curso"* é frase **verdadeira e irrelevante** quando a causa é `ACCESS_MEMBER_AREA` revogada.
  Fix no servidor, teste outro, 3 rotas. Não compartilha nada com a família.

**⚠️ Resíduo deliberado no palco:** `qa-revogar-e30@staging.test` (status `REVOKED`) **fica** —
é o cenário que o **9.83** vai precisar. O elenco não foi tocado (12 ACCEPTED intactos).

**Regras conferidas:** §17 respondido ✅ · reuso do molde (`use-confirm`, `animate-fade-in-up`)
✅ · adoção contida com prova por tela ✅ · gate humano ✅ · papelada ✅

---

## 2026-08-16 — CAMADA 3, ETAPA E3.1 — CVEs: 4 dos 5 HIGH fechados (9.101)

**Estado antes:** main em `b1936ba` · `npm audit` com 5 HIGH e 2 moderate

**O que foi feito:** bump de 4 dependências em **3 commits granulares** — `nanoid` 3.3.12→3.3.18
e `brace-expansion` 5.0.6→5.0.9 (transitivas) · `postcss` 8.5.14→8.5.26 · **`next` 16.2.6→16.2.12**,
que fecha os **9 advisories** do framework, entre eles o **bypass de middleware/proxy no App
Router** — a camada onde vivem o `proxy.ts` e o origin lock. O `sharp` **não fechou** e virou
item próprio.

**Arquivos tocados:** `package.json` · `package-lock.json` — **zero arquivo de código**.

**Como foi provado:**
- **Build verde após CADA bump**, não só no fim — commit granular só vale se cada degrau for
  válido sozinho.
- **Matriz de Regressão Padrão 21/21** com `.next` **apagado** antes de subir o palco (bump de
  framework exige recompilar do zero, senão se mede o build velho).
- **Superfícies específicas de cada pacote**: `next` → webhook responde 200 · gate sem sessão
  401 · middleware intercepta 307 · rota protegida redireciona. `sharp` → upload grava, serve, e
  o **otimizador `/_next/image` responde 200**. `postcss` → `.course-customized` presente e
  `--member-*` compiladas no CSS **servido** (169 KB), não no fonte.
- **Gate humano** no palco `e2ad8f9`: painel completo com console limpo · editor de aulas ·
  caminho do `sharp` ponta a ponta (objeto real no Storage, `200/image/png/4209 bytes`, persiste
  após reload) · área de membro **pelo gate de matrícula** (`hasAccess` true, `isStaffViewer`
  false, sem banner de staff), com **15 posts por canal na API e 15 no DOM** após esgotar o
  "Carregar mais".

**SHA do merge:** `29368ab`  ·  **Rollback:** `git revert -m 1 29368ab` (+ `npm ci` para
restaurar o lock)

**Mudou em produção para quem:** ninguém deveria sentir nada — é bump de dependência sem
mudança de código. O que muda é o **risco**: o bypass de middleware/proxy deixa de existir.

**Ficou aberto:** **9.105** 🔴 — o `sharp`.

**🔴 O `sharp` e por que ele NÃO fechou:** `next@16.2.12` exige `sharp@^0.34.5`; o advisory pede
`>=0.35.0`. **Não há conserto dentro do range que o Next declara.** A exposição foi **medida, não
assumida**: `next.config` otimiza imagens de `*.supabase.co` — onde vivem os uploads de usuário —
e 34 arquivos usam `next/image`, então imagem de aluno passa pelo libvips. Atenuante: desde o
9.87 o upload valida por **magic bytes**, então só entra imagem real — atenua, não fecha.
**Decisão do dono: esperar**, com check periódico. Forçar `overrides` trocaria risco **medido**
por risco **desconhecido** no pipeline de imagem de 22 mil alunos.

**⚠️ TRÊS RESSALVAS HONESTAS, registradas porque somem fácil:**
1. **A recompressão pelo `sharp` NÃO foi provada.** No teste ponta a ponta os bytes saíram
   **idênticos à origem** — o arquivo não foi re-encodado. Provou-se que o caminho não quebrou,
   **não** que o sharp processou.
2. **O player não fechou.** Monta, escolhe `youtube-nocookie`, passa `origin` correto, faz
   handshake com a IFrame API e lê metadados — mas parou em buffering no Chrome automatizado,
   com **zero requisições a `googlevideo`**. É camada de mídia do ambiente, não o código. Fica
   como o único item da matriz que **nenhuma automação fecha** — precisa de olho humano.
3. **RP6 acusou 🔴 e era artefato meu**: escolhi `integrations/status` achando ser owner-only —
   é `requireStaff()` e devolve `{"connected":false}`, sem segredo. Refeito em `applyfy-tokens` e
   `hubla-secrets` → **403**. O `git diff main -- src/` vazio já provava que não podia ser
   regressão.

**Regras conferidas:** §17 respondido ✅ · commits granulares com build por degrau ✅ · `.next`
limpo antes de medir ✅ · gate humano ✅ · papelada ✅

---

## 2026-08-16 — CAMADA 3, ETAPA E3.0 — Fidelidade do elenco de staging (9.91 + 9.93)

**Estado antes:** main em `66a80e4` · staging com 19 users, 5 posts, 1 grupo por curso

**O que foi feito:** o elenco passou a **espelhar produção** e ganhou a persona que faltava.
Além do caso conhecido, foi feita uma **varredura sistemática**: para cada coluna anulável de
`User`, `Enrollment`, `Collaborator`, `Workspace` e `Course`, mediu-se quantos registros REAIS
de produção têm nulo — e onde produção tem **0 de N**, o staging não pode ter. Também foi
montado o **palco** que os grupos seguintes exigem.

**Arquivos tocados:** `scripts/seed-staging.mjs` (único; +~90 linhas) — dados de teste, zero
código de produção.

**Como foi provado:**
- **Varredura de fidelidade:** `User.workspaceId` foi a **única** divergência em ~89 colunas
  anuláveis analisadas (produção **0/22.449** nulos · staging 1/5). Corrigida. ⭐ O item 5 do
  comando perguntava se havia outros: **não havia** — resposta negativa, mas medida.
- **Semântica confirmada antes de escrever:** em produção, `workspaceId` == workspace do curso
  matriculado em **24.022 de 24.436** pares (98,3%); os 414 restantes são aluno com curso em
  outro ws, normal em multi-workspace. A regra é *"o workspace onde o aluno entrou"*.
- **`sem-vinculo@staging.test` criado pela ROTA PÚBLICA** (`register-producer`, 201) e conferido:
  `ws=0 cursos=0 matrículas=0 colaborações=0`, login OK.
- **Idempotência:** seed rodado **2×**; a segunda convergiu inteira ("já existia" em todas as
  linhas), com contagens idênticas e zero duplicata.
- **Palco:** 2 grupos × **14 posts APPROVED** cada (o "Carregar mais" existe) + **1 PENDING por
  grupo** + 3 comentários PENDING + 1 convite REVOKED.

**SHA do merge:** `b1936ba` (commit direto na main — só dados de teste e seed)  ·  **Rollback:** o seed é idempotente e versionado

**Mudou em produção para quem:** ninguém. Só staging.

**⚠️ TRÊS ACHADOS QUE O COMANDO NÃO PREVIA:**
1. 🔴 **3 órfãos em `auth.users`** (`aluno-b-qa-storage`, `aluno-b2`, `sem-vinculo`) — restos dos
   meus próprios testes. **Apagar a linha do Prisma não apaga o usuário do Supabase Auth.** O
   órfão muda o ramo do `register-producer` ("email já cadastrado") e envenena o teste seguinte.
   Removidos; **o seed agora confere `auth.users × Prisma` no fim** e denuncia órfão.
2. ⚠️ **A moderação está LIGADA no `curso-teste`**, então os 26 posts semeados nasceram
   `PENDING` — o aluno via **4**. Semear sem aprovar teria entregue um palco onde o 9.48 é
   **intestável**. O seed passou a aprovar pelo caminho real da moderação, **deixando 1 PENDING
   por grupo de propósito** (que é o palco do 9.90).
3. ⭐ **O 9.90 é bug de CLIENTE, não de servidor** — provado ao montar o palco: o servidor
   responde **403 com `{"error":"Post aguardando aprovação"}`**, mensagem correta e específica.
   Quem engole é a tela. Isso **estreita o item** e muda onde procurar.

**O ELENCO (handoff de QA — papel + permissões + escopo + o que DEVE e NÃO DEVE alcançar):**

| persona | papel | permissões | escopo | matrícula | DEVE alcançar | NÃO deve |
|---|---|---|---|---|---|---|
| `producer-staging` | DONO `staging-teste` | — | — | — | tudo do ws A | ws B |
| `dono-b` | DONO `workspace-b-staging` **+ colab no A** | A:`MANAGE_COMMUNITY,VIEW_ANALYTICS` | todos | — | tudo do B · moderação e analytics do A | conteúdo/alunos do A |
| `admin-staging` | ADMIN plataforma | — | — | — | tudo | — |
| `aluno-staging` | STUDENT | — | — | `curso-teste` ACTIVE | curso A, comunidade A, materiais A | qualquer coisa do B |
| `aluno-b` | STUDENT | — | — | `curso-b` ACTIVE | curso B | **publicar no A (403)** |
| `faxina-teste-1/2/4` | STUDENT | — | — | `curso-teste` ACTIVE | igual ao `aluno-staging` | ws B |
| `colab-comunidade` | colaborador | `MANAGE_COMMUNITY,ACCESS_MEMBER_AREA` | 1 curso | — | moderar e entrar na comunidade | dinheiro, alunos, aulas |
| `colab-modonly` | colaborador | `MANAGE_COMMUNITY` **sem** `ACCESS_MEMBER_AREA` | 1 curso | — | fila de moderação | **entrar na área de membros** |
| `colab-reply` | colaborador | `REPLY_COMMENTS,ACCESS_MEMBER_AREA` | 1 curso | — | responder comentários | excluir post alheio |
| `colab-lessons` | colaborador | `MANAGE_LESSONS` | todos | — | editar aulas e materiais | dinheiro, comunidade |
| `colab-students` | colaborador | `MANAGE_STUDENTS` | todos | — | matricular/exportar alunos | dinheiro, aulas |
| `colab-dash` | colaborador | `VIEW_DASHBOARD,ACCESS_MEMBER_AREA` | 1 curso | — | KPIs de receita | relatórios, gestão |
| `colab-analytics` | colaborador | `VIEW_ANALYTICS,ACCESS_MEMBER_AREA` | 1 curso | — | engajamento/progresso | **dashboard financeiro** |
| `colab-automations` | colaborador | `MANAGE_AUTOMATIONS` | todos | — | automações | resto |
| `colab-escopo` | colaborador | `MANAGE_STUDENTS,MANAGE_LESSONS` | **1 curso só** | — | só o curso do escopo | **o outro curso do mesmo ws** |
| `colab-duplo` | colaborador nos **2** ws | A:`REPLY_COMMENTS` · B:`MANAGE_COMMUNITY` | todos/todos | — | o que cada ws dá | trocar poder de um ws no outro |
| `colab-zero` | colaborador | **nenhuma** | 1 curso | — | **nada além de existir** | tudo |
| `colab-revogado` | convite `REVOKED` | `REPLY_COMMENTS` | todos | — | **nada** | tudo |
| ⭐ `sem-vinculo` | PRODUCER sem nada | — | — | — | **NADA** — é o atacante padrão | tudo |

⚠️ **A coluna "NÃO deve" é o ponto da tabela.** Sem ela, um handoff descreve o vínculo e não o
poder — foi assim que `dono-b` virou "IDOR cross-tenant confirmado" que não existia.

**ESTADO DO PALCO:**
```
curso-teste      comunidade=ON  moderação: comunidade=ON  aulas=ON   ← as duas LIGADAS de propósito
curso-teste-2    comunidade=ON  moderação: off/off
curso-b          comunidade=ON  moderação: off/off
grupo curso-teste/geral            READ_WRITE  14 posts visíveis  (+1 PENDING)
grupo curso-teste/turma-avancada   READ_WRITE  14 posts visíveis  (+1 PENDING)
grupo curso-b/geral                READ_WRITE   1 post
comentários PENDING: 3 · convites REVOKED: 1 · auth.users=20 = Prisma=20
⚠️ cores do membro NULAS no curso-teste (o `.course-customized` não entra)
```

**Ficou aberto:** nada desta etapa. O 9.90 fica **mais preciso** (é client-side) para o E3.2.

⚠️ **Falso positivo registrado na validação por agente:** a contagem de posts do palco foi feita
por **padrão de texto** ("Post de palco N") e acusou faltando — porque há posts semeados fora
desse padrão. **Contar pela API, não pelo DOM nem por regex de conteúdo**: o número certo veio de
`/api/posts?courseSlug=…` (15 por canal), e o DOM confirmou 15 após esgotar o "Carregar mais".
Sonda que depende do texto do seed quebra assim que alguém posta fora do molde.

**Regras conferidas:** prova dupla de `SUPABASE_REF` em todo bloco ✅ · escrita só em staging ✅ ·
tudo pelo caminho real (nenhum `insert` direto para criar) ✅ · idempotência provada por 2ª
rodada ✅ · papelada ✅

---

## 2026-08-16 — 📌 REAGRUPAMENTO DA CAMADA 3 — não é etapa fechada

> Registro de trabalho de **planejamento**, não de código. Nenhum item foi consertado.

**Estado antes:** main em `4a404f2` · Camada 3 com 4 etapas (E3.1–E3.4) desenhadas quando a
fila tinha 8 itens — e ~26 itens abertos de fato.

**O que foi feito:** recap item a item **pelo PLANO-MESTRE** (não pela memória) e
reagrupamento por **afinidade real**: mesma causa, mesmo arquivo, ou mesma matriz de prova.
Resultado: **10 grupos** (E3.0–E3.9) no lugar dos 4 antigos, com ordem recomendada e o porquê
de cada posição. Tabela §8 do roadmap reescrita para refletir **grupos**, não itens soltos.

**Arquivos tocados:** `docs/ROADMAP-EXECUCAO.md` (seção Camada 3 + tabela §8) ·
`docs/PLANO-MESTRE.md` (4 itens novos + 2 remarcações)

**Como foi provado:** os 26 itens da lista foram conferidos um a um contra o PLANO-MESTRE —
**todos existem e estão abertos**, nenhum fantasma. Os três achados residuais da E2.1 foram
**medidos agora**, não copiados: `npm audit` → **5 HIGH** (`next`, `sharp`, `postcss`, `nanoid`,
`brace-expansion`, todos com fix sem *major*) · HSTS vivo → `max-age=2592000`, sem
`includeSubDomains` · rate-limit → **20 de 197** rotas.

**Mudou em produção para quem:** ninguém. Zero código.

**⚠️ O recap corrigiu quatro coisas que a lista assumia:**
1. **Os 3 achados da E2.1 não existiam como itens numerados** — viviam em prosa no roadmap.
   Viraram **9.101** (CVEs), **9.102** (HSTS), **9.103** (cobertura de rate-limit). E ⚠️ não são
   reabertura do 2.1/2.2, que estão `[x]` — são **residuais novos**.
2. **9.65 não é trabalho pendente** — o próprio item diz "APROVADO como está no ínterim" com
   validação humana de 12/08. Estava ocupando fila como se fosse conserto. Marcado `[x]`.
3. **9.82 depende do épico 9.74** — os efeitos que ele lista (`resolveStaffWorkspace`,
   `getStaffCourseIds`) são exatamente o que o épico reescreve. Movido.
4. **Os órfãos do storage não tinham número** — viraram **9.104**.

**⚠️ Grupos que a lista sugeria e a leitura REFUTOU:**
- **9.93 não é "dívida do storage"** — é fidelidade do **elenco**, e vai com o 9.91 (mesmo
  arquivo, `scripts/seed-staging.mjs`).
- **9.100 não é "polimento de UI"** — é ação manual de 10 segundos fora do código.
- **9.85 e 9.86 não são UI de colaboradores** — são da família "a interface mente sobre a
  causa", que é transversal.
- **9.64 não é família de permissões** — a causa é validação de schema, e o teste é outro.

**⭐ A decisão de ordem que contraria a intuição:** o **E3.1 (CVEs)** ficou em 2º, à frente de
todos os bugs de permissão. Motivo: o advisory do `next` é **bypass de middleware/proxy no App
Router**, e este app tem `proxy.ts` e o origin lock nessa camada. Um bypass de framework vale
mais que uma permissão larga demais concedida a gente que o produtor convidou.

E o **E3.0 (elenco)** ficou em 1º por ser o **instrumento**: um elenco enviesado já fabricou um
achado falso de segurança que custou um ciclo inteiro (9.93).

**Ficou aberto:** os 10 grupos, nenhum executado. **9.95** precisa de investigação própria
(medir custo de streaming) antes de virar faxina.

---

## 2026-08-16 — RENAME DO PROJETO — o produto passa a se chamar Members Club em tudo que se vê

**Estado antes:** main em `8906d25` · repo `applyfy-mvp` · remote local no nome antigo

**O que foi feito:** rename **de exibição**, precedido de uma investigação de risco que mudou o
escopo. Trocaram de nome: `package.json` (`"projeto"` → `"members-club"`), o README (título + 9
menções ao **produto**) e o SYSTEM-MAP, que ganhou uma seção **§0 O NOME** com a nota histórica.
O repositório foi renomeado no GitHub para **`members-club`** (1.398 commits, `main` intacta) e o
remote local atualizado. **Nada funcional foi tocado.**

**Arquivos tocados:** `package.json` · `README.md` · `docs/SYSTEM-MAP.md` (merge `69aeb23`) ·
`docs/PLANO-MESTRE.md` (docs `8906d25`) · `docs/01-knowledge-base.md` + a skill do repo (URL do
repo, nesta entrada)

**Como foi provado:**
- `git diff --name-only src/` → **zero arquivo**. Nenhuma rota, schema, env ou config no diff.
- Cada uma das 9 trocas no README verificada como **ocorrência única** antes de aplicar (troca
  ambígua abortaria o script).
- As linhas do diff que citam `APPLYFY_*`, `WorkspaceApplyfyToken` e `/api/webhooks/applyfy` são
  **todas `+` na prosa das notas novas** — coladas uma a uma na conferência.
- Os dois exemplos `SEU-APP.vercel.app` viraram `app.mymembersclub.com.br` com o **caminho da
  rota preservado byte a byte**.
- Remote novo provado por comportamento: `git fetch` + `git status -sb` em sincronia, e **este
  push** é a prova final. Redirect do nome antigo conferido: **301 →
  `github.com/viniciusxavierbmx2016/members-club`**.

**SHA do merge:** `69aeb23`  ·  **Rollback:** `git revert -m 1 69aeb23` (só texto)

**Mudou em produção para quem:** **ninguém.** Zero código, zero config, zero comportamento.

**⛔ AS DUAS DECISÕES DE NÃO-FAZER (o mais importante desta entrada):**
1. **O projeto na Vercel NÃO foi renomeado.** `applyfy-mvp.vercel.app` está **ATIVO** (Valid
   Configuration em Domains) e produtores mandam webhook de **venda** para ele — renomear
   quebraria a liberação de acesso: **o aluno paga e não recebe o curso.**
2. **O gateway Applyfy permanece INTACTO** em tudo (`APPLYFY_*`, rota, tabela, schema, telas).
   ⚠️ E o motivo não é "nome legado": é um **produto de pagamento do próprio Vinicius**,
   integrado ao Members Club. **Produtos distintos que se integram** — a coincidência de nome é
   histórica, a separação é real e permanente.

**⭐ ACHADO DE MÉTODO:** busca-e-substitui cega teria renomeado **uma PESSOA** — o handle
`applyfybr`, colaboradora do `shop-club` e persona-alvo do 9.74 — dentro da documentação do
épico, além de derrubar o gateway. Classificar **ocorrência por ocorrência** revelou que toda
menção a "applyfy" no repo é uma de **quatro** coisas, e **nenhuma é o nome do produto**: o
gateway · o hostname da origem · a URL do repositório · o handle de uma pessoa. Em `docs/` o
resultado foi **nada a renomear**.

**Confirmado na investigação (Etapa 1):** `NEXT_PUBLIC_APP_URL` de **Production e Preview** já
aponta para `app.mymembersclub.com.br` — os links de e-mail (acesso, reset, convite) estavam
corretos e não dependiam do hostname da Vercel.

**Ficou aberto:** **9.98** 🔴 (as 5 telas emitem a URL do webhook a partir de
`window.location.origin` — pré-requisito do B.2 e de qualquer rename futuro na Vercel) ·
**9.99** 🟢 (o carimbo do Cloudflare é menos confiável do que a B.1 registrava) · **9.100** 🟢
(campo "About" do GitHub).

**Regras conferidas:** §17 respondido ✅ · escopo travado provado linha a linha ✅ · build verde
✅ · papelada ✅ · nenhuma mudança funcional ✅

---

## 2026-08-14 — CAMADA 2, STORAGE PARTE 2 · PASSO 2 — Flip do bucket (o A1 fechou)

**Estado antes:** main em `2ba455d` · bucket `materials` `public=true`, sem teto

**O que foi feito:** o segundo e último passo do **A1**. Um merge de preparo (a rota do painel
deixa de devolver `fileUrl`) e, depois dele em produção, **uma chamada de config**:
`{ public: false, file_size_limit: 52428800 }`. **Material de curso não está mais em URL aberta.**

**Arquivos tocados:** `api/producer/lessons/[id]/materials/route.ts` ·
`components/lesson-materials.tsx` *(+ a config do bucket, que não é arquivo)*

**Como foi provado:**
- **O portão, antes de qualquer coisa** — `SELECT count(*) FILTER (WHERE "fileUrl" !~
  '/object/public/materials/')` → **0 de 148**. Se desse > 0, cada linha viraria "Material
  indisponível" no instante do flip. Também: 0 registro sem objeto · 148/158 idênticos à medição
  de 14/08 (nada entrou no meio).
- **Estado do bucket registrado ANTES** (é o alvo do rollback): `public=true`,
  `file_size_limit=null`.
- **Depois do PATCH, na ordem:** (a) URL pública **morreu** · (b) URL assinada serve com
  **bytes = `fileSize`** em 3 materiais (8,7 MB · 3 KB · 6 KB) · (c) rota do app **401** sem
  sessão contra **404** em rota inexistente.
- **Staging antes do merge de preparo:** painel devolve `id, name, fileName, fileSize, fileType,
  sortOrder` — sem `fileUrl`, sem `object/public` no corpo — e o aluno seguiu baixando (200 ·
  124.232 bytes).

**SHA do merge:** `71a7692`  ·  **Rollback:** `git revert -m 1 71a7692` (código) **+**
`PATCH { public: true, file_size_limit: null }` (config, uma chamada, efeito imediato)

**Mudou em produção para quem:** **13 produtores · 17 cursos · 86 aulas · 148 materiais.** O
aluno baixa igual, pelo mesmo botão. **Risco assumido pelo dono:** links públicos que alguém
tenha copiado à mão pararam de funcionar — a URL não ia por email, notificação nem export
(varredura = zero), e o material segue acessível pelo app. Ninguém a avisar.

**Ficou aberto:** **9.97** (`fileUrl` guarda URL em vez de path — dois parses por regex e um
gêmeo no DELETE) · e o **teste humano final**: baixar um material em produção como aluno.

⚠️ **A pegadinha que quase virou falso alarme:** na primeira passada da prova (a), **1 dos 3
objetos ainda devolveu 200**. Não era flip incompleto — era **cache de borda da Cloudflare**.
Furando o cache (query nova, `no-cache`, `HEAD`) veio 400, e a varredura completa deu
**148/148 mortas**. Tornar um bucket privado **não** mata a URL pública no mesmo instante para
quem a tem em cache: a exposição decai com o TTL da borda.

⚠️ **A FASE 2 ficou parada esperando uma prova que eu não conseguia fazer:** confirmar que o
merge de preparo estava publicado. Três marcadores falharam — hash de chunks (a mudança removeu
só uma *declaração de tipo*, e o bundle saiu byte-idêntico), `/login` (vinha do cache da Vercel)
e `age` do prerender (sinal, não prova); `gh` não está instalado e não há token. Quem confirmou
foi o humano, no painel. **Fica a lição: sem um marcador de deploy observável, "está em
produção?" não é pergunta que eu responda sozinho.**

**Regras conferidas:** §17 respondido ✅ · portão de inventário ✅ · rollback armado no próprio
script ✅ · prova dupla de REF ✅ · papelada ✅

---

## 2026-08-14 — CAMADA 2, STORAGE PARTE 2 · PASSO 1 — Download de material por URL assinada

**Estado antes:** main em `3587505`

**O que foi feito:** o achado **A1** (bucket `materials` público) em dois passos. Este é o
**Passo 1, só código**: rota nova que assina o material por **900s** e redireciona, e a API de
materiais deixa de devolver `fileUrl`. **O bucket segue PÚBLICO de propósito** — é o que faz o
rollback não ter janela de quebra. Entraram junto dois acertos: nome de arquivo sanitizado (o
aluno recebia `a%CC%80s` no lugar de `às`) e sinal visual no clique.

**Arquivos tocados:** `api/lessons/[id]/materials/[materialId]/download/route.ts` (novo) ·
`lib/lesson-access.ts` (novo) · `lib/materials-constants.ts` ·
`api/lessons/[id]/materials/route.ts` · `(course)/course/[slug]/lesson/[id]/page.tsx`
*(5 arquivos, não os 3 previstos: os 2 novos de `lib/` são a consequência mecânica de "reusar o
gate e o regex" — reuso exige lugar comum. Molde: `lib/ticket-access.ts`.)*

**Como foi provado:**
- **Matriz de matrícula 9/9**, com o `Enrollment` lido do banco **antes de cada sonda** e colado
  ao lado: `ACTIVE` → **302** · `CANCELLED` → **403** · `EXPIRED` → **403** · `ACTIVE` com
  `expiresAt` no passado → **403** · com `expiresAt` no futuro → **302**. Rota irmã de listagem
  **concorda nos 4 estados**. ⭐ Aluno que cancelou **não** continua baixando. Estado da persona
  restaurado idêntico ao original (`try/finally`).
- **Sondas**: material de outra aula → **404** · id inexistente → **404** · anônimo → **401** ·
  token adulterado → **400** · **TTL lido do `exp` do JWT = 900s**. Bytes baixados == `fileSize`
  do banco e idênticos aos da URL pública.
- **Controle do rollback**: a `fileUrl` pública **ainda responde 206** neste passo — é o que
  garante `git revert` sem janela.
- **Produção (leitura)**: 3 materiais reais, incluindo nome com acento e com espaço, assinam e
  entregam bytes idênticos.
- **Reprova dos acertos**: o arquivo chega ao disco como
  `Captura_de_Tela_2026-08-11_as_20.14.36.png`, **593.600 bytes**, sem nenhum `%` de encoding.
- **Gate humano 4/4** pela porta do aluno (`/w/staging-teste`): dois materiais baixaram, painel
  do produtor intacto, e link sem cookies → **401 JSON, nenhum arquivo**.

**SHA do merge:** `21e4969`  ·  **Rollback:** `git revert -m 1 21e4969`

**Mudou em produção para quem:** o aluno passa a baixar por uma rota do app em vez da URL do
objeto — o arquivo é o mesmo e o clique é o mesmo. **Muda o nome do arquivo salvo**: acento vira
letra simples e espaço vira `_` (`às` → `as`). Ninguém a avisar. O bucket **não** mudou.

**Ficou aberto:** **9.93** seed sem `User.workspaceId` · **9.94** `/api/courses` vazio silencioso
· **9.95** redirect entrega o aluno ao Supabase (e é o que resolveria o acento).
⚠️ **O Passo 2 (flip do bucket para privado + teto de 50 MB) segue 🔴 aberto** e só acontece
depois deste em **produção**, com download real validado lá.

**Duas correções de rota, registradas:**
1. A correção prescrita para o nome era **NFC**. A medição a **refutou** — NFC continua saindo
   `%C3%A0s`, porque a dupla codificação está no Storage e atinge qualquer caractere que precise
   de encoding. Entrou `sanitizeFileName`, e a mensagem do commit foi corrigida para não afirmar
   NFC (commit que diz uma coisa e código que faz outra é item-fantasma em miniatura).
2. O **"503 da signed URL" não existe** — três provas independentes no item 9.92. A causa do
   alarme foi a ausência de sinal no clique: a aba pisca e fecha (comportamento **correto** de um
   `attachment`), e o humano clicou 5×. O sinal visual entrou por isso.

**Regras conferidas:** §17 respondido ✅ · staging-first ✅ · gate humano ✅ · papelada ✅ ·
7 perguntas (2 helpers extraídos, zero abstração nova) ✅ · caminho destrutivo não tocado ✅

---

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

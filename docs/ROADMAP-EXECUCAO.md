# ROADMAP DE EXECUÇÃO — Members Club

> **O que é este documento.** O mapa de tudo que está em aberto, dividido em camadas, com
> começo, meio e fim. Diz **o que fazer, em que ordem, e como provar que nada quebrou**.
>
> **O que este documento NÃO é.** Não é o registro dos itens (isso é o `PLANO-MESTRE.md`),
> nem o plano de um épico específico (isso é o `PLANO-9.74.md`), nem a constituição
> (isso é o `DEV-BRABO.md`). Este é o **mapa de execução**.

---

## 1. Como este documento se relaciona com os outros

| Documento | Papel | Atualizado quando |
|---|---|---|
| `DEV-BRABO.md` | Constituição de engenharia. Prevalece sobre qualquer atalho. | Raramente |
| `SYSTEM-MAP.md` | Mapa do sistema (vocabulário, áreas, roteamento, estado). | Quando o código muda o mapa |
| `PLANO-MESTRE.md` | Registro por item: o que é, evidência, SHA, fechado ou aberto. | A cada item fechado |
| **`ROADMAP-EXECUCAO.md`** (este) | **Ordem de execução, camadas, portões, status.** | A cada etapa fechada |
| `DIARIO-EXECUCAO.md` | **Registro cronológico**: o que foi feito, quando, com que prova. | A cada etapa fechada |
| `PLANO-9.74.md` | Plano do épico de autorização (7 fases). | Durante o épico |

### 1.1 Procedimento de recuperação de contexto

Se a sessão virar, se o chat estourar, ou se passarem semanas — o próximo a trabalhar lê,
**nesta ordem**:

1. `CLAUDE.md` (carregador nativo — aponta o resto)
2. `DEV-BRABO.md` — as regras
3. `SYSTEM-MAP.md` — onde as coisas ficam
4. **`ROADMAP-EXECUCAO.md` § 8 (tabela de status)** — onde paramos
5. `DIARIO-EXECUCAO.md`, últimas 3 entradas — o que aconteceu por último
6. `git log --oneline -15` — o que o repo confirma

> **Nunca executar pelo resumo.** O resumo aponta; o documento manda; o código vence os dois.

---

## 2. O sistema de documentação (obrigatório)

**Nenhuma etapa fecha sem entrada no diário.** É o que impede o item-fantasma (item fechado
no código e aberto no papel, ou o contrário — as duas faces já aconteceram).

Cada entrada do `DIARIO-EXECUCAO.md` tem, sem exceção:

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

**Regra de ouro do diário:** ele registra **fato**, não intenção. Nada entra como "vai ser
feito"; só entra o que já foi.

---

## 3. O ritual de cada etapa (invariável)

Toda etapa, sem exceção, passa por estes 8 passos. Se um for pulado, a etapa não fechou.

| # | Passo | Regra DEV-BRABO |
|---|---|---|
| 1 | **Investigação read-only** — causa provada por evidência, arquivo:linha | §1, Regra de Ouro |
| 2 | **Bloco §17 respondido por escrito** — tamanho, risco técnico, risco de segurança, regressão, dependências, branch, rollback, prova de funcionamento, prova de segurança | §17 |
| 3 | **Sinuca** — mapear todos os consumidores e irmãos antes de tocar em um | §15 |
| 4 | **Branch própria**, commits pequenos e semânticos, gate encadeado `build && commit` | §18 |
| 5 | **Validação em STAGING** — matriz de personas antes/depois, com controles positivos **e** negativos, mais a Matriz de Regressão Padrão (§4) | §16 |
| 6 | **Gate humano estrutural** — o comando de merge exige o campo `RESULTADO DO CHECK HUMANO` preenchido; vazio = não executa | — |
| 7 | **Merge `--no-ff`** + SHA de rollback registrado | §18 |
| 8 | **Papelada no mesmo fôlego** — `PLANO-MESTRE` + `DIÁRIO` + memória + §21 (quem sente a mudança) | §21 |

### 3.1 Sinais de parada imediata (§22)

- Rota de credencial de pagamento ou de dono aparecendo num diff que não era pra tocá-la
- Webhook, rota pública ou player afetados
- Aparecer uma **segunda função com o mesmo nome** de um helper de autorização
- Precisar de "só um `if` pra funcionar"
- Divergência entre o que a investigação disse e o que o código mostra
- Qualquer pressão para pular a validação em staging

---

## 4. Matriz de Regressão Padrão (o "nunca quebrar nada")

Roda em **toda** etapa que toque código, independentemente do que ela mexeu. É o piso.

| # | Check | Persona | Esperado |
|---|---|---|---|
| RP1 | Login e painel abrem | produtor dono | dashboard completo, menu íntegro |
| RP2 | Curso abre e lista conteúdo | produtor dono | módulos e aulas |
| RP3 | Área de membro abre | aluno matriculado | vitrine, curso, comunidade, player |
| RP4 | Publicar e comentar | aluno matriculado | funciona como sempre |
| RP5 | Painel do colaborador | colaborador com permissões | só o que a permissão dá |
| RP6 | Telas de dono recusam | colaborador | integrações e credenciais de pagamento: 403 |
| RP7 | Página de venda | anônimo / sem vínculo | preview intacto |
| RP8 | Webhooks intocados | — | grep prova que o diff não tocou rota de webhook |
| RP9 | Build verde | — | `npm run build` exit 0 |
| RP10 | Bundle servido | — | quando o fix é de client: dev reiniciado + marcador positivo no chunk |

> **Lições que esta matriz encapsula:** dev velho serve código velho · trocar de branch
> invalida o palco · rota nunca tocada falhando = sinal de servidor · fix de CSS/JS se prova
> no bundle servido, não no fonte.

---

## 5. Infraestrutura de teste (pré-requisito de tudo)

O staging precisa do elenco completo **antes** da Camada 3. Sem ele, matriz não é confiável.

✅ **COMPLETO desde 14/08 (E0.3)** — 19 users, 2 workspaces, 3 cursos. Recriável por
`npx dotenv -e .env.staging -- node scripts/seed-staging.mjs` (idempotente). O elenco
nominal, o estado do palco e o que foi semeado fora do caminho real estão na entrada
**E0.3 do [DIARIO-EXECUCAO.md](DIARIO-EXECUCAO.md)** — este documento aponta, o diário
registra.

**Workspace A** `staging-teste` (dono `producer-staging`): `curso-teste` + `curso-teste-2`,
comunidade ON, ⚠️ **as duas moderações LIGADAS** (de propósito — sem elas a sonda de
moderação passa vazia) e **cores do membro NULAS**.
**Workspace B** `workspace-b-staging` (dono `dono-b`): `curso-b`, comunidade ON, 1 post,
`aluno-b` matriculado. É o que torna qualquer teste cross-tenant real.

**As 3 personas que o 9.74 exigia** existem: `dono-b` (dono do B **e** colaborador no A —
o retrato do `applyfybr`) · `admin-staging` (ADMIN de plataforma) · `colab-duplo`
(colaborador nos **dois** workspaces, o caso que torna o `findFirst` sem `orderBy`
indeterminado). Mais `colab-escopo`, com **escopo restrito a 1 curso**.

**Regras do palco:** prova dupla de `SUPABASE_REF` em toda escrita · conteúdo obviamente
falso · **estado do palco registrado no diário** (moderações ligadas, cores nulas, etc.),
nunca só na conversa.

---

## 6. As camadas

> Ordem por: **desbloquear pessoas → descobrir o desconhecido → consertar o conhecido →
> entregar valor → construir fundação → tornar resiliente → redesenhar.**
>
> **Regra de injeção:** achado crítico de segurança em qualquer camada **fura a fila** e vira
> etapa própria imediata. O resto entra pela ordem.

---

### CAMADA 0 — Base de trabalho
*Sem isso, o resto é chute. Nenhuma etapa toca código.*

| Etapa | O que é | Tipo |
|---|---|---|
| **E0.1** | Fechar o incidente Perfect Pay com evidência: 2× SUCCESS no log, matrículas ativas, credencial do Lazaro, ProducerTransaction. ⏸️ **VERIFICADO EM 14/08 — FAIL, aguardando terceiro**: os reenvios NÃO chegaram (`PPPB8MG3` só tem as 2 linhas ERROR de 11/08); os 2 compradores seguem sem matrícula. ⭐ Mas a integração está **provada viva**: 2 compras orgânicas pós-vínculo com SUCCESS, e o `PPPB8MG3` **está mapeado** — um reenvio agora funcionaria. Pendente: o produtor reenviar de novo | leitura |
| **E0.2** | Avisos §21 pendentes: 3 produtores (Arthur, joaodobem, orionaibr) sobre o `VIEW_ANALYTICS` deixar de abrir o dashboard | comunicação |
| **E0.3** | Completar o elenco de staging (§5) — personas faltantes + 2º workspace | escrita só em staging |
| **E0.4** | Criar `DIARIO-EXECUCAO.md` e a tabela de status (§8) deste roadmap | documentação |

**Portão de saída:** incidente fechado com PASS · produtores avisados · elenco completo
provado por SELECT · diário criado com a primeira entrada.

---

### CAMADA 1 — Desbloquear pessoas
*Gente travada agora. Prioridade sobre qualquer melhoria.*

| Etapa | O que é | Risco |
|---|---|---|
| **E1.1** | **Bug do convite** — investigação: por que o modo "Criar conta" consulta a sessão existente e recusa com "o e-mail da sua sessão não corresponde". Hipóteses: validação aplicada no ramo errado · conta já existente com mensagem errada · convite expirado | leitura |
| **E1.2** | **Bug do convite** — fix + staging + merge. Provável: modo signup ignora sessão; se já houver conta, mensagem correta é "use 'Já tenho conta'" | baixo |

**Por que é urgente:** hoje só funciona em janela anônima, e ninguém sabe disso. O próximo
convidado trava. Já aconteceu com um cliente real.

**Portão de saída:** convite aceito com outra conta logada no navegador, sem anônima,
provado em staging com 2 cenários (email novo × email com conta).

---

### CAMADA 2 — Diagnóstico (descobrir antes de consertar)
*Leitura pura. Custa pouco e reordena o resto com base em fato.*

| Etapa | O que é | Tipo |
|---|---|---|
| **E2.1** | **Auditoria Segurança & Infra** — read-only: env vars e `NEXT_PUBLIC_*` · CORS e headers (CSP, HSTS) · rate limiting / anti brute-force · validação de entrada e XSS além do Zod parcial · **buckets do Storage** (o `thumbnails` é público; a rota de upload da comunidade não checa matrícula) · `npm audit` (CVEs) · Data API do Supabase ligada sem uso · RLS das tabelas novas | leitura |
| **E2.2** | **Triagem dos achados** — cada um classificado: crítico (fura a fila) · fix pequeno (vai pra Camada 3) · frente própria (vai pra Camada 6) | decisão |
| **E2.3** | **Alerta Vercel 5xx** — `/api/notifications`, 19 falhas em 5 min contra média 0/24h, `Prisma client error`. Hipótese líder: pool de conexões esgotado. Investigar logs da janela + estado do Supabase + deploys simultâneos + se a rota tem retry | leitura |

**Portão de saída:** laudo completo · cada achado com número e camada de destino · nada
crítico em aberto sem etapa própria criada.

**E2.1 executada em 14/08** (leitura pura; produção só SELECT). Voltou **melhor que o
esperado** em quase tudo — 6/6 headers, 60/60 tabelas com RLS, zero grant de `anon`, nenhum
segredo em `NEXT_PUBLIC_*`, os 8 `dangerouslySetInnerHTML` cobertos. **Dois 🔴 no Storage**,
que furaram a fila e viraram a frente **"fechar a torneira"**:

| Achado | O que é | Estado |
|---|---|---|
| **A2** | `community/upload` com `getCurrentUser()` como único gate — qualquer autenticado escrevia no bucket público, sem vínculo e sem rate-limit | ✅ **RESOLVIDO** — Storage Parte 1, merge `af28974` (item **9.87**) |
| **A1** | bucket `materials` **público e sem teto de tamanho** — material de curso em URL aberta | ✅ **RESOLVIDO** — Passo 1 (download assinado) `21e4969` (item **9.92**) + Passo 2 (flip: `public=false`, teto de 50 MB) (item **9.96**). 148/148 URLs públicas mortas |

**⇒ Os DOIS 🔴 da E2.1 estão fechados.** A auditoria não deixa nada crítico em aberto: o que
sobrou dela (rate-limit da Peça B, HSTS, `npm audit`) é Camada 3.

Itens novos que a Parte 1 gerou: **9.88** (portas irmãs do bucket gateadas por role) ·
**9.89** (rate-limit por contagem, não por peso) · **9.90** (comentário em post `PENDING`
falha em silêncio) · **9.91** (seed sem persona sem-vínculo). Os três demais achados da
auditoria — rate-limit da Peça B, HSTS e `npm audit` — seguem na Camada 3.

---

### CAMADA 3 — Faxina de bugs conhecidos
*Todos já investigados. Agrupados por área para render uma sessão cada.*

> ## ⚠️ REAGRUPAMENTO 2 — 17/08/26 (este substitui o de 16/08)
> **Motivo:** cinco grupos fechados (E3.0 · E3.1 · E3.2 · E3.3 · E3.5) **geraram seis itens
> novos** (9.104–9.109). A ordem do reagrupamento 1 não os conhece — executar por ela seria
> executar com mapa velho. A caça a fantasmas que precedeu este reagrupamento **fechou 3 itens
> sem escrever uma linha de código**.

**🔴 O que a caça a fantasmas achou (17/08) — antes de agrupar:**

| item | veredito |
|---|---|
| **9.29** | **FANTASMA** — era o **mesmo bug do A2/9.87**, com outro número. Dois números para um bug é como um fica aberto para sempre |
| **9.38** | **FANTASMA** — fechado por `ad8e016`. ⚠️ O texto do **9.48** já dizia *"o loadPosts ganhou cancelamento no 9.38"*: a prova estava no item vizinho |
| **9.26** | **FANTASMA** — `workspaces/route.ts` já usa `select` explícito, com comentário dizendo que `masterPassword` fica de fora |
| **9.3** | **encolheu** — título e produto corrigidos no rename; resta só a stack (Next 14 → 16) |
| **9.71** | **encolheu** — de 7 para 6 `isStaffViewer`; o `like:39` saiu de carona no 9.72 |
| **9.41** | **número stale** — diz "2 cursos", produção tem 6; mas 4 têm **zero** grupo (o `ensureDefaultGroup` resolve), então o caso real é **1** |

### Os grupos de hoje

| Etapa | Itens | Por que juntos | Custo |
|---|---|---|---|
| **E3.10 — A torneira do webhook** | **9.98** 🔴 | **sozinho, e primeiro**: as 5 telas emitem a URL do host navegado, então a população apontando para a Vercel **cresce todo dia**. É dívida que **acumula sozinha** | 1 sessão |
| **E3.11 — 2FA para quem tem painel** | **9.109** 🔴 | sozinho — segurança de **conta**, não de curso | ½ sessão |
| ~~**E3.4 — Recorte de payload**~~ | ~~**9.81** 🟠~~ | ✅ **FECHADA** `fcb1cbc` — sozinho de propósito: exigia mapear os consumidores no client antes, e exigiu mesmo (eram **8**, não 3) | 1 sessão |
| ~~**E3.15 — Bloco comercial no payload do curso**~~ | ~~**9.112** 🟠~~ | ✅ **FECHADA** `f34e5c1` — decisão (c): ADMIN e DONO, sem permissão nova. ⭐ Virou **leitura E escrita**: cortar só o GET apagaria preço e checkout no primeiro save do colaborador | ½ sessão |
| **E3.6 — Dívida do storage** | **9.97** · **9.104** · **9.95** | mesmo modelo e mesma área; o 9.95 (transmitir em vez de redirecionar) resolveria o acento perdido do 9.92 | 1–2 sessões |
| **E3.12 — A régua de erro, continuação** | **9.107** *(triar primeiro)* → **9.106** · **9.79** | continuação direta do E3.2: a régua existe, falta adotar e triar. O 9.79 volta aqui porque o fix é no **servidor**, mas o teste é o mesmo | 2 sessões |
| ~~**E3.7 — UI de colaboradores**~~ | ~~**9.83** · **9.84**~~ | ✅ **FECHADA** `cd4c71c` + `2c02b72`. ⚠️ O palco **não** estava pronto: faltavam 1 PENDING e 1 REVOKED-que-aceitou, sem os quais 2 testes passavam por vacuidade. ⚠️ O 9.84 **encolheu**: metade dele (scroll de página) foi **medida e refutada** | ½ sessão |
| **E3.8 — Endurecimento de infra** | **9.102** · **9.103** · **9.89** · **9.105** *(check periódico)* | mesma superfície (config + `lib/rate-limit.ts`) | 1–2 sessões |
| **E3.9 — Sozinhos** | **9.48** · **9.61** · **9.66** · **9.64** · **9.99** · **9.100** | sem família real. ⚠️ **9.100 e 9.99 não custam sessão**: um é ação manual de 10s, o outro é anotação | 1 sessão |

**Ordem recomendada e o porquê:**
1. **E3.10 (9.98)** — ⭐ **o único da fila que PIORA sozinho**. Cada produtor que configura hoje grava a URL errada, e a migração futura cresce. Risco estático perde para risco que acumula.
2. **E3.11 (9.109)** — barato e o efeito é perverso: nega 2FA a quem exporta lista de alunos com e-mail e telefone.
3. ~~**E3.4 (9.81)**~~ — ✅ fechada `fcb1cbc`. Deixou o **9.112** (E3.15), que o dono respondeu e ✅ fechou em `f34e5c1`.
4. ~~**E3.7**~~ — ✅ **COMPLETA**: 9.83 (`cd4c71c`) + 9.84 (`2c02b72`). Deixou **9.113** (slot flutuante) e **9.114** (breakpoint divergente).
5. **E3.12** → 6. **E3.6** → 7. **E3.8** → 8. **E3.9**. Depois os que nasceram da faxina: **E3.16** (9.113) · **E3.17** (9.114) · **E3.18** (9.115).

**⇒ Estimativa: 8 a 10 sessões** para o restante da Camada 3, contando que **cada grupo tende a
gerar 1 item novo** (foi a taxa observada: 5 grupos → 6 itens).

### ⚠️ TRIAGEM DOS NUNCA-TRIADOS — 17/08/26

O reagrupamento 2 apontou que a triagem da Camada 3 sempre olhou ~26 itens. **O número real de
nunca-triados era 36**, não ~24. Resultado da varredura, **item a item contra o código de hoje**:

| veredito | itens |
|---|---|
| 🔴 **FANTASMA** | **9.5** — o guard `findUnique` antes de `user.create` **já existe nas duas** rotas de convite |
| ⚠️ **ENCOLHEU** | **9.2** — o seed de contas foi feito no E3.0; resta o `storage-policies.sql`, **que não está no repo** |
| ⚠️ **CRESCEU** | **9.6** — eram 4 branches stale, hoje são **5** |
| ⚠️ **ILEGÍVEL** | **9.14** — "logo Applyfy" hoje se lê como o produto; é o **logo do GATEWAY**. Reescrever o título |
| ✅ **VIVOS confirmados** | 9.18 · 9.23 · 9.24 · 9.34 · 9.44b (cada um verificado no código, não no texto) |

**⇒ SOBEM PARA A CAMADA 3** (segurança, integridade ou rastreabilidade):

| Etapa | Item | Por quê |
|---|---|---|
| **E3.13 — Integridade da comunidade** | **9.23** 🟠 · **9.24** 🟠 | `ensureDefaultGroup` sem proteção de corrida **derruba 4 rotas com 500** quando duas requisições chegam juntas num curso sem grupo (23 cursos ainda vão criar o seu). E o comentário grava **HTML cru no banco** — hoje o render salva, mas o dado persistido não é equivalente ao do post. Mesma área, mesmo palco |
| **E3.14 — Rastro de quem mexeu no acesso** | **9.44b** 🟠 | **11 pontos escrevem `Enrollment` e nenhum registra quem foi.** O `AuditLog` existe e cobre 17 ações — nenhuma é acesso de aluno. Quem estendeu, encurtou ou removeu o acesso de um aluno pagante **não deixa rastro**. É o único item da leva com natureza de **auditoria**, e auditoria que falta só se descobre quando já era necessária |

**⇒ FRENTES, não itens** — estes não são "itens de faxina" e inflavam a fila fingindo que eram:
**9.1** (migrations não reconstroem do zero — o maior débito estrutural) · **9.58** (EPIC no
próprio título) · **9.35b** (o item já se chama "épico de shell") · **9.28 + 9.30** (juntos são o
redesenho da comunidade) · **9.53** · **9.12** (Playwright) · **9.13** · **9.15** · **9.22**.
**Tirar da contagem da Camada 3** — cada um é uma sessão inteira ou mais.

**⇒ FILA (🟢, sem urgência):** 9.3 (resta a stack) · 9.4 · 9.9 · 9.14 (após reescrever o título) ·
9.18 (código morto) · 9.21 · 9.33 · 9.34 · 9.41 (remedir: o caso real é 1, não 6) · 9.45 · 9.46 ·
9.71 (recontar: 6, não 7).

**🔴 DUAS DECISÕES QUE SÃO DO DONO — não avanço sem elas:**
1. **9.7** — a branch `feat/course-banner-carousel` está **128 commits atrás** (medido em 07/13, hoje é mais). Rebase custa caro e cresce todo dia. **Rebase agora, ou abandonar a branch?** Enquanto não se decide, o custo só sobe.
2. **9.16** — backfill de phone/CPF + `UPDATE` do preço do Plan **no banco de PRODUÇÃO**. Os scripts existem. ⚠️ É escrita em produção sobre dado de cliente: precisa de dry-run, contagem esperada declarada antes, e sua autorização explícita.

**⇒ IMPACTO NA ESTIMATIVA:** a Camada 3 tinha 8 grupos / **8–10 sessões**. Com o E3.13 e o E3.14
passa a **10 grupos / 10–12 sessões** — e isso **depois** de tirar 9 frentes da conta. Sem essa
separação, a fila parecia ter ~36 itens pequenos; na verdade tem ~20 pequenos e ~9 frentes.

**⛔ SEGUEM FORA DA CAMADA 3:** 9.65 (decidido) · 9.82 (→ 9.74) · 9.75 (bloqueado pelo 9.74).

⚠️ **E O QUE ESTE REAGRUPAMENTO NÃO COBRE:** o PLANO-MESTRE tem **~50 itens abertos**, mas a
triagem da Camada 3 sempre olhou **~26**. Os outros ~24 (blocos *Comunidade*, *QA &
Observabilidade*, *Débito*: 9.1–9.25, 9.33–9.46, 9.10–9.16) **nunca passaram por triagem** —
vivem em outras seções e podem conter fantasmas iguais aos três de hoje. **Vale uma varredura
própria antes de assumir que a Camada 3 é o que sobrou.**

**Portão de saída:** cada item com matriz própria + Matriz de Regressão Padrão + merge +
papelada.

---

### CAMADA 4 — Features pedidas por produtores
*Valor direto ao cliente, risco baixo, escopo fechado.*

| Etapa | O que é | Decisão pendente |
|---|---|---|
| **E4.1** | **Toggles em Personalizar Curso**: (a) esconder o botão flutuante de suporte (telefone/e-mail); (b) esconder o box de nome/módulos/aulas/progresso abaixo do banner | ⚠️ **CORREÇÃO (17/08, E3.7)**: este item afirmava que o toggle "resolve junto a sobreposição sobre **'Enviar convite'** e 'Responder' no mobile". **É FALSO — são DOIS widgets diferentes.** `CourseSupportWidget` (`bottom-4 right-4 z-40`) é montado **só** em `(course)/course/[slug]/layout.tsx:179` — **área do ALUNO**, e é ele o alvo deste toggle. Quem cobre o **painel do produtor** é o `SupportChatWidget` (`bottom-6 right-6 z-50`), montado em `producer-shell.tsx:34`, e "Enviar convite" é botão do modal de **colaboradores**, onde o widget do curso **nunca existe**. ⇒ **este toggle não resolve nada no painel do produtor**; aquilo é o **9.113**. |
| **E4.2** | **PDF/material para download na comunidade** — anexo em post, não imagem inline | ⚠️ **Decisão do dono:** hoje o bucket é **público** (URL = qualquer um baixa). Material de curso deve ser privado com URL assinada? E qual o teto de tamanho (hoje 5MB)? |
| **E4.3** 🟢 | **Colaborador assistir aos cursos sem ocupar matrícula** — permissão nova (ex.: `WATCH_COURSES`) que o produtor marca por colaborador. **ORIGEM (13/08):** o colaborador com `ACCESS_MEMBER_AREA` vê a vitrine, mas os cursos aparecem **"Bloqueado"** e o player recusa — **por desenho**: aula é barreira de receita, decisão registrada no 9.77. Caso real: a colaboradora do `shop-club` precisa conhecer o conteúdo para dar suporte. **DECISÃO DO VINICIUS (13/08):** caminho **(A) adotado AGORA** — *matricular* o colaborador (Vitalício), que já funciona e é o que **5 dos 12** já fazem. Caminho **(C) REJEITADO**: incluir aulas no `ACCESS_MEMBER_AREA` colapsaria duas decisões diferentes numa permissão só — o erro do 9.76, na direção do dinheiro. | ⚠️ **INVESTIGAR ANTES DE IMPLEMENTAR (B):** colaborador com acesso por permissão **conta como ALUNO?** Impacta: total de alunos do dashboard · **LIMITE DO PLANO (faturamento)** · analytics de engajamento · CSV de alunos · automações que disparam por matrícula. **Palpite do dono: NÃO deve contar** — mas é decisão de negócio e exige **laudo do impacto em cada um desses 5 pontos** antes de qualquer linha. |

**+ 9.7 — Carrossel de banner do curso** (incluído em 17/08). ⚠️ **É ITEM, não frente**: o desenho
está pronto e recuperado, o schema **já está em produção** (`Course.bannerExtra`), as dependências
já estão instaladas e os 2 componentes são **arquivos novos** (~475 linhas) que entram sem
conflito. Cabe numa sessão. **Caminho: `cherry-pick` dos 2 componentes + fiação refeita à mão** —
nem rebase (a branch é WIP nunca validado e traz migração já aplicada), nem refazer do zero
(jogaria fora 475 linhas de UI boa). ⛔ A branch `feat/course-banner-carousel` **não pode ser
apagada** até a feature existir — é a referência de desenho. Ver **9.7** e o aviso no **9.6**.


**Portão de saída:** produtor consegue usar a feature em produção; nada regrediu na tela
compartilhada.

---

### CAMADA 5 — Fundação de autorização
*O maior trabalho estrutural. Tem plano próprio.*

| Etapa | O que é | Referência |
|---|---|---|
| **E5.1** | **9.71** — laudo dos 7 homônimos `isStaffViewer`; 5 gateiam **acesso a conteúdo** (drip, automação). ⚠️ Unificar o conceito seria escalação de privilégio. Laudo por homônimo, depois fix por homônimo | pré-requisito da FASE 4 do 9.74 |
| **E5.2** | **9.74 — D1 a D5 respondidas** + **FASE 0** (inventário read-only) | `PLANO-9.74.md` §2.3 e §4 |
| **E5.3** | **9.74 — FASES 1 a 6**: primitivas (no-op) → modo sombra 7 dias → migração em 5 lotes → flip com piloto → experiência de entrada → contração | `PLANO-9.74.md` |
| **E5.4** | **9.75** — seletor de workspace / tela de escolha no login | desbloqueado pelo E5.3 |

**Portão de saída:** `applyfybr` entra no painel do `shop-club` com **exatamente** as
permissões do vínculo; telas de dono recusam; nenhum produtor perdeu nada.

---

### CAMADA 6 — Resiliência e observabilidade
*Onde o sistema para de depender de sorte.*

| Etapa | O que é | Destrava |
|---|---|---|
| **E6.1** | **Fundação de cron/jobs** — fila e execução em background | ⭐ destrava E6.3, E6.4 e as automações em massa (hoje `maxDuration 60s` corta acima de ~1000 alunos) |
| **E6.2** | **Email** — (A) retry + backoff + timeout no `sendEmail` [resolve ~90%]; (B) tabela `EmailLog` outbox. Hoje: 1 chamada Brevo, sem retry, catch engole o erro, zero log. **Pior caso: cliente paga e não recebe acesso** | — |
| **E6.3** | **9.58 — ciclo de vida da expiração**: cron D-7/D-1 (sino + email) + `ACTIVE→EXPIRED` (mata a contagem que mente — 17 hoje). Hoje o card é o **único** aviso | E6.1 |
| **E6.4** | **Prevenção Perfect Pay / gateways**: `rawPayload` completo nas linhas ERROR (⚠️ **antes**: §10 — quem lê a `WebhookLog` e mascaramento de PII) · alerta bell-first ao produtor quando venda aprovada cai sem vínculo · aviso no setup quando o token é salvo com zero vínculos · **fila retroativa** de aprovados órfãos (⚠️ §11: idempotência e replay como fundação) | E6.1 |
| **E6.5** | **Origin lock** — os 2 pré-requisitos: migrar todos os produtores com webhook na origem para o domínio; investigar por que login legítimo chega sem carimbo do Cloudflare. ⛔ **B.2 segue PROIBIDO de ligar até os dois** | — |

**Portão de saída:** venda aprovada nunca mais morre em silêncio; email tem rastro;
expiração avisa antes de cortar.

---

### CAMADA 7 — Épicos de produto
*Redesenho, com fundação pronta embaixo.*

| Etapa | O que é |
|---|---|
| **E7.1** | **Repaginada da comunidade** — nível Apple, referência Nubank. Composer, post com foto, post com legenda, respostas aninhadas (padrão Facebook), barra de grupos. ⭐ **Requisitos de fundação já registrados:** fechamento por rastreio de ponteiro (spec 9.55-A, nunca `onBlur` para desmontar) · régua `hasPostContent` nos dois lados · alvos de toque ≥44px nativos do layout, não padding a posteriori · editor respeitando as cores do produtor · barra de grupos sem `overflow-x-auto` (lição iOS PWA) |
| **E7.2** | **Campanha de varredura da plataforma** — o formato de hoje (agente explora, relatório em 3 listas: bugs / inconsistências / melhorias), aplicado área por área: comunidade · player · vitrine · checkout e webhooks · alunos · automações · lives · suporte · configurações. Cada área com palco semeado e triagem alimentando o `PLANO-MESTRE` |

---

## 7. Trilha paralela — descoberta contínua

Roda **em paralelo** às camadas, sem consumir sessão de desenvolvimento:

- Varredura exploratória com o agente de navegador, **read-only**, área por área
- Cada varredura produz 3 listas (bugs / inconsistências / melhorias)
- Triagem: crítico fura a fila · pequeno entra na Camada 3 da vez · grande vira etapa
- **Regra:** varredura em produção é **leitura pura**; escrita só em staging

---

## 8. Tabela de status

> Atualizada a cada etapa fechada. É o primeiro lugar que se olha ao retomar.

| Etapa | Estado | SHA | Data |
|---|---|---|---|
| E0.1 Fechar incidente PP | ⏸️ aguardando terceiro | — | 2026-08-14 |
| E0.2 Avisos §21 | ⬜ pendente | — | — |
| E0.3 Elenco de staging | ✅ fechada | seed versionado | 2026-08-14 |
| E0.4 Diário criado | ✅ fechada | `a7e302a` | 2026-08-14 |
| E1.1 Convite — investigação | ✅ fechada | `6510db1` | 2026-08-14 |
| E1.2 Convite — fix | ✅ fechada | `6510db1` | 2026-08-14 |
| E2.1 Auditoria Segurança & Infra | ✅ fechada | laudo + achados no §Camada 2 | 2026-08-14 |
| **Storage Parte 1** (A2 — torneira) | ✅ fechada | `af28974` | 2026-08-14 |
| **Storage Parte 2 · Passo 1** (download assinado) | ✅ fechada | `21e4969` | 2026-08-14 |
| **Storage Parte 2 · Passo 2** (flip do bucket) | ✅ fechada | `71a7692` + config | 2026-08-14 |
| E2.2 Triagem dos achados | ⬜ pendente | — | — |
| E2.3 Alerta Vercel 5xx | ⬜ pendente | — | — |
| E3.0 Elenco (9.91 · 9.93) | ✅ fechada | seed versionado | 2026-08-16 |
| E3.1 CVEs (9.101) — 4 de 5 fechados; sharp → 9.105 | ✅ fechada | `29368ab` | 2026-08-16 |
| E3.2 A interface que mente (9.86·9.85·9.94) | ✅ fechada | `c088eb3` | 2026-08-16 |
| E3.3 Predicado por role (9.72·9.69·9.88·**9.108**) | ✅ fechada | `e3d5e62` | 2026-08-17 |
| **E3.10 Torneira do webhook (9.98)** 🔴 | ✅ fechada | `d58aecb` | 2026-08-17 |
| **E3.11 2FA para quem tem painel (9.109)** 🔴 | ✅ fechada | `b58df38` | 2026-08-17 |
| **E3.4 Recorte de payload (9.81)** 🟠 | ✅ fechada | `fcb1cbc` | 2026-08-17 |
| **E3.12 Régua de erro, continuação (9.107·9.106·9.79)** | 🟡 **parte 1 fechada** — 9.79 ✅ · 9.107 Tier 1 ✅ + `fetchJson` (rede+resposta); restam 9.106 (lotes) e o padrão do Tier 3 | `6420f7d` | 2026-08-19 |
| E3.5 Telas de acesso e dias (9.57c·9.60) | ✅ fechada | `e26e312` | 2026-08-17 |
| E3.6 Dívida do storage (9.97·9.104·9.95) | ⬜ pendente | — | — |
| **E3.7 UI de colaboradores (9.83·9.84)** | ✅ **fechada** | `cd4c71c` + `2c02b72` | 2026-08-17 |
| E3.8 Endurecimento de infra (9.102·9.103·9.89·9.105) | ⬜ pendente | — | — |
| E3.9 Sozinhos (9.48·9.61·9.66·9.64·9.99·9.100) | ⬜ pendente | — | — |
| **E3.13 Integridade da comunidade (9.23·9.24)** 🟠 | 🟡 **9.23 fechado** — resta 9.24 (HTML cru) | `b29c64b` | 2026-08-20 |
| **E3.14 Rastro de quem mexeu no acesso (9.44b)** 🟠 | ⬜ pendente — **subiu na triagem 17/08** | — | — |
| **E3.15 Bloco comercial no payload (9.112)** 🟠 | ✅ **fechada** | `f34e5c1` | 2026-08-18 |
| **E3.16 Slot flutuante sem dono (9.113)** 🟠 | ⬜ pendente — nasceu do E3.7 | — | — |
| **E3.17 Padrão de tabela responsiva (9.114)** 🟢 | ⬜ pendente — nasceu do E3.7 | — | — |
| **E3.18 Contato de suporte no payload (9.115)** 🟢 | ⬜ pendente — nasceu do E3.15 | — | — |
| **E3.21 Cache do menu mente após salvar (9.118)** 🟠 | ⬜ pendente — nasceu do E3.12; **única rota com o header** | — | — |
| **E3.22 UX de permissão no editor (9.119·9.120·9.121·9.122)** 🟢 | ⬜ pendente — 4 achados do gate do E3.12 (19/08) | — | — |
| **E3.19 Moderador de live inalcançável (9.116)** 🟠 | ⬜ pendente — **pergunta de dono**; nasceu da investigação do E3.12 | — | — |
| **E3.20 Rota órfã do editor de menu (9.117)** 🟢 | ⬜ pendente — **decisão de dono** (linkar/remover/documentar); nasceu do E3.12 | — | — |
| E4.1 Toggles Personalizar Curso | ⬜ pendente | — | — |
| E4.2 PDF na comunidade | ⬜ pendente | — | — |
| E4.3 Colab assistir aos cursos | ⬜ pendente | — | — |
| E5.1 9.71 homônimos | ⬜ pendente | — | — |
| E5.2 9.74 D1–D5 + FASE 0 | ⬜ pendente | — | — |
| E5.3 9.74 FASES 1–6 | ⬜ pendente | — | — |
| E5.4 9.75 seletor | ⬜ pendente | — | — |
| E6.1 Cron/jobs | ⬜ pendente | — | — |
| E6.2 Email | ⬜ pendente | — | — |
| E6.3 9.58 expiração | ⬜ pendente | — | — |
| E6.4 Prevenção gateways | ⬜ pendente | — | — |
| E6.5 Origin lock | ⬜ pendente | — | — |
| E7.1 Repaginada comunidade | ⬜ pendente | — | — |
| E7.2 Campanha de varredura | ⬜ pendente | — | — |

Legenda: ⬜ pendente · 🔵 em andamento · ⏸️ aguardando terceiro (ação fora do nosso alcance) · ✅ fechada · ⛔ bloqueada

---

## 9. Mapa de dependências

```
E0.3 (elenco staging) ──────────► toda etapa com matriz de personas
E2.1 (auditoria) ───────────────► E2.2 ──► injeta em C3 / C6
E5.1 (9.71) ────────────────────► E5.3 FASE 4 (flip do 9.74)
E5.2 (D1–D5 + FASE 0) ──────────► E5.3
E5.3 (9.74) ────────────────────► E5.4 (9.75)
E6.1 (cron/jobs) ───────────────► E6.3 · E6.4 · automações em massa
E4.2 (PDF) ──── decisão de privacidade do bucket ────► depende de E2.1
E7.1 (repaginada) ── herda specs de 9.55-A, hasPostContent, alvos ≥44px
```

---

## 10. Como saber que terminou

O roadmap está cumprido quando, simultaneamente:

- [ ] Nenhum item 🔴 ou 🟠 aberto no `PLANO-MESTRE`
- [ ] Tabela de status (§8) sem ⬜
- [ ] `applyfybr` (e qualquer colaborador) entra no painel do workspace onde colabora com as permissões corretas
- [ ] Venda aprovada nunca morre em silêncio: alerta + fila retroativa funcionando
- [ ] Email tem retry e rastro
- [ ] Auditoria de Segurança & Infra fechada, com cada achado resolvido ou registrado com decisão
- [ ] Comunidade redesenhada
- [ ] O diário conta a história inteira, sem buraco

---

## 11. O que este plano nunca faz

- **Não sobe nada sem staging.** Sem exceção, nem para "uma linha".
- **Não mexe em webhook, rota pública ou player** fora de etapa dedicada a isso.
- **Não toca nas rotas de dono** (integrações, credenciais de pagamento) fora de etapa dedicada.
- **Não fecha item sem papelada** no mesmo fôlego.
- **Não tem prazo.** Tem portões. A etapa avança quando está provada.

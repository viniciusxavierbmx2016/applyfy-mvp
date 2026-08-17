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

> **REAGRUPADA EM 16/08/26.** A fila havia crescido de 8 para ~26 itens e virara lista, não
> plano. Os grupos abaixo substituem os quatro E3.x antigos. Critério: **mesma causa, mesmo
> arquivo, ou mesma matriz de prova** — item sem família fica sozinho, e isso é resposta válida.

| Etapa | Itens | Por que juntos | Arquivos |
|---|---|---|---|
| **E3.0 — O elenco** | **9.91** sem persona sem-vínculo · **9.93** `aluno-staging` sem `User.workspaceId` | mesmo arquivo (`scripts/seed-staging.mjs`) e mesma causa: o elenco não espelha produção | 1 |
| **E3.1 — CVEs** | os **5 HIGH** do `npm audit`: `next` · `sharp` · `postcss` · `nanoid` · `brace-expansion` (itens **9.101**) | mesmo comando, mesmo build, mesma regressão | `package.json` + lock |
| **E3.2 — A interface que mente** | **9.86** régua dos textos de erro *(primeiro — é o molde)* → **9.90** comentário em post `PENDING` falha em silêncio · **9.79** "não matriculado" quando a causa foi permissão · **9.94** vazio silencioso vira "não matriculado em nenhum curso" · **9.85** botão `disabled` sem motivo | todos são a mesma falha: **a tela não diz a verdade sobre a causa** | ~6 |
| **E3.3 — Predicado por role, cego ao vínculo** | **9.72** colaborador não curte · **9.69** `terms-status` pula aceite · **9.88** as 2 portas do bucket gateiam por role | mesma causa (`user.role` em vez do vínculo), mesmo fix, **uma matriz de personas serve às três** | 4 |
| **E3.4 — Recorte de payload** | **9.81** `videoUrl` para quem não cuida de conteúdo | **sozinho de propósito** — exige mapear os consumidores no client antes | 1 + client |
| **E3.5 — Telas de acesso e dias** | **9.57c** teto `max` divergente nos modais irmãos · **9.60** clamp por tecla come dígitos | mesma tela, mesmo teste | 3 |
| **E3.6 — Dívida de dado do storage** | **9.97** `fileUrl` guarda URL em vez de path (+ o regex gêmeo do DELETE) · **9.104** 10 objetos órfãos / 8,3 MB sem rotina de limpeza | mesmo modelo, mesma migração | 3-4 |
| **E3.7 — UI de colaboradores** | **9.83** convite revogado não reativa · **9.84** tabela estoura no mobile | mesma tela | 2 |
| **E3.8 — Endurecimento de infra** | **9.102** HSTS `max-age=2592000` sem `includeSubDomains`/`preload` · **9.103** rate-limit em **20 de 197** rotas · **9.89** rate-limit por contagem, não por peso | mesma superfície (config + `lib/rate-limit.ts`) | 2-3 |
| **Sozinhos** | **9.48** `loadMore` sem `AbortController` · **9.61** Enter no rename borbulha · **9.66** dead code em `lib/collaborator.ts` | sem família real | 3 |

**⚠️ Palco especial (semear ANTES):**
- **9.48** — 2º grupo + **~15 posts** para "Carregar mais" existir.
- **9.90** — um post em `PENDING` na fila de moderação.
- **9.83** — um convite em `REVOKED`.
- **E3.0 vem primeiro por isso:** o elenco é o **instrumento** de todas as matrizes seguintes.

**⛔ SAÍRAM DA CAMADA 3** (não são faxina):
- **9.65** — **já foi decidido**: "APROVADO como está no ínterim" com validação humana de 12/08. Não é trabalho pendente; é decisão registrada. Sai da fila.
- **9.82** (dono se autoconvida) — ⚠️ **depende do épico 9.74**: os efeitos que ele mesmo lista (`resolveStaffWorkspace`, `getStaffCourseIds`) são exatamente o que o 9.74 reescreve. Consertar antes seria consertar código que vai mudar → **move para junto do 9.74**.
- **9.95** (rota transmitir os bytes em vez de redirecionar) — o próprio item diz "custo de streaming na Vercel **a medir**". Item com medição pendente não é faxina → **precisa de uma investigação própria primeiro**.
- **9.99** (carimbo do Cloudflare pouco confiável) — é **anotação**, não conserto. Vive junto do 2.4 Peça B.
- **9.100** (About do GitHub) — **ação manual de 10 segundos**, zero código, não ocupa sessão.
- **9.64** (assimetria POST×PATCH em `permissions:[]`) — ⚠️ estava no E3.1 antigo por "família de permissões", mas a causa é **validação de schema**, não autorização, e o teste é outro. Fica **sozinho** ou entra no E3.7.

**Ordem recomendada e o porquê:**
1. **E3.0** — minutos, e **conserta o instrumento**: um elenco enviesado já fabricou um achado falso de segurança que custou um ciclo inteiro (ver 9.93).
2. **E3.1** — ⚠️ o advisory do `next` é **bypass de middleware/proxy no App Router**, e este app tem `proxy.ts` e origin-lock nessa camada. É o **maior risco residual de segurança da Camada 3** — acima do 9.81. Os 5 têm correção sem *major*, então o custo é build + regressão, não migração.
3. **E3.2** — maior **dor real hoje**: no 9.90 o aluno escreve, perde o texto e acha que enviou. Cliente pagante perdendo conteúdo ganha de exposição a colaborador convidado.
4. **E3.5** — o 9.60 faz o produtor digitar `30.5` e gravar **15 dias** de acesso. Erro silencioso que decide **por quanto tempo o aluno tem o curso**.
5. **E3.3** — 3 itens, 4 arquivos, **uma matriz só**. Melhor relação resultado/esforço da fila.
6. **E3.4** — exposição real (1.833 aulas com `videoUrl`, 3 colaboradores leem a rota sem `MANAGE_LESSONS`), mas o alcance é **gente que o produtor convidou** — o próprio item registra que "não fura a fila".
7. **E3.7** → 8. **E3.6** → 9. **E3.8** → 10. **Sozinhos**.

**Portão de saída:** cada item com matriz própria + Matriz de Regressão Padrão + merge +
papelada.

---

### CAMADA 4 — Features pedidas por produtores
*Valor direto ao cliente, risco baixo, escopo fechado.*

| Etapa | O que é | Decisão pendente |
|---|---|---|
| **E4.1** | **Toggles em Personalizar Curso**: (a) esconder o botão flutuante de suporte (telefone/e-mail) — ⭐ resolve junto a sobreposição dele sobre "Enviar convite" e "Responder" no mobile; (b) esconder o box de nome/módulos/aulas/progresso abaixo do banner | — |
| **E4.2** | **PDF/material para download na comunidade** — anexo em post, não imagem inline | ⚠️ **Decisão do dono:** hoje o bucket é **público** (URL = qualquer um baixa). Material de curso deve ser privado com URL assinada? E qual o teto de tamanho (hoje 5MB)? |
| **E4.3** 🟢 | **Colaborador assistir aos cursos sem ocupar matrícula** — permissão nova (ex.: `WATCH_COURSES`) que o produtor marca por colaborador. **ORIGEM (13/08):** o colaborador com `ACCESS_MEMBER_AREA` vê a vitrine, mas os cursos aparecem **"Bloqueado"** e o player recusa — **por desenho**: aula é barreira de receita, decisão registrada no 9.77. Caso real: a colaboradora do `shop-club` precisa conhecer o conteúdo para dar suporte. **DECISÃO DO VINICIUS (13/08):** caminho **(A) adotado AGORA** — *matricular* o colaborador (Vitalício), que já funciona e é o que **5 dos 12** já fazem. Caminho **(C) REJEITADO**: incluir aulas no `ACCESS_MEMBER_AREA` colapsaria duas decisões diferentes numa permissão só — o erro do 9.76, na direção do dinheiro. | ⚠️ **INVESTIGAR ANTES DE IMPLEMENTAR (B):** colaborador com acesso por permissão **conta como ALUNO?** Impacta: total de alunos do dashboard · **LIMITE DO PLANO (faturamento)** · analytics de engajamento · CSV de alunos · automações que disparam por matrícula. **Palpite do dono: NÃO deve contar** — mas é decisão de negócio e exige **laudo do impacto em cada um desses 5 pontos** antes de qualquer linha. |

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
| E3.4 Recorte de payload (9.81) | ⬜ pendente | — | — |
| E3.5 Telas de acesso e dias (9.57c·9.60) | ✅ fechada | `e26e312` | 2026-08-17 |
| E3.6 Dívida do storage (9.97·9.104) | ⬜ pendente | — | — |
| E3.7 UI de colaboradores (9.83·9.84) | ⬜ pendente | — | — |
| E3.8 Endurecimento de infra (9.102·9.103·9.89) | ⬜ pendente | — | — |
| E3.9 Sozinhos (9.48·9.61·9.66·9.64) | ⬜ pendente | — | — |
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

# PLANO 9.74 — Autorização por Workspace Ativo

> **Fundação de segurança e de produto.** Trocar o discriminador de autorização do painel
> de *"qual é o seu papel na plataforma?"* para *"qual é o seu papel NESTE workspace?"*.
>
> Este é o padrão de indústria (Slack, Notion, Linear, Figma, Stripe, GitHub, Google
> Workspace): **identidade é global, autorização é sempre relativa a uma organização
> ativa**. Nessas empresas não existe papel global — o papel só existe dentro de uma org.
> É por isso que você pode ser dono do seu workspace e convidado no do cliente sem risco.
>
> **Regra soberana deste plano: nada quebra.** Cada fase tem portão de entrada, portão de
> saída e plano de rollback. Nenhuma fase avança sem a anterior validada em staging e
> aprovada por humano.

---

## 0. Sumário executivo

| | |
|---|---|
| **Problema** | 29 rotas do painel autorizam por `role` global. `requirePermission` faz `if (ADMIN \|\| PRODUCER) return` — sem exigir permissão. `getStaffCourseIds` faz `if (PRODUCER) return null` — sem escopo de curso. |
| **Consequência** | Um PRODUCER que seja colaborador de outro workspace, **se chegar lá pelo painel**, passa por todos os gates sem checagem, com escopo total, ignorando as permissões do vínculo. Poder de dono em casa alheia. |
| **Estado hoje** | A porta está **fechada por acidente feliz**, não por desenho: o resolver dá vitória incondicional ao dono e nunca leva ninguém ao workspace alheio. O risco **não existe hoje** — seria **criado** por qualquer mudança que abra o resolver. |
| **Alcance medido (13/ago/26)** | 1 pessoa é dona de ws E colaboradora em outro (`applyfybr@gmail.com` no `shop-club`, 5 permissões, escopo total). 0 pessoas colaboram em mais de um workspace. **Sem fila de espera — dá para fazer certo.** |
| **Desbloqueia** | Seletor de workspace (9.75), colaborador de verdade, agência gerenciando vários produtores, co-produção, suporte terceirizado. Não é dívida técnica: é fundação de modelo de negócio. |
| **Estratégia** | *Expand → Shadow → Migrate → Flip → Contract.* Primitivas novas convivem com as antigas; modo sombra mede divergência em produção **sem alterar comportamento**; migração em lotes; só então o resolver abre. |

---

## 1. Princípios que governam este plano

Derivados do DEV-BRABO (`docs/DEV-BRABO.md`) e das lições acumuladas. Valem em **todas** as fases.

1. **§23 — Segurança e integridade antes de velocidade.** Nenhuma fase entrega "quase certo".
2. **§14 — Incremental.** Nenhum lote grande. Cada passo é revertível sozinho.
3. **§22 — Regra de parada.** Divergência inesperada = parar e reportar, nunca "dar um jeito".
4. **§8 — Defesa em profundidade.** O servidor é a parede; o client é aviso. Sempre os dois.
5. **§15 — Preservação.** Quem hoje trabalha legitimamente **não pode perder nada** sem decisão explícita e registrada.
6. **Regra de Ouro.** Causa provada por evidência antes de qualquer mudança.
7. **Sinuca.** Mapear todos os impactos antes de tocar em um.
8. **Gate humano estrutural.** Todo comando de merge exige o campo `RESULTADO DO CHECK HUMANO` preenchido; vazio = não executa.
9. **Lição das homônimas.** Antes de importar helper de autorização, conferir se existe outro com o mesmo nome e qual resolve por **vínculo** (banco) e qual por **role**.
10. **Lição do rótulo.** Texto de permissão = exatamente o que o gate faz. Nem a mais, nem a menos.
11. **Lição do dono-colaborador.** Todo gate por permissão precisa de short-circuit para ADMIN e para o **dono do workspace ativo** antes de consultar o vínculo — ou o dono perde acesso ao próprio painel.
12. **Prova dupla de banco.** Toda operação em staging usa `npx dotenv -e .env.staging` **e** imprime `SUPABASE_REF` antes de executar.

---

## 2. Modelo-alvo (o que estamos construindo)

### 2.1 Vocabulário

| Termo | Definição |
|---|---|
| **Identidade** | Quem a pessoa é. Global. Não muda ao trocar de workspace. |
| **Workspace ativo** | O workspace no contexto do qual a requisição está sendo autorizada. Uma requisição tem **exatamente um**. |
| **Papel no workspace ativo** | `OWNER` (dono), `COLLABORATOR` (vínculo aceito), `MEMBER` (matriculado), `NONE`. Calculado, nunca lido de `user.role`. |
| **Permissões efetivas** | `OWNER` → todas. `COLLABORATOR` → as do vínculo, com escopo de cursos. `ADMIN` de plataforma → todas (decisão explícita, ver 2.3). |
| **Papel global (`user.role`)** | Passa a significar **apenas**: que tipo de conta é (`ADMIN` plataforma, `PRODUCER`, `STUDENT`). **Nunca** concede autorização dentro de um workspace. |

### 2.2 A regra única

> **Autorização = função(identidade, workspace ativo, recurso).**
> `user.role` entra nessa função **somente** para o caso `ADMIN` de plataforma.

### 2.3 Decisões de desenho que precisam de veredito do Vinicius

Marcadas com **⚠️ DECISÃO** ao longo do plano. Reunidas aqui para resolver antes da FASE 1.

| # | Decisão | Opções | Recomendação |
|---|---|---|---|
| **D1** | `ADMIN` de plataforma continua passando por tudo em qualquer workspace? | (a) sim, short-circuit explícito e auditado; (b) sim, mas com log de acesso administrativo | **(b)** — mantém a operação e cria rastro. Se o custo for alto, (a) e log vira item próprio. |
| **D2** | Entrada do usuário multi-contexto | (a) tela de escolha no login (padrão Stripe); (b) entra no último contexto e troca pelo switcher (padrão Notion/Linear); (c) contexto pela URL (padrão Slack) | **(b) + (c)** — já temos `/w/[slug]` e o cookie. Tela de escolha (a) vira opção depois, sobre a mesma fundação. |
| **D3** | Colaborador vê o switcher quando só tem 1 destino? | (a) sempre visível; (b) só quando há >1 destino | **(b)** — zero atrito novo para o produtor comum. |
| **D4** | Ao entrar no workspace alheio, o painel mostra as telas que ele **não** pode usar? | (a) esconde; (b) mostra desabilitado com motivo | **(a)** para telas de dono (pagamento, colaboradores); **(b)** para telas de permissão granular. |
| **D5** | Escopo de curso do colaborador se aplica ao dono-colaborador? | (a) sim, escopo do vínculo vale sempre; (b) não, se ele for PRODUCER vê tudo | **(a)** obrigatoriamente — (b) é o bug que estamos corrigindo. |

---

## 3. Mapa de risco (o que pode quebrar, e a proteção de cada um)

| # | Risco | Impacto se acontecer | Proteção neste plano |
|---|---|---|---|
| R1 | Dono perde acesso ao próprio painel | Produtor sem operar. **Crítico.** | Short-circuit `OWNER` antes de qualquer consulta, em todas as primitivas. Persona de teste dedicada. Modo sombra mede antes. |
| R2 | ADMIN de plataforma perde acesso | Suporte cego. | D1 resolvida antes da FASE 1. Persona ADMIN em todas as matrizes. |
| R3 | Colaborador legítimo perde função que usa hoje | Trabalho parado, chamado de suporte. | Modo sombra (FASE 2) mede **quem** divergiria, com nome e workspace, **antes** de qualquer enforcement. |
| R4 | Telas de credencial de pagamento acessíveis a colaborador | Vazamento crítico. | As 24 rotas `requireWorkspaceOwner` são **congeladas**: nenhuma linha delas muda neste épico. Teste de regressão dedicado em cada lote. |
| R5 | Bypass de drip/automação (os 7 homônimos, 9.71) | Colaborador furando gotejamento de conteúdo pago. | **9.71 é pré-requisito da FASE 4** (ver 4.4). Não se abre o resolver com esse flanco aberto. |
| R6 | Impersonação/`ImpersonateToken` interage mal com contexto | Escalada silenciosa. | Inventariado na FASE 0; tratado como caminho próprio antes da FASE 4. |
| R7 | Webhooks e rotas públicas afetados | Venda não libera acesso. **Crítico.** | Webhooks **não** têm usuário: ficam fora do escopo. Verificação explícita na FASE 0 de que nenhuma rota de webhook usa as primitivas alteradas. |
| R8 | Cache/cookie carregando contexto errado entre trocas | Pessoa vê dados de outro workspace. | Contexto validado no servidor a cada requisição; cookie é **sugestão**, nunca autoridade. Teste de troca rápida na matriz. |
| R9 | Regressão silenciosa em rota migrada | Furo passa despercebido. | Matriz obrigatória por lote + modo sombra ligado durante toda a migração. |
| R10 | Perda de contexto entre sessões de trabalho | Erro humano no meio do épico. | Este documento vive no repo; cada fase fecha com papelada no PLANO-MESTRE e memória de continuidade. |

---

## 4. As fases

> **Formato de cada fase:** portão de entrada → objetivo → o que faz → o que **não** faz → prova → portão de saída → rollback.
> Nenhuma fase começa sem o portão de entrada satisfeito. Nenhuma avança sem o de saída.

---

### FASE 0 — Inventário completo (leitura pura)

**Portão de entrada:** `main` limpa; `docs/DEV-BRABO.md` e `docs/SYSTEM-MAP.md` lidos.

**Objetivo:** substituir todos os números "de memória" por fatos conferidos hoje. Nada neste plano vale sem esta fase.

**O que faz:**

1. **A matriz das rotas do painel.** Para cada rota sob `/api/producer/*` e adjacências:
   `rota · método · o que concede · gate atual (arquivo:linha) · discriminador usado · escopo de curso? · quem DEVE passar no modelo-alvo · risco (leitura/escrita/destrutivo/financeiro)`.
   Confirmar o número real (a investigação disse 29 — conferir).
2. **A lista congelada.** As rotas com `requireWorkspaceOwner` (a investigação disse 24). Estas **não mudam**; a lista existe para provar em cada lote que não mudaram.
3. **As primitivas.** Código literal de: `requirePermission`, `requireAnyPermission`, `getStaffCourseIds`, `resolveStaffWorkspace`, `getCurrentWorkspace`, `getCollaboratorContext` (todas as homônimas), `canAccessWorkspace`, `hasWorkspaceAccess`, `collaboratorCanActOnCourse`, `requireMemberPermission`, `requireStaff`.
   Para cada uma: **quem chama** (grep completo), o que decide, e se resolve por role ou por vínculo.
4. **Os consumidores de contexto.** `/api/workspaces`, `useActiveWorkspace` (as 7 telas, com as 5 de credencial de pagamento identificadas nominalmente), `WorkspaceSwitcher`, cookie `active_workspace_id`, header equivalente.
5. **Caminhos que NÃO podem ser tocados:** webhooks (todos os gateways), rotas públicas, área de membro, player. Provar por grep que não consomem as primitivas que vamos alterar. Se consumirem, isolar antes de qualquer mudança.
6. **Impersonação.** Como funciona hoje, quem pode, e como interage com contexto de workspace (R6).
7. **Os 7 homônimos `isStaffViewer` (9.71).** Laudo individual: o que concede · se colaborador deveria entrar · risco se entrar. Os 5 que gateiam conteúdo são o flanco da FASE 4.
8. **Fotografia de produção (SELECT):** colaboradores ACCEPTED e PENDING por workspace, com permissões e escopo; quem é dono e colaborador; quem colabora em >1 workspace; quantos ADMIN existem.

**O que NÃO faz:** nenhuma linha de código, nenhuma branch.

**Prova:** o documento de inventário, com arquivo:linha em cada afirmação.

**Portão de saída:**
- [ ] Matriz das rotas completa, com o número real confirmado
- [ ] Lista congelada das rotas de dono
- [ ] Todas as primitivas mapeadas com seus chamadores
- [ ] Webhooks e área de membro provados fora do escopo
- [ ] Laudo dos 7 homônimos
- [ ] Fotografia de produção
- [ ] **D1–D5 respondidas pelo Vinicius**

**Rollback:** não se aplica (leitura pura).

---

### FASE 1 — Primitivas novas, sem nenhum uso

**Portão de entrada:** FASE 0 fechada; D1–D5 decididas.

**Objetivo:** existir o modelo-alvo em código, **sem que nada o use ainda**. Deploy desta fase é um no-op comprovável.

**O que faz:**

1. `resolveActiveWorkspace(user, hint)` — resolve o workspace ativo **por vínculo**:
   dono → ok; colaborador aceito → ok; senão → recusa. O `hint` (cookie/header/arg) é **sugestão validada**, nunca autoridade. Determinístico (`orderBy` explícito — o `findFirst` sem ordenação de hoje é indeterminado).
2. `getWorkspaceRole(user, workspaceId)` → `OWNER | COLLABORATOR | MEMBER | NONE`.
3. `requirePermissionInWorkspace(user, workspaceId, permission)` — short-circuit `OWNER` e `ADMIN` (conforme D1) **antes** de consultar o vínculo; senão exige a permissão do vínculo.
4. `getCourseScopeInWorkspace(user, workspaceId)` — escopo de cursos do vínculo, aplicável **inclusive** a quem tem role PRODUCER (D5).
5. Nomes que dizem o que fazem (lição das homônimas). Nenhum nome reaproveitado de primitiva existente.
6. Testes unitários das primitivas cobrindo a matriz de papéis × permissões × escopo.

**O que NÃO faz:** não troca **nenhum** call-site. Não toca no resolver atual. Não toca em UI.

**Prova:**
- `git diff` mostra **apenas** arquivos novos (+ testes)
- grep: as primitivas novas têm **zero** chamadores em código de produção
- build verde; suíte de testes das primitivas passando
- **Prova de no-op:** matriz completa de personas em staging **idêntica** antes e depois

**Portão de saída:**
- [ ] Primitivas criadas e testadas isoladamente
- [ ] Zero call-sites alterados (provado por grep e diff)
- [ ] Matriz de staging idêntica ao estado anterior
- [ ] Validação humana: painel do produtor, do colaborador e do ADMIN inalterados

**Rollback:** `git revert -m 1` do merge. Como nada usa, o revert é trivial.

---

### FASE 2 — Modo sombra (a fase que garante que nada quebra)

> Esta é a fase mais importante do plano e a que empresas grandes usam para exatamente
> este tipo de troca. Em vez de adivinhar quem seria afetado, **medimos em produção,
> com tráfego real, sem alterar uma única decisão**.

**Portão de entrada:** FASE 1 mergeada e provada no-op.

**Objetivo:** para cada requisição real, calcular **o que o modelo novo decidiria** e registrar quando diverge do modelo atual — **sem nunca aplicar a decisão nova**.

**O que faz:**

1. Nos gates atuais, após a decisão vigente, computar a decisão nova e, **se divergirem**, registrar: rota, método, `userId`, workspace ativo resolvido, papel calculado, decisão antiga, decisão nova, permissão em questão.
   ⚠️ **§10 — sem PII em log.** Ids, não emails; nada de payload; nada de dado financeiro.
2. A decisão **aplicada** continua sendo a antiga. Sempre. Sem exceção.
3. Custo controlado: a computação sombra não pode dobrar consultas — usar o contexto já carregado na requisição; se exigir consulta nova, cachear por requisição.
4. Painel/consulta simples de divergências agregadas (por rota, por pessoa, por workspace).
5. **Kill switch por variável de ambiente**: desliga o modo sombra sem deploy.

**O que NÃO faz:** não altera nenhuma resposta, nenhum status, nenhum comportamento observável pelo usuário.

**Prova:**
- Staging: forçar divergência conhecida (colaborador dono-de-outro-ws) e ver o registro aparecer, **com a resposta inalterada**
- Produção: rodar **no mínimo 7 dias corridos**, cobrindo um ciclo semanal completo
- Métrica de saúde: latência das rotas instrumentadas sem regressão perceptível

**Portão de saída:**
- [ ] ≥7 dias de dados em produção
- [ ] Relatório de divergências: quantas, em que rotas, de quem
- [ ] **Cada divergência classificada**: (a) correção pretendida (alguém perdendo poder que não deveria ter); (b) regressão inaceitável (alguém legítimo perdendo função)
- [ ] Zero divergências do tipo (b) **ou** plano explícito para cada uma
- [ ] Zero impacto de performance
- [ ] Validação humana: comportamento do painel idêntico ao de antes

**Rollback:** kill switch (imediato, sem deploy) ou revert do merge.

> **Este portão é o coração do "não quebrar nada".** Se aparecer alguém legítimo na lista
> de divergências, a FASE 3 não começa até resolvermos o caso — seja concedendo a
> permissão certa antes, seja ajustando o desenho.

---

### FASE 3 — Migração das rotas, em lotes por risco

**Portão de entrada:** FASE 2 com portão de saída limpo.

**Objetivo:** trocar o discriminador rota a rota, em lotes pequenos, com o modo sombra ainda ligado (agora medindo o inverso: se alguma rota migrada diverge do esperado).

**Ordem dos lotes** (do menos ao mais perigoso — cada lote é branch + merge próprios):

| Lote | Conteúdo | Por que nesta ordem |
|---|---|---|
| **L1** | Rotas de **leitura** sem dado sensível | Menor impacto possível; valida o padrão de migração |
| **L2** | Rotas de **leitura com dado sensível** (analytics, alunos, exportação) | Já sabemos que exportação é PII (`MANAGE_STUDENTS`) |
| **L3** | Rotas de **escrita não destrutiva** (criar/editar conteúdo) | Erro aqui é visível e reversível |
| **L4** | Rotas de **escrita destrutiva** (excluir, revogar, remover aluno) | Erro aqui é irreversível — último e com dupla validação |
| **L5** | `getStaffCourseIds` → escopo de curso passa a valer para dono-colaborador (D5) | Mexe em recorte de dados de várias rotas ao mesmo tempo |

**Procedimento obrigatório de cada lote:**

1. Bloco §17 respondido por escrito antes de tocar no código
2. Branch própria; um commit por rota ou por grupo coeso
3. `git diff --stat` conferido: **as rotas congeladas (dono) não podem aparecer**
4. Matriz de personas em staging, **antes/depois**, com controles positivos e negativos
5. Gate humano estrutural preenchido
6. Merge `--no-ff`; papelada no PLANO-MESTRE com SHA
7. Modo sombra observado por **48h** após cada lote antes do próximo

**Personas obrigatórias em toda matriz** (seed de staging, ver §5):

- dono do workspace (controle — não pode perder nada)
- ADMIN de plataforma (controle — conforme D1)
- colaborador com a permissão da rota
- colaborador **sem** a permissão da rota
- colaborador com escopo de curso restrito
- **dono-de-outro-workspace que é colaborador aqui** (a persona-alvo do épico)
- aluno matriculado (controle — não pode ganhar nada)
- anônimo (controle — não pode ganhar nada)

**Portão de saída (por lote):** matriz completa sem divergência inesperada + validação humana + rotas congeladas intactas.

**Portão de saída (da fase):**
- [ ] 100% das rotas migradas
- [ ] Nenhuma rota de dono alterada (diff cumulativo prova)
- [ ] Modo sombra sem divergência não explicada por 7 dias após o último lote

**Rollback:** por lote, `git revert -m 1` do merge daquele lote. Lotes independentes por construção.

---

### FASE 4 — Abrir o resolver (o flip)

> ⚠️ **Esta é a fase que cria o risco se as anteriores não estiverem completas.** Só
> acontece com FASE 3 fechada, modo sombra limpo e **9.71 resolvido**.

**Portão de entrada:**
- [ ] FASE 3 100% fechada
- [ ] **9.71 fechado** — os 5 homônimos que gateiam conteúdo (drip/automação) resolvidos (R5)
- [ ] R6 (impersonação) tratado
- [ ] Modo sombra limpo por 7 dias

**Objetivo:** `getCurrentWorkspace`/`resolveStaffWorkspace` passam a honrar um workspace onde a pessoa é **colaboradora**, não só dona.

**O que faz:**

1. O resolver aceita workspace por vínculo, com validação server-side a cada requisição
2. Determinismo: `orderBy` explícito; hint respeitado quando válido, recusado quando não
3. `/api/workspaces` (ou rota irmã) passa a listar workspaces de colaboração **com o papel marcado**
   ⚠️ **Não contaminar `useActiveWorkspace`** — as 5 telas de credencial de pagamento não podem receber workspace alheio (R4). Rota separada ou payload com papel, conforme a FASE 0 apontar.
4. Feature flag de ativação: liga primeiro para **uma conta** (a do `applyfybr`, com consentimento da Ana Luiza), depois para todos

**Prova:**
- Matriz completa das 8 personas em staging, agora **com troca de contexto**
- Teste de troca rápida (R8): trocar de workspace 5× seguidas e provar que nenhuma resposta carrega dado do contexto anterior
- **Teste de aceitação do épico:** `applyfybr` entra no painel do `shop-club` e vê **exatamente** as 5 permissões do vínculo — nem mais, nem menos. As telas de dono (colaboradores, integrações, credenciais de pagamento) **recusam**.
- Validação humana obrigatória em produção com a conta piloto antes do rollout geral

**Portão de saída:**
- [ ] Teste de aceitação passa
- [ ] Telas de dono recusam para o colaborador (provado, não presumido)
- [ ] Piloto de 48h com uma conta, sem incidente
- [ ] Rollout geral

**Rollback:** feature flag desliga sem deploy; revert do merge se necessário.

---

### FASE 5 — Experiência de entrada (o que o Vinicius pediu)

**Portão de entrada:** FASE 4 com rollout geral estável.

**Objetivo:** a pessoa **descobre** e **escolhe** o contexto, sem link decorado.

**O que faz (conforme D2/D3):**

1. Switcher lista workspaces próprios **e** de colaboração, com papel visível ("Colaborador")
2. Entrada no último contexto usado (cookie), com fallback determinístico
3. Indicador permanente de contexto no painel — a pessoa sempre sabe onde está e com que papel
4. Telas fora do alcance: escondidas ou desabilitadas com motivo (D4)
5. **Opcional (D2 a):** tela de escolha no login quando houver >1 destino, com escolha lembrada

**Prova:** matriz de UI por persona; teste de mobile; validação humana com a conta piloto real.

**Portão de saída:** `applyfybr` entra pelo login normal, escolhe o `shop-club`, trabalha com as permissões corretas, e nenhuma tela de dono aparece.

**Rollback:** revert do merge (UI apenas — a fundação permanece).

---

### FASE 6 — Contração (limpeza)

**Portão de entrada:** FASE 5 estável por 7 dias.

**O que faz:**
1. Remover as primitivas antigas e o modo sombra
2. Remover código morto identificado ao longo do épico (9.66 e afins)
3. Atualizar `docs/SYSTEM-MAP.md` com o modelo novo
4. Memória de continuidade: o modelo passa a ser a regra da casa para toda rota nova
5. Fechar 9.75 e revisar 9.64/9.65/9.69/9.72 à luz do modelo novo

**Portão de saída:** grep prova zero uso das primitivas antigas; suíte verde; documentação coerente.

---

## 5. Infraestrutura de teste (pré-requisito das FASES 1–5)

O staging precisa de um elenco completo **antes** da FASE 1. Sem ele, nenhuma matriz é confiável.

**Personas necessárias** (todas `@staging.test`, senha conhecida):

| Persona | Papel | Existe hoje? |
|---|---|---|
| dono do workspace A | OWNER | ✅ `producer-staging` |
| aluno matriculado | MEMBER | ✅ `aluno-staging` |
| colaborador — cada uma das 9 permissões, isoladas | COLLABORATOR | ⚠️ existem 5; faltam `MANAGE_STUDENTS`, `MANAGE_LESSONS`, `MANAGE_AUTOMATIONS`, e uma com escopo de curso restrito |
| **dono do workspace B, colaborador no A** | a persona-alvo | ❌ criar (o retrato do `applyfybr`) |
| ADMIN de plataforma | ADMIN | ❌ criar |
| colaborador de **dois** workspaces | multi-contexto | ❌ criar (não existe em produção — mas o modelo precisa suportar) |
| anônimo / sem vínculo | NONE | ❌ criar sob demanda |

**Cenário:** dois workspaces (A e B), cada um com curso, comunidade e conteúdo suficiente para exercitar escopo de curso.

**Regras do palco:** prova dupla de REF em toda escrita; conteúdo obviamente falso; estado do palco (moderações ligadas, cores, etc.) **registrado no documento**, não só na conversa.

---

## 6. Como cada fase é conferida (o ritual)

Repetido em **toda** fase, sem exceção:

1. **Antes:** portão de entrada conferido item a item; bloco §17 respondido por escrito
2. **Durante:** leitura antes da escrita; se a realidade divergir do plano → **§22, parar e reportar**
3. **Prova técnica:** matriz de personas antes/depois, com controles positivos **e** negativos
4. **Prova humana:** gate estrutural — o comando de merge **exige** o resultado colado; vazio = não executa
5. **Merge:** `--no-ff`, SHA de rollback registrado
6. **Papelada:** PLANO-MESTRE + memória de continuidade, no mesmo fôlego (item fechado com TODO vivo vira item-fantasma)
7. **Depois:** §21 — o que mudou de comportamento em produção, e quem precisa ser avisado

---

## 7. Sinais de alerta (parar imediatamente)

- Qualquer rota da **lista congelada** (dono) aparecendo num diff
- Modo sombra mostrando divergência que atinge **dono** ou **ADMIN**
- Qualquer mudança que toque webhook, rota pública ou player
- Aparecer uma **segunda função com o mesmo nome** de uma primitiva
- Precisar de "só um `if` pra funcionar" — é sinal de que o modelo não está certo ainda
- Qualquer pressão para pular a FASE 2

---

## 8. O que este plano NÃO faz

Explícito para não haver expectativa errada:

- **Não** dá ao colaborador acesso a aulas sem matrícula (barreira de receita, decisão de 13/ago)
- **Não** altera as 24 rotas de dono — integrações e credenciais de pagamento continuam exclusivas do dono
- **Não** mexe em webhooks nem na área de membro
- **Não** entrega a tela de escolha antes da fundação — a UI é a FASE 5, não a 1
- **Não** tem prazo. Tem portões. A fase avança quando está provada, não quando é conveniente.

---

## 9. Ordem final, em uma linha

```
FASE 0 inventário  →  FASE 1 primitivas (no-op)  →  FASE 2 sombra (7 dias)
   →  FASE 3 lotes L1..L5  →  [9.71 fechado]  →  FASE 4 flip (piloto)
   →  FASE 5 experiência de entrada  →  FASE 6 contração
```

**Próximo passo concreto:** responder **D1–D5** e emitir o comando da **FASE 0** (leitura pura,
sem risco, executável a qualquer momento).

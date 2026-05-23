# Members Club — Checklist Completo: V1 (Lançada) + V2 Roadmap

> Estado real da plataforma. Atualizado: 23 de maio de 2026.
> V1 LANÇADA EM PRODUÇÃO — Producers reais já usando.
> URL: app.mymembersclub.com.br | Landing: mymembersclub.com.br

---

## V1 — STATUS: ✅ LANÇADA

### BLOCO A — Testes Manuais
> ✅ COMPLETO — validado em produção com producers reais

| # | Teste | Status |
|---|-------|--------|
| A1 | Compra com email NOVO | ✅ |
| A2 | Mesmo aluno compra em OUTRO workspace | ✅ (ensureUserByEmail paginado) |
| A3 | Reset senha workspace A não afeta B | ✅ |
| A4 | Master password funciona | ✅ |
| A5 | Matrícula manual → email com senha | ✅ |
| A6 | Reenvio webhook → email chega (dedup 60s) | ✅ (await sendEmail) |
| A7 | Vídeos carregam (3 providers) | ✅ |
| A8 | Quiz funciona | ✅ |
| A9 | Certificado funciona | ✅ |
| A10 | Comunidade funciona | ✅ |
| A11 | Automações rodam | ✅ |
| A12 | Lives funcionam | ✅ |
| A13 | Suporte funciona (tickets) | ✅ |
| A14 | CSV import/export | ✅ |
| A15 | Dashboard producer filtra por curso | ✅ |
| A16 | WhatsApp clicável em Meus Alunos | ✅ |
| A17 | Tab "Compras" no detalhe do aluno | ✅ |
| A18 | Slug travado em edição | ✅ |
| A19 | Landing page | ✅ |
| A20 | Favicon adaptável (light/dark) | ✅ |
| A21 | OG image | ✅ |

### BLOCO B — PWA
> ✅ COMPLETO

| # | Item | Status |
|---|------|--------|
| B1 | Install prompt | ✅ |
| B2 | Offline page | ✅ |
| B3 | Push notifications | ✅ |
| B4 | Cache SW atualizado | ✅ |
| B5 | Manifest dinâmico por workspace | ✅ |
| B6 | SW não registra no apex | ✅ |

### BLOCO C — Bugs Conhecidos
> ✅ TODOS RESOLVIDOS

### BLOCO D — Documentação
> ✅ COMPLETO

---

## SEGURANÇA — ✅ BLINDADA

| # | Fix | Commit |
|---|-----|--------|
| S1 | Store aluno cross-workspace | 3514352 |
| S2 | Perfil aluno cross-workspace | f3f6bde |
| S3 | Detalhe aluno cross-workspace | 6b82a71 |
| S4 | ensureUserByEmail paginado | 035624f |
| S5 | sendEmail await webhook | d789375 |
| S6 | Certificados (já seguro) | Verificado |
| S7 | Storage listing cross-tenant | Fix SQL |
| S8 | Pentest aprovado | — |

---

## V2 — ROADMAP

### BLOCO E — Refatoração (qualidade interna)

| # | Item | Esforço | Risco |
|---|------|---------|-------|
| E1 | TypeScript/Tipagem | 1-2h | Zero |
| E2 | Hooks React | 1-2h | Baixo |
| E3 | Tratamento de Erros | 2-3h | Baixo |
| E4 | DRY | 3-5h | Médio |
| E5 | Performance | 2-4h | Baixo-Médio |
| E6 | Separação Responsabilidades | 5-10h | Alto |

### BLOCO F — Features Novas (20 features)

| # | Feature | Complexidade | Impacto |
|---|---------|-------------|---------|
| F1 | Dislike oculto | Média | Médio |
| F2 | Suporte por curso | Média | Alto |
| F3 | Player YouTube mascarado | Alta | Alto |
| F4 | Aba Alunos enriquecida | Média | Médio |
| F5 | Custom domains | Alta | Muito Alto |
| F6 | IA integrada | Alta | Muito Alto |
| F7 | Relatório de cliques | Média | Médio |
| F8 | Cancelamento via API Applyfy | Depende deles | Alto |
| F9 | App nativo (React Native) | Muito Alta | Alto |
| F10 | Marketplace de cursos | Alta | Alto |
| F11 | Múltiplos externalProductId | Média | Alto |
| F12 | Popup parabéns 100% | Baixa | Médio |
| F13 | Login "Sou aluno" | Baixa | Médio |
| F14 | Import CSV na aba do curso | Baixa | Médio |
| F15 | Personalizar vitrine 100% | Média | Alto |
| F16 | Tela teste push admin | Baixa | Baixo |
| F17 | Log aceite termos + arquivos comunidade | Baixa | Baixo |
| F18 | Pontos → liberar curso | Média | Médio |
| F19 | HTML no email automações | Média | Médio |
| F20 | Dimensões thumb da live | Baixa | Baixo |

### BLOCO G — Infraestrutura

| # | Item | Custo | Quando |
|---|------|-------|--------|
| G1 | Cloudflare Pro | $20/mês | 10+ producers |
| G2 | Sentry | Grátis | Quando lançar marketing |
| G3 | Playwright | 0 | Quando +1 dev |
| G4 | CI/CD expandido | Já tem | Expandir com testes |

---

## CRITÉRIOS V1 — ✅ TODOS ATENDIDOS

- [x] 21/21 testes manuais
- [x] PWA validado
- [x] Build verde
- [x] Webhook Applyfy processando
- [x] Email de acesso funcionando
- [x] Dashboard com dados
- [x] Segurança blindada
- [x] Documentação atualizada

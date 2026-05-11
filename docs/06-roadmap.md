# Members Club — Roadmap

> Cronograma de evolução da plataforma, organizado por prioridade e impacto.
> Última atualização: 11 de maio de 2026.

---

## Legenda

- 🔴 **Crítico** — Bloqueia receita ou segurança
- 🟡 **Importante** — Melhora experiência ou operação
- 🟢 **Nice to have** — Polimento, diferencial competitivo
- ✅ **Feito** — Completado na sessão #04

---

## Fase 0 — Fundação (✅ COMPLETA)

> Tudo que foi feito nas sessões #01 a #04 + atualizações 06–11/05/2026. Plataforma funcional e segura.

| Item | Status |
|------|--------|
| Stack Next.js 16 + Supabase + Prisma + Vercel | ✅ |
| 52 models, 16 enums, 156 APIs | ✅ |
| RBAC 5 roles + 12 permissões granulares | ✅ |
| RLS 51 tabelas + Storage policies | ✅ |
| Zod 88/88 routes (100%) | ✅ |
| CSP + WAF + DDoS + DNSSEC + SSL Full Strict | ✅ |
| 2FA (TOTP) admin + producer + workspace login | ✅ |
| Landing page redesenhada com pricing dual R$0/R$597 | ✅ |
| Pagamentos via Applyfy (webhook + checkout) | ✅ |
| Video player YouTube/Vimeo/**Panda Video** | ✅ |
| Quizzes por aula | ✅ |
| Comunidade por curso | ✅ |
| Automações (11 triggers, 5 actions) | ✅ |
| Sistema de suporte | ✅ |
| Certificados PDF | ✅ |
| Gamificação (pontos/níveis) | ✅ |
| Lives com chat | ✅ |
| PWA + push notifications | ✅ |
| Logger estruturado | ✅ |
| ESLint flat config (**0 warnings**) | ✅ |
| Varredura completa 15/15 | ✅ |
| 6 documentos de projeto | ✅ |
| **WorkspaceCredential** (senha por workspace para STUDENT) | ✅ |
| **Login dual** workspace (STUDENT/staff) | ✅ |
| **Forgot/Reset scoped** por workspace | ✅ |
| **Master password** via magic link (não destrói credential) | ✅ |
| **MFA TOTP** no workspace login | ✅ |
| **Token Applyfy por workspace** (isolamento de tenant) | ✅ |
| Webhook salva phone + CPF/CNPJ encriptado | ✅ |
| Webhook fallback product.id | ✅ |
| Dedup email 24h → 60s | ✅ |
| **OG image** social media (1200x630) | ✅ |
| **Favicon adaptável** light/dark mode | ✅ |
| Detalhe do aluno com aba **Compras** | ✅ |
| **Dashboard filtra por curso** | ✅ |
| CSV export com colunas financeiras | ✅ |
| WhatsApp clicável em Meus Alunos | ✅ |
| Module drip → primeira aula liberada | ✅ |
| Lesson lock UI com data | ✅ |
| Date picker custom módulo release | ✅ |
| PII removido do checkout query string | ✅ |
| Naming `/users` → `/students` | ✅ |
| 3 componentes mortos removidos | ✅ |
| Preço R$97 → R$597 | ✅ |

---

## Fase 1 — Estabilização & Testes Manuais (Próxima)

> Validar tudo que foi construído antes de escalar. Estimativa: 1-2 semanas.

| # | Item | Prioridade | Esforço | Notas |
|---|------|-----------|---------|-------|
| 1.1 | Testes manuais pendentes (7 itens) | 🔴 | Baixo | Impersonate, dashboard, relatórios, producer detail, student detail, DateRangeSelector, curso expirado |
| 1.2 | Testar fluxo completo de pagamento (ponta a ponta) | 🔴 | Baixo | Registro → checkout → webhook → subscription ACTIVE → acesso |
| 1.3 | Testar fluxo aluno completo | 🔴 | Baixo | Matrícula → login workspace → aula → quiz → certificado |
| 1.4 | Testar automações end-to-end | 🟡 | Médio | Criar automação → trigger dispara → action executa |
| 1.5 | Testar lives end-to-end | 🟡 | Médio | Agendar → notificação → LIVE → chat → ENDED |
| 1.6 | Testar suporte end-to-end | 🟡 | Baixo | Producer abre ticket → admin responde → attachments |
| 1.7 | Testar CSV import/export | 🟡 | Baixo | Importar alunos por CSV → enrollments criados |
| 1.8 | Testar dark/light mode | 🟢 | Baixo | Toggle funciona em todas as páginas |

---

## Fase 2 — Polimento & Dívidas Técnicas

> Resolver dívidas antes de escalar. Estimativa: 2-3 semanas.

| # | Item | Prioridade | Esforço | Notas |
|---|------|-----------|---------|-------|
| 2.1 | Arte real logo Applyfy | 🟢 | Baixo | Substituir placeholder em public/images/ |
| 2.2 | Brevo no staging | 🟡 | Baixo | Configurar Brevo com domínio de staging pra testar emails sem afetar prod |
| 2.3 | Error boundaries em páginas críticas | 🟡 | Médio | Player, dashboard, checkout — evitar tela branca |
| 2.4 | Testes automatizados (Playwright) | 🟢 | Alto | Smoke tests dos 6 fluxos críticos |
| 2.5 | Backfill phone/CPF de alunos antigos | 🟢 | Baixo | Script `scripts/backfill-cpf.mjs` já existe; rodar pra alunos antigos sem document |
| 2.6 | Migração `Plan` no banco para R$ 597 | 🟡 | Baixo | UPDATE no banco — propaga automaticamente pra billing UI, emails, cron |

> Itens removidos da Fase 2 por conclusão: naming /users → /students ✅, 91 warnings ESLint ✅, PII checkout ✅

---

## Fase 3 — Infraestrutura & Segurança

> Hardening pra escala. Estimativa: 1-2 semanas.

| # | Item | Prioridade | Esforço | Custo |
|---|------|-----------|---------|-------|
| 3.1 | Cloudflare Pro ($20/mês) | 🟡 | Baixo | $20/mês — Super Bot Fight Mode com exceções por path |
| 3.2 | Pentest profissional | 🟡 | — | R$5-15k — Contratar empresa especializada |
| 3.3 | Rate limiting em Redis (Upstash) | 🟢 | Médio | Escala beyond single serverless instance |
| 3.4 | Monitoring (Sentry ou similar) | 🟡 | Médio | Error tracking em tempo real |
| 3.5 | Backup automatizado do Supabase | 🔴 | Baixo | Point-in-time recovery (upgrade Supabase Pro) |
| 3.6 | Staging environment completo | 🟡 | Médio | Branch preview com Supabase staging isolado |
| 3.7 | CI/CD pipeline (GitHub Actions) | 🟢 | Médio | Build + lint + type-check + npm audit em cada PR |

---

## Fase 4 — Features de Diferenciação

> Features que colocam o Members Club acima dos concorrentes. Estimativa: 1-2 meses.

### 4.1 Custom Domain para Workspaces 🟡

**O que é:** Producer configura `cursos.suaempresa.com.br` em vez de `app.mymembersclub.com.br/w/slug`.

**Impacto:** Alto — profissionalismo, marca branca completa.

**Esforço:** Alto — envolve Vercel domains API, proxy dinâmico, SSL automático.

**Dependências:** Cloudflare API ou Vercel Domains API.

**Fases de implementação:**
1. UI para producer configurar domínio custom
2. API que registra o domínio na Vercel programaticamente
3. Proxy que roteia hostname custom → workspace correto
4. SSL automático via Vercel/Cloudflare
5. Teste end-to-end com domínio real

### 4.2 Relatório de Cliques em Links das Aulas 🟢

**O que é:** Producer vê quantos alunos clicaram em cada link dentro da descrição da aula.

**Impacto:** Médio — ajuda producer a entender engajamento.

**Esforço:** Médio — interceptar cliques, gravar em tabela ClickLog, dashboard.

**Fases:**
1. Model ClickLog (lessonId, userId, url, clickedAt)
2. Interceptor de cliques no rich-text renderizado
3. API de contagem
4. Tab "Links" na analytics do curso

### 4.3 IA Integrada 🟢

**O que é:** Assistente IA dentro da plataforma para alunos e producers.

**Impacto:** Alto — diferencial competitivo forte.

**Esforço:** Alto — envolve API Anthropic, contexto por curso, custo de tokens.

**Para o Aluno:**
- Chat com IA que responde dúvidas sobre o conteúdo do curso
- Resumo automático das aulas
- Quiz gerado por IA

**Para o Producer:**
- Gerar descrição de curso/módulo/aula automaticamente
- Gerar quiz a partir do conteúdo
- Análise de engajamento ("quais alunos estão em risco?")

**Modelo de custo:**
- ~R$0,01-0,05 por interação
- 100 alunos × 3 perguntas/semana ≈ R$12-60/mês
- Sugestão: incluir 500 interações/mês no plano, bloquear se estourar

**Fases:**
1. Integração com API Anthropic (Claude Sonnet)
2. Chat widget no layout do aluno
3. Contexto alimentado com conteúdo das aulas
4. Limite de interações por workspace
5. Dashboard de uso de tokens para producer
6. Ferramentas de geração para producer (quiz, descrição, email)

### 4.4 App Nativo (React Native / Expo) 🟢

**O que é:** App na App Store e Google Play.

**Impacto:** Alto — mais acessibilidade, notificações nativas.

**Esforço:** Muito alto — novo projeto, compartilha API.

**Consideração:** A PWA já funciona bem. Avaliar se o investimento compensa vs melhorar a PWA.

---

## Fase 5 — Escala & Monetização

> Quando tiver base de producers pagantes. Estimativa: 3-6 meses.

| # | Item | Prioridade | Impacto |
|---|------|-----------|---------|
| 5.1 | Marketplace de cursos | 🟢 | Receita adicional — comissão sobre vendas |
| 5.2 | Planos diferenciados (Basic/Pro/Enterprise) | 🟡 | Mais opções de monetização |
| 5.3 | White-label completo | 🟢 | Producers com marca 100% própria |
| 5.4 | Multi-idioma (i18n) | 🟢 | Expansão internacional |
| 5.5 | API pública (developer platform) | 🟢 | Ecosystem de integrações |
| 5.6 | Stripe Connect (split payments) | 🟡 | Producer recebe direto, plataforma fica com % |
| 5.7 | Analytics avançado (cohort, retention, LTV) | 🟡 | Insights pro producer tomar decisões |

---

## Timeline Visual

```
Mai 2026     Jun 2026     Jul 2026     Ago 2026     Set 2026
|------------|------------|------------|------------|
[Fase 1      ][  Fase 2   ][    Fase 3    ]
 Testes        Polimento    Infra/Segurança
 manuais       Dívidas      Cloudflare Pro
               técnicas     Pentest
                            Monitoring

                            [      Fase 4       ][    Fase 5    ]
                             Custom domains       Marketplace
                             Rel. cliques          Planos
                             IA integrada          White-label
```

---

## Métricas de Sucesso por Fase

| Fase | Métrica | Meta |
|------|---------|------|
| 1 | Todos os 87 testes passando | 100% |
| 2 | Warnings ESLint | 0 (já atingido) |
| 3 | Uptime | 99.9% |
| 3 | Pentest | 0 achados HIGH/CRITICAL |
| 4 | Custom domains ativos | 10+ producers usando |
| 4 | IA interações/mês | 1000+ |
| 5 | MRR | R$10.000+ |
| 5 | Producers ativos | 100+ |

---

## Decisões Pendentes

| Decisão | Opções | Impacto |
|---------|--------|---------|
| Quando investir no Cloudflare Pro | Agora ($20/mês) vs quando receita justificar | Bot Fight Mode com exceções |
| Pentest: fazer agora ou pós-Fase 2 | Agora (R$5-15k) vs depois de polir | Segurança certificada |
| IA: absorver custo ou cobrar | Incluir no plano vs cobrar por uso | Diferencial vs margem |
| App nativo vs melhorar PWA | React Native ($$$) vs investir na PWA | Acessibilidade vs custo |
| Supabase: Free vs Pro | Free agora vs Pro ($25/mês) para backups | Segurança de dados |

---

## Concorrentes para Referência

| Plataforma | Ponto forte | O que Members Club já tem | O que falta |
|-----------|------------|--------------------------|-------------|
| Hotmart Club | Base de produtores enorme | Quizzes, comunidade, progresso | Marketplace, analytics avançado |
| MemberKit | Simplicidade | UI clean, dark mode | Custom domain, white-label |
| Kajabi | All-in-one (site + curso + email) | Curso + email (Brevo) + automações | Site builder, funil de vendas |
| Skool | Comunidade forte | Comunidade por curso, gamificação | Feed estilo rede social mais elaborado |
| Teachable | Analytics robustos | Dashboard + relatórios | Cohort analysis, LTV |

**Diferencial Members Club:** Segurança enterprise-grade (13 camadas, RLS, 2FA, Zod 100%, pentest) com preço acessível (R$ 597/mês ou R$ 0 com checkout Applyfy). Nenhum concorrente BR tem esse nível de segurança documentado.

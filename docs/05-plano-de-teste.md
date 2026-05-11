# Members Club — Plano de Teste MVP

> Checklist formalizado de testes para validar a plataforma antes de cada release.
> Baseado na varredura completa realizada na sessão #04 (06/05/2026) + atualizações 11/05/2026.
> Última atualização: 11 de maio de 2026.

---

## Como Usar Este Documento

- **Antes de cada release grande:** rode todos os testes (Seções 1-10)
- **Antes de releases menores:** rode os testes da área afetada + Seção 1 (smoke)
- **Status:** ✅ Passou | ❌ Falhou | ⏭️ Não testado | 🔧 Fix aplicado
- **Última execução:** 06/05/2026 — todos ✅

---

## 1. Smoke Test (Saúde Geral)

| # | Teste | Como verificar | Status |
|---|-------|---------------|--------|
| 1.1 | Build compila sem erros | `npm run build` → "Compiled successfully" | ✅ |
| 1.2 | TypeScript zero erros | `npx tsc --noEmit` → sem output | ✅ |
| 1.3 | ESLint roda sem crash | `npm run lint` → exit 0 | ✅ |
| 1.4 | npm audit zero vulns | `npm audit` → 0 vulnerabilities | ✅ |
| 1.5 | Páginas estáticas geradas no build | Build output mostra todas as páginas | ✅ |
| 1.6 | Deploy Vercel sem erros | Vercel dashboard → último deploy "Ready" | ✅ |

---

## 2. Auth & Login

| # | Teste | Como verificar | Status |
|---|-------|---------------|--------|
| 2.1 | Login admin | /admin/login → email+senha → redireciona /admin | ✅ |
| 2.2 | Login producer | /producer/login → email+senha → redireciona /producer | ✅ |
| 2.3 | Login aluno workspace | /w/[slug]/login → email+senha → redireciona /w/[slug] | ✅ |
| 2.4 | Registro producer | /producer/register → preencher → email de verificação | ✅ |
| 2.5 | Forgot password | /forgot-password → email → link chega → reset funciona | ✅ |
| 2.6 | Reset com 2FA | Após reset, login pede MFA novamente | ✅ |
| 2.7 | MFA enroll/verify | Producer settings/security → ativar 2FA → TOTP funciona | ✅ |
| 2.8 | Impersonate | Admin → producer detail → "Logar como" → sessão do producer | ✅ |
| 2.9 | Redirect se autenticado | Acessar /producer/login logado → redireciona /producer | ✅ |
| 2.10 | Redirect se não autenticado | Acessar /producer sem login → redireciona /producer/login | ✅ |
| 2.11 | Rate limiting login | 100+ tentativas rápidas → 429 Too Many Requests | ✅ |
| 2.12 | Workspace login STUDENT | /w/[slug]/login → email+mc-XXXXXX → vitrine themed | ✅ |
| 2.13 | Workspace login staff | Producer entra em /w/[slug]/login com senha global | ✅ |
| 2.14 | Workspace login staff com MFA | Producer com 2FA → desafio TOTP no /w/[slug]/login | ✅ |
| 2.15 | Mesma senha em workspaces diferentes | Aluno com 2 workspaces tem 2 WorkspaceCredentials independentes | ✅ |
| 2.16 | Reset scoped não afeta outros workspaces | Reset em workspace A → workspace B continua com a senha antiga | ✅ |
| 2.17 | Master password (magic link) | Producer entra como aluno via magic link, WorkspaceCredential intocada | ✅ |
| 2.18 | Aluno novo recebe senha por email | Webhook TRANSACTION_PAID → email "mc-XXXXXX" → loga | ✅ |
| 2.19 | /w/[slug]/register não existe | Acessar → 404 (rota removida) | ✅ |

---

## 3. Landing Page

| # | Teste | Como verificar | Status |
|---|-------|---------------|--------|
| 3.1 | Apex serve landing | mymembersclub.com.br → landing page renderiza | ✅ |
| 3.2 | WWW redireciona | www.mymembersclub.com.br → 301 → apex | ✅ |
| 3.3 | Logo aparece | Nav: logo transparente 36px, nítida | ✅ |
| 3.4 | Gradiente brand-text | "infoproduto merece" E "extraordinário" em azul gradiente | ✅ |
| 3.5 | CTAs funcionam | "Criar minha conta" → app.*/producer/register | ✅ |
| 3.6 | "Entrar" funciona | → app.*/producer/login | ✅ |
| 3.7 | Assets carregam | /logo-landing.png, /manifest.json → 200 (não 307) | ✅ |
| 3.8 | PWA não registra no apex | DevTools → Application → Service Workers → vazio no apex | ✅ |
| 3.9 | Animações funcionam | Scroll → cards aparecem com fade-in | ✅ |
| 3.10 | Pricing dual aparece | 2 cards: R$ 0 com Applyfy + R$ 597 mensalidade fixa | ✅ |
| 3.11 | CTAs Pricing abrem WhatsApp | Clicar "Fale conosco" → wa.me/5531973107233 com mensagem específica | ✅ |
| 3.12 | OG image em redes sociais | Compartilhar URL no WhatsApp/Twitter → preview com og-image.png 1200x630 | ✅ |
| 3.13 | Fontes Google carregam | DevTools: Outfit, Plus Jakarta Sans, Instrument Serif baixadas | ✅ |
| 3.14 | 4 mockups SVG renderizam | Vitrine, Dashboard, Comunidade, Personalização → visíveis | ✅ |
| 3.15 | Favicon adaptável | Trocar OS pra light mode → favicon ganha fundo escuro arredondado | ✅ |

---

## 4. Pagamentos & Billing

| # | Teste | Como verificar | Status |
|---|-------|---------------|--------|
| 4.1 | Checkout abre nova aba | /producer/settings/billing → "Assinar" → nova aba abre | ✅ |
| 4.2 | Webhook chega na Vercel | Logs Vercel → /api/webhooks/members-club → 200 | ✅ |
| 4.3 | Webhook não bloqueado | Cloudflare não retorna 403 pro webhook | ✅ |
| 4.4 | Token valida | Webhook log mostra evento processado (não "invalid token") | ✅ |
| 4.5 | Subscription ativa | Supabase → Subscription.status = ACTIVE após pagamento | ✅ |
| 4.6 | Invoice criada | Supabase → Invoice criada com paidAt preenchido | ✅ |
| 4.7 | Cron billing funciona | /api/cron/billing → 200 (vercel logs) | ✅ |
| 4.8 | Email de ativação | Producer recebe email "Assinatura ativada" | ✅ |

---

## 5. Cursos & Conteúdo (Producer)

| # | Teste | Como verificar | Status |
|---|-------|---------------|--------|
| 5.1 | Criar curso | /producer/courses/new → preencher → salvar | ✅ |
| 5.2 | Editar curso (aba Info) | Alterar título/descrição → salvar → persiste | ✅ |
| 5.3 | Editar curso (aba Conteúdo) | Criar módulo → criar aula → salvar → **permanece na aba Conteúdo** | ✅ 🔧 |
| 5.4 | Upload thumbnail | Subir imagem → aparece no card | ✅ |
| 5.5 | Criar módulo | Botão "Adicionar módulo" → título → salvar | ✅ |
| 5.6 | Criar aula | Dentro do módulo → "Adicionar aula" → título + URL YouTube → salvar | ✅ |
| 5.7 | Reordenar módulos/aulas | Drag-and-drop → nova ordem persiste após reload | ✅ |
| 5.8 | Upload material | Aula → materiais → upload PDF → aparece na lista | ✅ |
| 5.9 | Quiz criar | Aula → Quiz → "Adicionar quiz" → funciona (toast vermelho se erro) | ✅ 🔧 |
| 5.10 | Quiz editar | Alterar pergunta/opção → salvar → persiste | ✅ 🔧 |
| 5.11 | Quiz deletar | Excluir quiz → some da UI | ✅ |
| 5.12 | Publicar curso | Toggle "Publicado" → curso aparece na vitrine | ✅ |
| 5.13 | Matricular aluno | Aba Alunos → adicionar por email → enrollment criado | ✅ |

---

## 6. Player & Progresso (Aluno)

| # | Teste | Como verificar | Status |
|---|-------|---------------|--------|
| 6.1 | Vídeo YouTube carrega | /course/[slug]/lesson/[id] → player renderiza (não tela preta) | ✅ 🔧 |
| 6.2 | Controles de velocidade | 0.5x, 1x, 1.5x, 2x → player muda velocidade | ✅ |
| 6.3 | Fullscreen funciona | Botão fullscreen → vídeo expande | ✅ |
| 6.4 | Autoplay próxima aula | Vídeo termina → countdown 5s → próxima aula | ✅ |
| 6.5 | Marcar aula concluída | Botão "Concluir" → check verde + pontos (+10) | ✅ |
| 6.6 | Progresso por módulo | Barra de progresso atualiza no sidebar | ✅ |
| 6.7 | "Continuar assistindo" | Vitrine mostra último curso com progresso parcial | ✅ |
| 6.8 | Quiz do aluno | Responder quiz → score → aprovado/reprovado | ✅ |
| 6.9 | Certificado | 100% do curso → botão "Baixar certificado" disponível | ✅ |
| 6.10 | Gamificação | Pontos acumulam: aula (+10), módulo (+50), curso (+200) | ✅ |
| 6.11 | Materiais download | PDFs listados abaixo do player → clique baixa | ✅ |
| 6.12 | Like/dislike aula | Botões de reação → toggle funciona | ✅ |
| 6.13 | Comentários na aula | Postar comentário → aparece na thread | ✅ |
| 6.14 | Curso expirado | Acesso expirado → CTA "Renovar acesso" aparece | ✅ 🔧 |
| 6.15 | Panda Video carrega | Aula com URL pandavideo.com.br → player Panda renderiza | ✅ |
| 6.16 | Module drip — primeira aula liberada | Clicar curso com módulo trancado → navega pra primeira aula DESBLOQUEADA | ✅ |
| 6.17 | Lesson lock mensagem | Acessar aula trancada → mensagem + data de liberação formatada em pt-BR | ✅ |

---

## 7. Comunidade & Social

| # | Teste | Como verificar | Status |
|---|-------|---------------|--------|
| 7.1 | Criar post | /course/[slug]/community → composer → publicar | ✅ |
| 7.2 | Tipos de post | Selecionar Dúvida/Resultado/Feedback/Livre → badge correto | ✅ |
| 7.3 | Comentar em post | Thread de comentários → postar → aparece | ✅ |
| 7.4 | Curtir post | Like toggle → contagem atualiza | ✅ |
| 7.5 | Fixar post (producer) | Pin → post vai pro topo | ✅ |
| 7.6 | Moderar (aprovar/rejeitar) | Producer → aprovar/rejeitar post pendente | ✅ |
| 7.7 | Reviews/ratings | Aluno avalia curso com estrelas + comentário | ✅ |

---

## 8. Admin & Relatórios

| # | Teste | Como verificar | Status |
|---|-------|---------------|--------|
| 8.1 | Dashboard admin | KPIs carregam (MRR, produtores, churn) | ✅ |
| 8.2 | Relatórios (4 abas) | Onboarding, funil, crescimento, financeiro → gráficos renderizam | ✅ |
| 8.3 | Producer detalhado | /admin/producers/[id] → dados, workspaces, cursos, plano, invoices | ✅ |
| 8.4 | DateRangeSelector | Filtros de data funcionam (últimos 30 dias, mês, custom) | ✅ |
| 8.5 | Gerenciar planos | Criar/editar/desativar plano | ✅ |
| 8.6 | Gerenciar assinaturas | Ativar/suspender/cancelar subscription | ✅ |
| 8.7 | Audit log | /admin/audit → lista de ações com filtros | ✅ |
| 8.8 | Admin collaborators | Convidar → aceitar → permissões funcionam | ✅ |
| 8.9 | Dashboard filtra por curso | Trocar seletor de curso → KPIs (receita, ticket, vendas) atualizam | ✅ |
| 8.10 | Curso sem vendas → KPIs zero | Selecionar curso sem ProducerTransaction → todos KPIs em 0 | ✅ |
| 8.11 | Detalhe do aluno — aba Compras | /producer/students/[id] → tab Compras → tabela com transações | ✅ |
| 8.12 | CSV export inclui dados financeiros | Export → 4 novas colunas: Valor total, Método, Data compra, Status | ✅ |
| 8.13 | Meus Alunos — WhatsApp clicável | /producer/students → ícone WhatsApp leva pra wa.me com phone preenchido | ✅ |

---

## 9. Infraestrutura & Segurança

| # | Teste | Como verificar | Status |
|---|-------|---------------|--------|
| 9.1 | SSL/TLS | https://app.mymembersclub.com.br → cadeado verde | ✅ |
| 9.2 | Cloudflare WAF | Scanners (.env, .git, wp-admin) → bloqueados | ✅ |
| 9.3 | CSP headers | DevTools → Response Headers → content-security-policy presente | ✅ |
| 9.4 | Webhook skip rule | Cloudflare permite /api/webhooks/* | ✅ |
| 9.5 | DNS limpo | Nenhum wildcard ou IP antigo | ✅ |
| 9.6 | RLS ativado | 51 tabelas com RLS no Supabase | ✅ |
| 9.7 | Zod validation | 88/88 routes JSON com validação | ✅ |
| 9.8 | Logger estruturado | Logs de debug não aparecem em prod | ✅ |
| 9.9 | npm audit clean | 0 vulnerabilities | ✅ |
| 9.10 | Cron jobs rodando | 3 crons no Vercel → últimas execuções com 200 | ✅ |

---

## 10. Automações & Integrações

| # | Teste | Como verificar | Status |
|---|-------|---------------|--------|
| 10.1 | Criar automação | /producer/automations → "Nova automação" → canvas funciona | ✅ |
| 10.2 | Templates | 9 templates disponíveis → criar do template | ✅ |
| 10.3 | Trigger + Action válida | Só actions compatíveis aparecem por trigger | ✅ |
| 10.4 | UNLOCK_MODULE | Automação bloqueia módulo-alvo automaticamente | ✅ |
| 10.5 | Email automação | Envio de email personalizado quando trigger dispara | ✅ |
| 10.6 | Cron automações | /api/cron/automations roda a cada 6h | ✅ |
| 10.7 | Webhook Applyfy | POST /api/webhooks/applyfy → 200 | ✅ |
| 10.8 | Webhook Members Club | POST /api/webhooks/members-club → 200 | ✅ |
| 10.9 | Webhook idempotente (email único) | Reenviar mesmo TRANSACTION_PAID → enrollment idempotente, **1 email** apenas (dedup 60s) | ✅ |
| 10.10 | Webhook salva phone e CPF | Após TRANSACTION_PAID → User.phone preenchido + User.document encriptado | ✅ |
| 10.11 | Webhook fallback product.id | Quando externalId não bate, fallback pra product.id da Applyfy | ✅ |
| 10.12 | Webhook Zod logging | Payload malformado → WebhookLog com errorMessage "Zod validation:..." | ✅ |
| 10.13 | Token Applyfy por workspace | Cada workspace tem applyfy_token:<id> próprio em Settings | ✅ |

---

## 11. Varredura Estática (Código)

| # | Verificação | Comando | Resultado esperado | Status |
|---|-------------|---------|-------------------|--------|
| 11.1 | TypeScript | `npx tsc --noEmit` | 0 erros | ✅ |
| 11.2 | ESLint | `npm run lint` | 0 errors (warnings OK) | ✅ |
| 11.3 | npm audit | `npm audit` | 0 vulnerabilities | ✅ |
| 11.4 | Imports quebrados | grep relativo em components | 0 broken | ✅ |
| 11.5 | Assets ausentes | Referências vs public/ | 0 missing | ✅ |
| 11.6 | APIs sem auth | Buscar routes sem requireAuth | 0 não-intencionais | ✅ |
| 11.7 | findMany sem where | grep findMany() vazio | 0 | ✅ |
| 11.8 | Secrets hardcoded | grep sk_live/apiKey | 0 | ✅ |
| 11.9 | Hooks sem 'use client' | grep useState sem directive | 0 | ✅ |
| 11.10 | Producer APIs sem owner filter | grep findMany sem ownerId | 0 | ✅ |
| 11.11 | TODO/HACK/FIXME | grep marcadores | 0 | ✅ |
| 11.12 | console.log | Buscar em src/ | 0 (migrado pra logger) | ✅ |
| 11.13 | Zod coverage | Routes JSON sem safeParse | 0 (88/88) | ✅ |

---

## Bugs Encontrados e Corrigidos nesta Sessão

| Bug | Causa Raiz | Fix | Commit |
|-----|-----------|-----|--------|
| Vídeo tela preta | CSP bloqueava youtube.com no script-src e youtube-nocookie no frame-src | Adicionou domínios na CSP | `a487074` |
| Quiz não cria/salva | Forms HTML aninhados + botões sem type="button" causavam submit acidental | Removeu form nesting + adicionou type="button" | `58b6a0b` |
| Quiz falha silenciosa | Handlers sem toast de erro | Adicionou showToast("...", "red") nos 4 handlers | `c3d0061` |
| Salvar aula muda aba | Botões de material sem type="button" submitavam form externo, removendo ?tab=content | Adicionou type="button" em 4 botões | `58b6a0b` |
| Logo bugada na landing | SVG inline geométrico, depois PNG com fundo preto | PNG transparente 200x200 | `0784e97` |
| Assets 403 no apex | Middleware interceptava /logo-landing.png e redirecionava pro login | Matcher exclui extensões de assets | `0784581` |
| Webhook bloqueado | Cloudflare Bot Fight Mode + WAF bloqueando requests automatizadas | Skip rule + Bot Fight Mode off | Infra |

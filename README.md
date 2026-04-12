# Applyfy — Área de Membros

Plataforma de cursos online com comunidade integrada, construída em Next.js 14 (App Router), Prisma, Supabase e Tailwind CSS. Tema escuro e mobile-first.

## Stack

- **Framework:** Next.js 14 (App Router) + React 18
- **Banco:** PostgreSQL (Supabase) via Prisma
- **Auth:** Supabase Auth (email/password, SSR com `@supabase/ssr`)
- **Storage:** Supabase Storage (thumbnails, avatares)
- **Estilização:** Tailwind CSS
- **Estado client:** Zustand

## Requisitos

- Node.js 20+
- Uma conta Supabase com um projeto criado

## Setup local

```bash
# 1. Instalar dependências
npm install

# 2. Copiar variáveis de ambiente
cp .env.example .env
# Edite .env com as credenciais do seu projeto Supabase

# 3. Rodar migrations
npx prisma migrate deploy
# (em dev, você pode usar: npx prisma migrate dev)

# 4. Iniciar dev server
npm run dev
```

App em [http://localhost:3000](http://localhost:3000).

## Variáveis de ambiente

Todas documentadas em `.env.example`:

| Nome | Obrigatório | Descrição |
|---|---|---|
| `DATABASE_URL` | ✅ | Connection string do Supabase via pooler (porta 6543) — usada pelo Prisma Client em runtime. |
| `DIRECT_URL` | ✅ | Connection string direta (porta 5432) — usada pelo Prisma Migrate. |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL do projeto Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Chave anônima pública do Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Chave service-role (servidor). **Nunca** exponha no client. |
| `NEXTAUTH_SECRET` | ✅ | String aleatória longa para assinar tokens internos. |

## Deploy — Vercel + Supabase

### 1. Supabase
1. Crie um projeto em [supabase.com](https://supabase.com).
2. Em **Database → Connection string**, copie:
   - **Transaction pooler** (porta 6543) → `DATABASE_URL`
   - **Session / Direct connection** (porta 5432) → `DIRECT_URL`
3. Em **Project Settings → API**, copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`
4. Em **Authentication → Providers**, habilite **Email** e (opcional em dev) desabilite confirmação de email.
5. Em **Storage**, crie um bucket público chamado `thumbnails`.
6. Aplique o schema:
   ```bash
   DATABASE_URL="..." DIRECT_URL="..." npx prisma migrate deploy
   ```

### 2. Vercel
1. Importe o repositório em [vercel.com/new](https://vercel.com/new).
2. Framework: **Next.js** (auto-detectado).
3. Em **Environment Variables**, cadastre todas as variáveis listadas acima.
4. Deploy. O build roda `prisma generate` automaticamente via `postinstall`.
5. Após o primeiro deploy, promova seu usuário a admin:
   ```sql
   update "User" set role = 'ADMIN' where email = 'seu@email.com';
   ```

### 3. Domínio
- Adicione seu domínio em **Vercel → Settings → Domains**.
- Em Supabase, adicione a URL de produção em **Authentication → URL Configuration → Site URL** e em **Redirect URLs**.

## Estrutura

```
src/
├─ app/
│  ├─ (auth)/             # login / registro
│  ├─ (dashboard)/        # área do aluno
│  │  ├─ course/[slug]/   # curso, aulas, comunidade
│  │  └─ profile/         # perfil + gamificação
│  ├─ admin/              # painel administrativo
│  └─ api/                # API routes
├─ components/            # componentes de UI
├─ lib/                   # prisma, auth, utils, rate-limit
├─ stores/                # Zustand stores
└─ middleware.ts          # auth + rate limiting
```

## Segurança

- **Rate limiting:** 100 req/min por IP em todas as rotas `/api/*` (middleware).
- **Sessões:** máximo 3 sessões ativas por usuário; a mais antiga é removida no login.
- **Headers:** `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` aplicados globalmente via `next.config.mjs`.
- **Auth:** Supabase SSR + verificação server-side (`requireAuth` / `requireAdmin`) em todas as rotas protegidas.

## Webhooks de pagamento

O Applyfy libera acesso automaticamente após uma compra aprovada via **Hotmart** ou **Stripe**. O roteamento do produto → curso usa o campo **ID externo do produto** cadastrado em `Admin → Cursos`.

### 1. Vincular produtos aos cursos

Em **Admin → Cursos**, edite cada curso e preencha **ID externo do produto** com:
- **Hotmart:** o `product.id` (ou `ucode`) do produto.
- **Stripe:** o `prod_XXXX` ou qualquer identificador que você coloque em `metadata.externalProductId` do checkout session. Alternativamente, envie `metadata.courseId` com o UUID do curso no Applyfy.

### 2. Configurar Hotmart

1. Acesse a Hotmart → **Ferramentas → Webhook (Postback) → Cadastrar**.
2. URL: `https://SEU-APP.vercel.app/api/webhooks/hotmart`
3. Selecione eventos: `PURCHASE_APPROVED`, `PURCHASE_COMPLETE`, `PURCHASE_REFUNDED`, `PURCHASE_CHARGEBACK`, `PURCHASE_CANCELED`.
4. Copie o **hottok** gerado.
5. No Applyfy, vá em **Admin → Configurações → Hotmart** e cole o hottok.

### 3. Configurar Stripe

1. Acesse [dashboard.stripe.com](https://dashboard.stripe.com) → **Developers → Webhooks → Add endpoint**.
2. Endpoint URL: `https://SEU-APP.vercel.app/api/webhooks/stripe`
3. Event: `checkout.session.completed`.
4. Copie o **Signing secret** (`whsec_...`).
5. No Applyfy, vá em **Admin → Configurações → Stripe** e cole o secret.
6. Ao criar checkout sessions, envie `metadata`:
   ```js
   stripe.checkout.sessions.create({
     // ...
     metadata: { courseId: "<uuid-do-curso-no-applyfy>" },
     // ou: metadata: { externalProductId: "prod_XXXX" }
   });
   ```

Os segredos são armazenados criptografados no banco e nunca são exibidos em texto puro após salvar. Cancelamentos/estornos revogam o acesso automaticamente (enrollment → `CANCELLED`).

## Scripts

```bash
npm run dev      # dev server
npm run build    # build de produção
npm run start    # server de produção
```

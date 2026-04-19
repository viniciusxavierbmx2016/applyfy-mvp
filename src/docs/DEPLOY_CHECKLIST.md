# Deploy Checklist - Members Club

## Variaveis de Ambiente (Vercel Dashboard)

### Obrigatorias
- `NEXT_PUBLIC_APP_URL` = `https://app.mymembersclub.com.br`
- `NEXT_PUBLIC_SITE_URL` = `https://app.mymembersclub.com.br`
- `NEXT_PUBLIC_SUPABASE_URL` = (ja configurada)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (ja configurada)
- `SUPABASE_SERVICE_ROLE_KEY` = (ja configurada)
- `DATABASE_URL` = (ja configurada)
- `DIRECT_URL` = (ja configurada)

### Brevo (Emails)
- `BREVO_API_KEY` = API key v3 do Brevo

### Applyfy Gateway (Assinatura Members Club)
- `APPLYFY_PUBLIC_KEY` = chave publica da API Applyfy
- `APPLYFY_SECRET_KEY` = chave secreta da API Applyfy
- `MEMBERS_CLUB_PRODUCT_ID` = ID do produto no Applyfy
- `MEMBERS_CLUB_WEBHOOK_TOKEN` = token gerado ao criar webhook no Applyfy

## Configuracoes Externas

### Supabase
- Authentication > URL Configuration > Site URL: `https://app.mymembersclub.com.br`
- Authentication > URL Configuration > Redirect URLs: `https://app.mymembersclub.com.br/**`

### Applyfy Gateway
- Criar produto "Members Club Pro" (recorrente, R$ 97/mes)
- Configurar webhook: `https://app.mymembersclub.com.br/api/webhooks/members-club`
- Eventos: `TRANSACTION_PAID`, `TRANSACTION_CANCELED`, `TRANSACTION_REFUNDED`, `TRANSACTION_CHARGED_BACK`
- Guardar token gerado → `MEMBERS_CLUB_WEBHOOK_TOKEN`

### Brevo
- Adicionar dominio `mymembersclub.com.br`
- Configurar DNS: SPF, DKIM (2 registros), DMARC
- Criar sender: `noreply@mymembersclub.com.br`

### Vercel
- Dominio: `app.mymembersclub.com.br` (Production)
- Regiao: `gru1` (Sao Paulo)
- Build command: `npx prisma migrate deploy && npm run build`

### DNS (Vercel DNS)
- `CNAME app` → `vercel`
- `TXT @` → `brevo-code:a3754ed97a3324ba56b2a2e58658cdd1`
- `CNAME brevo1._domainkey` → `b1.mymembersclub-com-br.dkim.brevo.com`
- `CNAME brevo2._domainkey` → `b2.mymembersclub-com-br.dkim.brevo.com`
- `TXT _dmarc` → `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com`

## Pos-Deploy
- [ ] Testar login admin
- [ ] Testar login producer
- [ ] Testar login aluno em workspace
- [ ] Testar checkout de assinatura
- [ ] Testar envio de email (importar 1 aluno teste)
- [ ] Testar webhook de pagamento
- [ ] Verificar favicon dinamico
- [ ] Verificar tema forcado

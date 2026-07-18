#!/usr/bin/env bash
# 2.4 Peça A — teste manual do shared-store Upstash (staging).
# Uso: ./scripts/burst-rate-limit.sh  [rota]   (default: /api/auth/login)
#
# Roteiro do dono (DEPOIS de colar UPSTASH_REDIS_REST_URL/TOKEN no .env.staging
# e subir `npm run dev:staging`):
#   1. Rodar este script → dispara 105 requests → a #101 vira 429.
#   2. ⚠️ MATAR e REINICIAR o dev no meio da janela de 60s (Ctrl+C + npm run dev:staging).
#   3. Rodar `./scripts/burst-rate-limit.sh --one` → 1 request só → AINDA 429
#      (a contagem sobreviveu ao restart = prova do store compartilhado; o Map nunca faz isso).
#   4. Remover as 2 env do .env.staging → volta ao fallback local.
set -euo pipefail
ROUTE="${2:-/api/auth/login}"
URL="http://localhost:3000${ROUTE}"
BODY='{"email":"x@x.com","password":"x"}'

if [ "${1:-}" = "--one" ]; then
  echo -n "1 request em ${ROUTE} → "
  curl -s -o /dev/null -w "%{http_code}\n" -X POST "$URL" \
    -H "Content-Type: application/json" -d "$BODY"
  exit 0
fi

echo "Burst 105× ${ROUTE} (mostra os últimos 8 status; a #101 deve virar 429):"
for i in $(seq 1 105); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST "$URL" \
    -H "Content-Type: application/json" -d "$BODY"
done | tail -8

import { prisma } from "@/lib/prisma";
import { safeCompare } from "@/lib/safe-compare";
import { getRequestMeta } from "@/lib/audit";

// 2.4 Peça B.1 — origin lockdown em MODO-OBSERVAÇÃO.
//
// Roda em NODE (chamado das rotas, NÃO no proxy — o proxy é edge e não escreve
// Prisma). Detecta requests que chegaram SEM o carimbo do Cloudflare, REGISTRA e
// SEMPRE deixa passar. Zero bloqueio nesta fase (o enforce é a Peça B.2).
//
// O carimbo = um SEGREDO nosso (ORIGIN_LOCK_SECRET) que o Cloudflare injeta via
// Transform Rule no header `x-origin-lock`. Validamos o VALOR (safeCompare), não a
// presença — um header sem segredo é forjável. Um request que fura o Cloudflare
// (direto no *.vercel.app) não carrega o segredo → é observado.
//
// ⚠️ Deploy-safe sem a env: se ORIGIN_LOCK_SECRET faltar, `hasValidStamp` é sempre
// false → tudo vira registro, mas NADA bloqueia. A ausência da env não quebra nada
// (e um flood de registros na tela seria o próprio sinal de que a env não carregou).
export type OriginLockReason = "no-stamp" | "webhook-external" | "exempt-cron";

const STAMP_HEADER = "x-origin-lock";

export async function observeOrigin(
  request: Request,
  exemptReason?: Extract<OriginLockReason, "webhook-external" | "exempt-cron">
): Promise<void> {
  try {
    const secret = process.env.ORIGIN_LOCK_SECRET;
    const stamp = request.headers.get(STAMP_HEADER);
    const hasValidStamp = !!secret && !!stamp && safeCompare(stamp, secret);
    if (hasValidStamp) return; // veio pelo Cloudflare com o carimbo → silêncio

    const { pathname } = new URL(request.url);
    const { ip, userAgent } = getRequestMeta(request);
    await prisma.originLockLog.create({
      data: {
        path: pathname,
        method: request.method,
        ip,
        userAgent,
        reason: exemptReason ?? "no-stamp",
      },
    });
  } catch (err) {
    // Observação NUNCA quebra o request (swallow, como o logAudit).
    console.error("[originLock] observe error:", err);
  }
}

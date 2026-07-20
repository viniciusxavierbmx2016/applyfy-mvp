import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import type {
  GatewayAdapter,
  VerifyResult,
  CanonicalFields,
  GatewayContext,
} from "../types";

// FASE 6.1 — adapter Kiwify (2º gateway na fundação). Payload real capturado (JSON plano):
//   { webhook_event_type: "order_approved", order_id, payment_method,
//     Customer: {email, full_name, mobile, cnpj, ip}, Product: {product_id},
//     Commissions: {charge_amount} }
// Auth: assinatura HMAC na QUERY STRING (?signature=<40 hex>), NÃO header. Corpo JSON plano.
// Espelha o HMAC do Stripe (stripe/route.ts:32-52) trocando: sha256→sha1, header→query,
// SEM timestamp-prefix, secret global→por-ws cifrado (WorkspaceGatewaySecret gateway="kiwify").

// Zod tolerante — molde do hublaSchema (passthrough + tudo opcional/nullable).
const kiwifySchema = z
  .object({
    webhook_event_type: z.string().min(1).max(100).optional(),
    order_id: z.string().max(200).nullable().optional(),
    payment_method: z.string().max(50).nullable().optional(),
    Customer: z
      .object({
        email: z.string().max(255).nullable().optional(),
        full_name: z.string().max(255).nullable().optional(),
        mobile: z.string().max(50).nullable().optional(),
        cnpj: z.string().max(50).nullable().optional(),
        cpf: z.string().max(50).nullable().optional(), // defensivo — Kiwify pode mandar cpf tb
        ip: z.string().max(100).nullable().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
    Product: z
      .object({
        product_id: z.string().max(200).nullable().optional(),
        product_name: z.string().max(255).nullable().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
    Commissions: z
      .object({ charge_amount: z.coerce.number().nullable().optional() }) // coerce — pode vir string
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough();

type KiwifyPayload = z.infer<typeof kiwifySchema>;

const GRANT_EVENTS = new Set(["order_approved"]);
// ⚠️ nomes PROVÁVEIS — CONFIRMAR a lista real de eventos de revoke da Kiwify.
const REVOKE_EVENTS = new Set([
  "order_refunded",
  "chargeback",
  "subscription_canceled",
]);

// Espelha o compare do Stripe (stripe/route.ts:43-51): sha1 (NÃO sha256), corpo CRU (SEM
// timestamp-prefix), guard de tamanho + timingSafeEqual.
// ⚠️⚠️ GATE DA FATIA — HIPÓTESE: HMAC-SHA1 sobre o CORPO CRU. Só se prova no staging:
// HMAC-sha1(corpo_capturado, secret) == a signature real. Se não bater → fallbacks
// (sha256; input com order_id concatenado; corpo exatamente como veio).
function hmacMatches(rawBody: string, secret: string, signature: string): boolean {
  const expected = crypto.createHmac("sha1", secret).update(rawBody, "utf8").digest("hex");
  const sig = signature.toLowerCase(); // digest("hex") é lowercase; a captura tb é
  if (sig.length !== expected.length) return false; // timingSafeEqual lança se difere
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

export const kiwifyAdapter: GatewayAdapter = {
  id: "kiwify",
  capabilities: {
    sendAccessEmail: true,
    // ⭐ Kiwify manda amount (Commissions.charge_amount) — o 1º da fundação a ligar isto.
    recordTransaction: true,
    // ⚠️ nasce true com os nomes prováveis; se a Kiwify não mandar revoke → false + set vazio.
    revoke: true,
  },
  dedupTxPath: ["order_id"],

  async verify(request: Request, ctx: GatewayContext): Promise<VerifyResult> {
    const rawBody = await request.text().catch(() => ""); // UMA vez; JSON.parse dele depois (nunca .json())
    const signature = new URL(request.url).searchParams.get("signature") || "";

    let json: unknown = {};
    try {
      json = JSON.parse(rawBody);
    } catch {
      json = {};
    }
    const parsed = kiwifySchema.safeParse(json);
    if (!parsed.success) {
      return { ok: false, reason: "zod", denyBody: { received: true }, idempotencyKey: null };
    }

    // Secret por-workspace, CIFRADO (WorkspaceGatewaySecret gateway="kiwify") — padrão Hubla.
    const rows = await prisma.workspaceGatewaySecret.findMany({
      where: { workspaceId: ctx.workspaceId, gateway: "kiwify" },
      select: { value: true },
    });
    const secrets = rows.map((r) => decrypt(r.value));

    const ok = !!signature && secrets.some((s) => hmacMatches(rawBody, s, signature));
    if (!ok) {
      return {
        ok: false,
        reason: "invalid signature",
        denyBody: { received: true },
        idempotencyKey: null,
      };
    }
    // Kiwify não tem header de idempotência → dedup via dedupTxPath (order_id).
    return { ok: true, payload: parsed.data, idempotencyKey: null };
  },

  parseEvent(payload) {
    const t = (payload as KiwifyPayload).webhook_event_type || "";
    if (GRANT_EVENTS.has(t)) return { action: "GRANT", rawEventName: t };
    if (REVOKE_EVENTS.has(t)) return { action: "REVOKE", rawEventName: t };
    return { action: "IGNORE", rawEventName: t || "UNKNOWN" };
  },

  extractFields(payload): CanonicalFields {
    const p = payload as KiwifyPayload;
    const c = p.Customer;
    return {
      email: c?.email?.trim().toLowerCase() || null,
      name: c?.full_name?.trim() || null,
      phone: c?.mobile?.trim() || null,
      document: (c?.cnpj ?? c?.cpf)?.trim() || null,
      transactionId: p.order_id?.trim() || null,
      // ⚠️ CONFIRMAR A UNIDADE no staging: se charge_amount vier em CENTAVOS (ex. 9700=R$97),
      // dividir por 100. A matriz (a) prova o valor gravado no ProducerTransaction.
      amount: p.Commissions?.charge_amount ?? null,
      paymentMethod: p.payment_method?.trim() || null,
      products: p.Product?.product_id ? [{ externalId: p.Product.product_id.trim() }] : [],
      trackProps: { ip: c?.ip || null },
    };
  },
};

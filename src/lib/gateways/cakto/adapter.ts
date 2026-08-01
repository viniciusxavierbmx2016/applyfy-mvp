import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { safeCompare } from "@/lib/safe-compare";
import type {
  GatewayAdapter,
  VerifyResult,
  CanonicalFields,
  GatewayContext,
} from "../types";

// FASE 6.1c — adapter Cakto (3º gateway na fundação). Payload REAL capturado (modo Individual):
//   { secret: "<uuid>", event: "purchase_approved",
//     data: { id, refId, customer: {name,email,phone,docNumber,docType},
//             offer: {id,name,price}, product: {id,name,short_id,type}, subscription,
//             status, baseAmount, discount, amount, fees, installments, paymentMethod,
//             paidAt, card: {lastDigits,brand} } }
//
// ⭐ 4º padrão de auth da fundação: SECRET NO CORPO (raiz do payload) — ao lado do
// token-no-corpo do Applyfy, do token-no-header da Hubla e do HMAC-SHA1-na-query da Kiwify.
// Molde: o verify da Hubla (json + safeCompare vs secret cifrado), trocando header→corpo.
//
// ⚠️ OS 2 MODOS: o produtor escolhe "Individual" (data = OBJETO) ou "Agrupado" (data =
// ARRAY) no painel da Cakto. Os DOIS chegam nesta mesma rota. Tudo aqui trabalha sobre a
// lista normalizada por itemsOf() — nunca sobre payload.data cru.

const itemSchema = z
  .object({
    id: z.string().max(200).nullable().optional(),
    // ⭐ amount em REAIS (não centavos) — PROVADO pelo payload real: "fees": 4.5 tem casa
    // decimal, e centavos seriam inteiros (450). "amount": 90 = R$90,00. NÃO dividir por 100.
    // (⚠️ o oposto da Kiwify, cujo charge_amount vem em centavos.)
    amount: z.coerce.number().nullable().optional(),
    paymentMethod: z.string().max(50).nullable().optional(),
    affiliate: z.string().max(255).nullable().optional(),
    customer: z
      .object({
        name: z.string().max(255).nullable().optional(),
        email: z.string().max(255).nullable().optional(),
        phone: z.string().max(50).nullable().optional(),
        docNumber: z.string().max(50).nullable().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
    product: z
      .object({
        id: z.string().max(200).nullable().optional(),
        name: z.string().max(255).nullable().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough();

const caktoSchema = z
  .object({
    secret: z.string().max(500).nullable().optional(),
    event: z.string().min(1).max(100).optional(),
    data: z.union([itemSchema, z.array(itemSchema)]).nullable().optional(),
  })
  .passthrough();

type CaktoPayload = z.infer<typeof caktoSchema>;
type CaktoItem = z.infer<typeof itemSchema>;

// ⚠️ A normalização dos 2 modos, fonte ÚNICA (verify + extractFields consomem esta).
function itemsOf(p: CaktoPayload): CaktoItem[] {
  if (!p.data) return [];
  return Array.isArray(p.data) ? p.data : [p.data];
}

const GRANT_EVENTS = new Set(["purchase_approved"]);
// ⚠️ Nomes TÉCNICOS ASSUMIDOS pros rótulos do painel Cakto (Reembolso · Chargeback ·
// Assinatura cancelada) — CONFIRMAR capturando um evento real de cada. Só o GRANT
// (purchase_approved) está provado por payload. Se o nome real divergir, o REVOKE NÃO
// dispara e cai em IGNORE (com WebhookLog) — aluno reembolsado mantém acesso até ajustar.
const REVOKE_EVENTS = new Set(["refund", "chargeback", "subscription_canceled"]);

// IGNORE (o default já cobre; listados para leitura): purchase_refused · pix_gerado ·
// boleto_gerado · picpay_gerado · subscription_renewed · checkout_abandonment.

export const caktoAdapter: GatewayAdapter = {
  id: "cakto",
  capabilities: {
    sendAccessEmail: true,
    // Cakto manda amount → grava ProducerTransaction (vendas no dashboard do produtor).
    recordTransaction: true,
    // nasce true com os nomes assumidos acima; se a Cakto não mandar revoke → false + set vazio.
    revoke: true,
  },
  // ⚠️ SEM dedupTxPath — de propósito. Justificativa completa no verify.

  async verify(request: Request, ctx: GatewayContext): Promise<VerifyResult> {
    const raw = await request.json().catch(() => ({}));
    const parsed = caktoSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        reason: "zod",
        denyBody: { received: true },
        idempotencyKey: null,
      };
    }

    // Secret por-workspace, CIFRADO (WorkspaceGatewaySecret gateway="cakto") — padrão Hubla/Kiwify.
    const rows = await prisma.workspaceGatewaySecret.findMany({
      where: { workspaceId: ctx.workspaceId, gateway: "cakto" },
      select: { value: true },
    });
    const secrets = rows.map((r) => decrypt(r.value));

    // O secret vem no CORPO (raiz), não em header/query → safeCompare (constant-time).
    const provided = parsed.data.secret?.trim() || "";
    const ok = !!provided && secrets.some((s) => safeCompare(provided, s));
    if (!ok) {
      return {
        ok: false,
        reason: "invalid secret",
        denyBody: { received: true },
        idempotencyKey: null,
      };
    }

    // ⚠️ DEDUP DO EMAIL — por que idempotencyKey e não dedupTxPath:
    // A Cakto não manda header de idempotência, e um dedupTxPath ESTÁTICO não serve aqui:
    // o caminho até o txId MUDA com o modo escolhido pelo produtor (["data","id"] no
    // Individual vs ["data","0","id"] no Agrupado). E omitir o dedupTxPath significa ZERO
    // dedup — process-webhook.ts:225 exige `txId && adapter.dedupTxPath` e NÃO há else,
    // então N produtos = N emails e cada retry = mais um email.
    // Solução: sintetizar aqui o idempotencyKey a partir do corpo. O orquestrador injeta
    // `_idempotency` no rawPayload logado (process-webhook.ts:264-267) e consulta o path
    // FIXO ["_idempotency"] (:220) — imune ao formato do corpo. Mesmo caminho já provado
    // da Hubla, e cobre também o dedup ENTRE as iterações do loop multi-produto.
    const first = itemsOf(parsed.data)[0];
    const idempotencyKey = first?.id?.trim() || null;

    return { ok: true, payload: parsed.data, idempotencyKey };
  },

  parseEvent(payload) {
    const t = (payload as CaktoPayload).event || "";
    if (GRANT_EVENTS.has(t)) return { action: "GRANT", rawEventName: t };
    if (REVOKE_EVENTS.has(t)) return { action: "REVOKE", rawEventName: t };
    return { action: "IGNORE", rawEventName: t || "UNKNOWN" };
  },

  extractFields(payload): CanonicalFields {
    const items = itemsOf(payload as CaktoPayload);
    const head = items[0];
    const c = head?.customer;
    return {
      email: c?.email?.trim().toLowerCase() || null,
      name: c?.name?.trim() || null,
      phone: c?.phone?.trim() || null,
      // Cakto manda docNumber (+ docType "cpf"/"cnpj"); ensureUserByEmail cifra dentro.
      document: c?.docNumber?.trim() || null,
      transactionId: head?.id?.trim() || null,
      // ⭐ SEM /100 — o payload real traz reais (amount 90 = R$90,00; fees 4.5 é a prova).
      amount: head?.amount != null ? head.amount : null,
      paymentMethod: head?.paymentMethod?.trim() || null,
      // TODOS os items (modo Agrupado libera N cursos numa entrega só).
      products: items
        .map((i) => i.product?.id?.trim())
        .filter((id): id is string => !!id)
        .map((externalId) => ({ externalId })),
      trackProps: { affiliateCode: head?.affiliate?.trim() || null },
    };
  },
};

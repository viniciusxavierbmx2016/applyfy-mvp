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

// FASE 6.1d — adapter Perfect Pay (4º gateway na fundação, 5º do sistema).
// Auth = token no CORPO (raiz, string de 32) — mesmo padrão da Cakto, molde direto dela.
//
// ⭐ A DIFERENÇA ESTRUTURAL: a Perfect Pay NÃO manda nome de evento. Ela manda o STATUS
// NUMÉRICO da venda (`sale_status_enum`) e o adapter TRADUZ. É o 1º gateway da fundação
// cuja ação vem de um ESTADO, não de um verbo — o MESMO webhook (mesmo `code`) chega
// várias vezes ao longo do ciclo de vida da venda, mudando só o número.
//
// Payload real capturado (estrutura; dados pessoais fora):
//   { token, code: "PPCPMTB5CBA53J", sale_amount: 19.99, sale_status_enum: 2,
//     sale_status_enum_key: "approved", payment_type_enum_key: "credit_card",
//     product: { code: "PPPB4O4P", external_reference: null, guarantee: 7 },
//     plan: {...}, plan_itens: [], commission: [...],
//     customer: { full_name, email, identification_type: "CPF", identification_number,
//                 phone_area_code, phone_number, phone_formated_ddi, ip, user_agent,
//                 street_name: "", city: "", state: "", country: "BR" },
//     metadata: { utm_source, ref: "PPA129NQ" }, webhook_owner: "PPA129NQ" }

// Nomes do enum oficial — o NÚMERO é a fonte da decisão, isto aqui é para leitura/log.
const SALE_STATUS: Record<number, string> = {
  0: "none",
  1: "pending",
  2: "approved",
  3: "in_process",
  4: "in_mediation",
  5: "rejected",
  6: "cancelled",
  7: "refunded",
  8: "authorized",
  9: "charged_back",
  10: "completed",
  11: "checkout_error",
  12: "precheckout",
  13: "expired",
  16: "in_review",
};

const GRANT_STATUS = new Set([2]); // approved — o dinheiro entrou, libera
const REVOKE_STATUS = new Set([7, 9, 6]); // refunded · charged_back · cancelled

// ⚠️⚠️ TODO O RESTO É IGNORE (0,1,3,4,5,8,10,11,12,13,16) — e dois deles são armadilha.
// NÃO mover para GRANT sem ler isto:
//
//   10 "completed" (≈30 dias após a aprovação, fim do prazo de garantia) — parece a
//   "confirmação final da venda", mas o acesso JÁ FOI CONCEDIDO no status 2. Promovê-lo
//   a GRANT dispararia um SEGUNDO EMAIL DE ACESSO ~30 dias depois de CADA compra, e o
//   dedup do email NÃO pega: ele tem janela de 60s (process-webhook.ts:219) e o `code`
//   da venda é o mesmo nas duas chegadas. Resultado: todo comprador recebe um email
//   duplicado um mês depois. Mantenha em IGNORE.
//
//   8 "authorized" (pré-autorizado, ainda NÃO capturado) — o dinheiro não entrou.
//   Liberar aqui daria acesso a uma venda que ainda pode falhar na captura.

const perfectPaySchema = z
  .object({
    token: z.string().max(500).nullable().optional(),
    code: z.string().max(200).nullable().optional(),
    // ⚠️ coerce: o status pode chegar como número OU como string ("2").
    sale_status_enum: z.coerce.number().nullable().optional(),
    sale_status_enum_key: z.string().max(100).nullable().optional(),
    sale_amount: z.coerce.number().nullable().optional(),
    payment_type_enum_key: z.string().max(50).nullable().optional(),
    webhook_owner: z.string().max(200).nullable().optional(),
    customer: z
      .object({
        full_name: z.string().max(255).nullable().optional(),
        email: z.string().max(255).nullable().optional(),
        identification_type: z.string().max(20).nullable().optional(),
        identification_number: z.string().max(50).nullable().optional(),
        phone_formated_ddi: z.string().max(50).nullable().optional(),
        phone_area_code: z.string().max(10).nullable().optional(),
        phone_number: z.string().max(30).nullable().optional(),
        ip: z.string().max(100).nullable().optional(),
        // ⚠️ user_agent real passa de 200 chars ("Mozilla/5.0 (Linux; Android 12...").
        user_agent: z.string().max(1000).nullable().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
    product: z
      .object({
        code: z.string().max(200).nullable().optional(),
        name: z.string().max(255).nullable().optional(),
        external_reference: z.string().max(200).nullable().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
    metadata: z
      .object({ ref: z.string().max(255).nullable().optional() })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough();

type PerfectPayPayload = z.infer<typeof perfectPaySchema>;

export const perfectPayAdapter: GatewayAdapter = {
  id: "perfectpay",
  capabilities: {
    sendAccessEmail: true,
    // Perfect Pay manda sale_amount → grava ProducerTransaction.
    recordTransaction: true,
    revoke: true,
  },
  // SEM dedupTxPath — idempotencyKey sintetizado no verify (molde Cakto/Hubla).

  async verify(request: Request, ctx: GatewayContext): Promise<VerifyResult> {
    const raw = await request.json().catch(() => ({}));
    const parsed = perfectPaySchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        reason: "zod",
        denyBody: { received: true },
        idempotencyKey: null,
      };
    }

    // Secret por-workspace, CIFRADO (WorkspaceGatewaySecret gateway="perfectpay").
    const rows = await prisma.workspaceGatewaySecret.findMany({
      where: { workspaceId: ctx.workspaceId, gateway: "perfectpay" },
      select: { value: true },
    });
    const secrets = rows.map((r) => decrypt(r.value));

    // Token no CORPO (raiz), não em header/query → safeCompare (constant-time).
    const provided = parsed.data.token?.trim() || "";
    const ok = !!provided && secrets.some((s) => safeCompare(provided, s));
    if (!ok) {
      return {
        ok: false,
        reason: "invalid token",
        denyBody: { received: true },
        idempotencyKey: null,
      };
    }

    // Dedup do email pelo `code` da venda. Aqui um dedupTxPath ["code"] FUNCIONARIA (o
    // shape é fixo, diferente da Cakto) — o idempotencyKey é escolha de padronização:
    // path FIXO ["_idempotency"] (process-webhook.ts:220), imune a mudança de shape, e é
    // o caminho já provado da Hubla e da Cakto. ⚠️ Omitir os DOIS = ZERO dedup
    // (process-webhook.ts:225 exige `txId && adapter.dedupTxPath` e NÃO há else).
    const idempotencyKey = parsed.data.code?.trim() || null;

    return { ok: true, payload: parsed.data, idempotencyKey };
  },

  parseEvent(payload) {
    const p = payload as PerfectPayPayload;
    const n = p.sale_status_enum;
    // rawEventName legível pro WebhookLog: "approved (2)". A STRING é só rótulo — a
    // decisão vem SEMPRE do número (o campo canônico do gateway).
    const label =
      p.sale_status_enum_key?.trim() || (n != null ? SALE_STATUS[n] : null);
    const rawEventName =
      n != null ? `${label ?? "unknown"} (${n})` : "UNKNOWN";
    if (n != null && GRANT_STATUS.has(n)) return { action: "GRANT", rawEventName };
    if (n != null && REVOKE_STATUS.has(n)) return { action: "REVOKE", rawEventName };
    return { action: "IGNORE", rawEventName };
  },

  extractFields(payload): CanonicalFields {
    const p = payload as PerfectPayPayload;
    const c = p.customer;
    // Telefone: o payload real já traz montado com DDI; os pedaços são fallback.
    const phone =
      c?.phone_formated_ddi?.trim() ||
      [c?.phone_area_code?.trim(), c?.phone_number?.trim()]
        .filter(Boolean)
        .join("") ||
      null;
    return {
      email: c?.email?.trim().toLowerCase() || null,
      name: c?.full_name?.trim() || null,
      phone,
      // identification_number cru (identification_type diz CPF ou CNPJ);
      // ensureUserByEmail cifra dentro (webhook-helpers).
      document: c?.identification_number?.trim() || null,
      transactionId: p.code?.trim() || null,
      // ⭐ REAIS, SEM /100 — payload real: 19.99 (a casa decimal prova). Igual à Cakto,
      // OPOSTO da Kiwify (centavos). A unidade do amount é DADO por gateway, nunca convenção.
      amount: p.sale_amount != null ? p.sale_amount : null,
      // ⭐ já vem traduzido pelo gateway ("credit_card") — sem mapa nosso.
      paymentMethod: p.payment_type_enum_key?.trim() || null,
      // ⭐ product.code é o canônico (external_reference veio NULL no payload real).
      // A cascata aceita external_reference SE o produtor um dia preenchê-lo (é o campo
      // onde ele põe o ID dele) — o code sempre ganha quando existe, então isto nunca
      // muda o comportamento de hoje.
      products: p.product?.code?.trim()
        ? [{ externalId: p.product.code.trim() }]
        : p.product?.external_reference?.trim()
          ? [{ externalId: p.product.external_reference.trim() }]
          : [],
      // ⭐ 1º adapter da FUNDAÇÃO a preencher os 3 trackProps (a rota escopada do Applyfy
      // já preenchia fora dela). purchaseDevice sai do user_agent — inédito na fundação.
      trackProps: {
        ip: c?.ip?.trim() || null,
        userAgent: c?.user_agent?.trim() || null,
        affiliateCode: p.metadata?.ref?.trim() || p.webhook_owner?.trim() || null,
      },
    };
  },
};

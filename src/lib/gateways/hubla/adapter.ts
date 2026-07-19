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

// FASE 6.0 — o 1º adapter (Hubla). Payload real capturado:
//   { type: "customer.member_added" | "customer.member_removed",
//     event: { user|payer: {email,firstName,lastName,phone,document},
//              products: [{id,name}], subscription: {id, firstPaymentSession?: {ip}} } }
// Auth (headers da conta Hubla): x-hubla-token (valor cru), x-hubla-idempotency, x-hubla-sandbox.

// Zod tolerante — molde do applyfyWebhookSchema (passthrough + tudo opcional/nullable).
const person = z
  .object({
    email: z.string().max(255).nullable().optional(),
    firstName: z.string().max(255).nullable().optional(),
    lastName: z.string().max(255).nullable().optional(),
    name: z.string().max(255).nullable().optional(),
    phone: z.string().max(50).nullable().optional(),
    document: z.string().max(50).nullable().optional(),
  })
  .passthrough()
  .nullable()
  .optional();

const hublaSchema = z
  .object({
    type: z.string().min(1).max(100).optional(),
    event: z
      .object({
        user: person,
        payer: person, // leitura defensiva: fallback quando o user vem incompleto
        products: z
          .array(
            z
              .object({
                id: z.string().max(200).nullable().optional(),
                name: z.string().max(255).nullable().optional(),
              })
              .passthrough()
          )
          .nullable()
          .optional(),
        subscription: z
          .object({
            id: z.string().max(200).nullable().optional(),
            firstPaymentSession: z
              .object({ ip: z.string().max(100).nullable().optional() })
              .passthrough()
              .nullable()
              .optional(),
          })
          .passthrough()
          .nullable()
          .optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough();

type HublaPayload = z.infer<typeof hublaSchema>;

const GRANT_EVENTS = new Set(["customer.member_added"]);
const REVOKE_EVENTS = new Set(["customer.member_removed"]);

export const hublaAdapter: GatewayAdapter = {
  id: "hubla",
  capabilities: {
    sendAccessEmail: true,
    // O payload Hubla capturado NÃO traz amount → não há venda pra registrar.
    recordTransaction: false,
    revoke: true,
  },
  dedupTxPath: ["event", "subscription", "id"],

  async verify(request: Request, ctx: GatewayContext): Promise<VerifyResult> {
    const idempotencyKey = request.headers.get("x-hubla-idempotency");
    const sandbox = request.headers.get("x-hubla-sandbox") != null;

    const raw = await request.json().catch(() => ({}));
    const parsed = hublaSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, reason: "zod", denyBody: { received: true }, idempotencyKey, sandbox };
    }

    // Secret por-workspace, CIFRADO (WorkspaceGatewaySecret gateway="hubla").
    const rows = await prisma.workspaceGatewaySecret.findMany({
      where: { workspaceId: ctx.workspaceId, gateway: "hubla" },
      select: { value: true },
    });
    const secrets = rows.map((r) => decrypt(r.value));

    // Token cru no header x-hubla-token (SEM Bearer) → safeCompare (constant-time).
    const provided = request.headers.get("x-hubla-token") || "";
    const ok = !!provided && secrets.some((s) => safeCompare(provided, s));
    if (!ok) {
      return {
        ok: false,
        reason: "invalid token",
        denyBody: { received: true },
        idempotencyKey,
        sandbox,
      };
    }

    return { ok: true, payload: parsed.data, idempotencyKey, sandbox };
  },

  parseEvent(payload) {
    const t = (payload as HublaPayload).type || "";
    if (GRANT_EVENTS.has(t)) return { action: "GRANT", rawEventName: t };
    if (REVOKE_EVENTS.has(t)) return { action: "REVOKE", rawEventName: t };
    return { action: "IGNORE", rawEventName: t || "UNKNOWN" };
  },

  extractFields(payload): CanonicalFields {
    const p = payload as HublaPayload;
    const u = p.event?.user;
    const py = p.event?.payer;

    // Leitura defensiva: user primeiro, payer como fallback (o user às vezes vem incompleto).
    const email = (u?.email ?? py?.email)?.trim().toLowerCase() || null;
    const first = u?.firstName ?? py?.firstName;
    const last = u?.lastName ?? py?.lastName;
    const composed = [first, last].filter(Boolean).join(" ");
    const name = composed || u?.name || py?.name || null;
    const phone = (u?.phone ?? py?.phone)?.trim() || null;
    const document = (u?.document ?? py?.document)?.trim() || null;

    return {
      email,
      name,
      phone,
      document,
      transactionId: p.event?.subscription?.id?.trim() || null,
      amount: null, // Hubla não manda
      paymentMethod: null,
      products: (p.event?.products ?? [])
        .map((pr) => ({ externalId: pr?.id?.trim() }))
        .filter((x): x is { externalId: string } => !!x.externalId),
      trackProps: {
        ip: p.event?.subscription?.firstPaymentSession?.ip || null, // free não tem → null
      },
    };
  },
};

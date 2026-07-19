// FASE 6.0 — o contrato do adapter de gateway (fundação multi-gateway).
// A lib comum (process-webhook.ts) orquestra o fluxo canônico (o da rota ESCOPADA
// do Applyfy) chamando os helpers neutros; cada gateway novo implementa GatewayAdapter.
// O Applyfy fica na sua rota própria (INTOCADO) — esta fundação nasce pro Hubla.

export type GatewayAction = "GRANT" | "REVOKE" | "IGNORE";

// O produto a liberar: por externalId (Hubla/Applyfy) OU courseId direto (metadata estilo Stripe).
export interface CanonicalProduct {
  externalId?: string;
  courseId?: string;
}

// Campos canônicos — a UNIÃO do que cada gateway extrai do seu payload.
export interface CanonicalFields {
  email: string | null;
  name?: string | null;
  phone?: string | null;
  document?: string | null; // cru; ensureUserByEmail cifra dentro (webhook-helpers.ts)
  transactionId?: string | null;
  amount?: number | null;
  paymentMethod?: string | null;
  products: CanonicalProduct[];
  trackProps?: {
    ip?: string | null;
    userAgent?: string | null;
    affiliateCode?: string | null;
  };
}

export interface VerifyResult {
  ok: boolean;
  payload?: unknown; // corpo já parseado (json ou do text cru) — o adapter resolve
  reason?: string; // pra logar quando !ok
  denyBody?: unknown; // corpo EXATO do 200 quando !ok (preserva o contrato de resposta)
  idempotencyKey?: string | null; // header de idempotência do gateway (dedup mais forte que o txId)
  sandbox?: boolean; // metadado: o gateway sinalizou ambiente de teste
}

export interface GatewayContext {
  workspaceId: string; // resolvido do [slug] ANTES (rota por-gateway/[slug])
  slug: string;
}

export interface GatewayCapabilities {
  sendAccessEmail: boolean;
  recordTransaction: boolean;
  revoke: boolean;
}

export interface GatewayAdapter {
  id: string; // "hubla" | ...
  capabilities: GatewayCapabilities;
  // Path do txId dentro do rawPayload, pro dedup por transação quando não há idempotencyKey.
  dedupTxPath?: string[];
  // Lê o corpo (json vs text), CARREGA os próprios secrets, autentica. ANTES do parse comum.
  verify(request: Request, ctx: GatewayContext): Promise<VerifyResult>;
  // Normaliza a ação.
  parseEvent(payload: unknown): { action: GatewayAction; rawEventName: string };
  // Extrai os campos no formato canônico.
  extractFields(payload: unknown): CanonicalFields;
}

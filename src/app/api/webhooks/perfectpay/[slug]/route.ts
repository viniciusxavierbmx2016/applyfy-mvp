import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { observeOrigin } from "@/lib/origin-lock";
import { processGatewayWebhook } from "@/lib/gateways/process-webhook";
import { perfectPayAdapter } from "@/lib/gateways/perfectpay/adapter";

// FASE 6.1d — webhook Perfect Pay, escopado por workspace (slug). Fina: resolve o ws e
// delega pra lib comum + o adapter. Clone da rota Cakto (observeOrigin na 1ª linha — NÃO
// consome o corpo; try/catch retornando 200 sempre; sem rateLimit). O token vem no CORPO.

export async function POST(
  request: Request,
  props: { params: Promise<{ slug: string }> }
) {
  await observeOrigin(request, "webhook-external"); // 2.4 B.1 observe-mode
  const { slug } = await props.params;
  try {
    const ws = await prisma.workspace.findUnique({
      where: { slug },
      select: { id: true, slug: true, isActive: true },
    });
    if (!ws || !ws.isActive) {
      return NextResponse.json(
        { ok: false, error: "Workspace not found" },
        { status: 200 }
      );
    }
    return await processGatewayWebhook(perfectPayAdapter, request, {
      workspaceId: ws.id,
      slug: ws.slug,
    });
  } catch (err) {
    console.error("[perfectpay webhook] processing error:", err);
    return NextResponse.json(
      { ok: false, error: "Webhook processing failed" },
      { status: 200 }
    );
  }
}

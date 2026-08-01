import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { observeOrigin } from "@/lib/origin-lock";
import { processGatewayWebhook } from "@/lib/gateways/process-webhook";
import { caktoAdapter } from "@/lib/gateways/cakto/adapter";

// FASE 6.1c — webhook Cakto, escopado por workspace (slug). Fina: resolve o ws e delega
// pra lib comum + o adapter. Clone da rota Kiwify (observeOrigin na 1ª linha — NÃO consome
// o corpo; try/catch retornando 200 sempre; sem rateLimit). O secret da Cakto vem no CORPO,
// então aqui não há nada a extrair da URL além do [slug].

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
    return await processGatewayWebhook(caktoAdapter, request, {
      workspaceId: ws.id,
      slug: ws.slug,
    });
  } catch (err) {
    console.error("[cakto webhook] processing error:", err);
    return NextResponse.json(
      { ok: false, error: "Webhook processing failed" },
      { status: 200 }
    );
  }
}

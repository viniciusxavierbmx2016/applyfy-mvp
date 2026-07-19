import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { observeOrigin } from "@/lib/origin-lock";
import { processGatewayWebhook } from "@/lib/gateways/process-webhook";
import { hublaAdapter } from "@/lib/gateways/hubla/adapter";

// FASE 6.0 — webhook Hubla, escopado por workspace (slug). Fina: resolve o ws e
// delega pra lib comum + o adapter. Molde da rota escopada do Applyfy (observeOrigin
// na 1ª linha, try/catch retornando 200 sempre, sem rateLimit).

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
    return await processGatewayWebhook(hublaAdapter, request, {
      workspaceId: ws.id,
      slug: ws.slug,
    });
  } catch (err) {
    console.error("[hubla webhook] processing error:", err);
    return NextResponse.json(
      { ok: false, error: "Webhook processing failed" },
      { status: 200 }
    );
  }
}

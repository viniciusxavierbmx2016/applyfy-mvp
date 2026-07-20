import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { resolveStaffWorkspace, requireWorkspaceOwner } from "@/lib/workspace";
import { encrypt, decrypt } from "@/lib/encryption";

// FASE 6.1 Kiwify — CRUD do secret do webhook Kiwify (WorkspaceGatewaySecret, gateway="kiwify").
// Clone do hubla-secrets: o value é CIFRADO via encrypt() na escrita e mascarado
// (decrypt+mask) na leitura — nunca devolve o valor cru. O secret é a chave do HMAC.

const GATEWAY = "kiwify";
const MAX_SECRETS_PER_WORKSPACE = 5;

const createSchema = z.object({
  value: z.string().min(1).max(200),
  label: z.string().max(100).optional(),
});

function mask(value: string) {
  if (value.length <= 4) return "••••";
  return "••••" + value.slice(-4);
}

function handleError(error: unknown) {
  const msg = error instanceof Error ? error.message : "";
  const status =
    msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
  console.error("/api/producer/integrations/kiwify-secrets error:", error);
  return NextResponse.json({ error: msg || "Erro" }, { status });
}

export async function GET() {
  try {
    const staff = await requireStaff();
    const { workspace } = await resolveStaffWorkspace(staff);
    if (!workspace) {
      return NextResponse.json({ tokens: [] });
    }
    const gate = await requireWorkspaceOwner(staff, workspace.id);
    if (!gate.ok) return gate.response;

    const rows = await prisma.workspaceGatewaySecret.findMany({
      where: { workspaceId: workspace.id, gateway: GATEWAY },
      orderBy: { createdAt: "asc" },
      select: { id: true, label: true, value: true, createdAt: true, lastUsedAt: true },
    });
    return NextResponse.json({
      tokens: rows.map((r) => ({
        id: r.id,
        label: r.label,
        createdAt: r.createdAt,
        lastUsedAt: r.lastUsedAt,
        maskedValue: mask(decrypt(r.value)),
      })),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const staff = await requireStaff();
    const { workspace } = await resolveStaffWorkspace(staff);
    if (!workspace) {
      return NextResponse.json(
        {
          error:
            "Nenhum workspace ativo. Selecione um workspace antes de adicionar tokens.",
        },
        { status: 400 }
      );
    }
    const gate = await requireWorkspaceOwner(staff, workspace.id);
    if (!gate.ok) return gate.response;

    const raw = await request.json().catch(() => ({}));
    const parsed = createSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Token inválido" }, { status: 400 });
    }
    const value = parsed.data.value.trim();
    const label = parsed.data.label?.trim() || "Principal";
    if (!value) {
      return NextResponse.json({ error: "Token vazio" }, { status: 400 });
    }

    const rows = await prisma.workspaceGatewaySecret.findMany({
      where: { workspaceId: workspace.id, gateway: GATEWAY },
      select: { value: true },
    });
    if (rows.length >= MAX_SECRETS_PER_WORKSPACE) {
      return NextResponse.json(
        { error: `Máximo de ${MAX_SECRETS_PER_WORKSPACE} tokens atingido` },
        { status: 400 }
      );
    }
    // Duplicidade: compara os valores decifrados (o cifrado é não-determinístico — IV aleatório).
    if (rows.some((r) => decrypt(r.value) === value)) {
      return NextResponse.json(
        { error: "Este token já está cadastrado neste workspace" },
        { status: 409 }
      );
    }

    const created = await prisma.workspaceGatewaySecret.create({
      data: { workspaceId: workspace.id, gateway: GATEWAY, value: encrypt(value), label },
      select: { id: true, label: true, createdAt: true },
    });

    return NextResponse.json({
      id: created.id,
      label: created.label,
      createdAt: created.createdAt,
      maskedValue: mask(value),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const staff = await requireStaff();
    const { workspace } = await resolveStaffWorkspace(staff);
    if (!workspace) {
      return NextResponse.json({ error: "Nenhum workspace ativo." }, { status: 400 });
    }
    const gate = await requireWorkspaceOwner(staff, workspace.id);
    if (!gate.ok) return gate.response;

    const { searchParams } = new URL(request.url);
    const id = (searchParams.get("id") || "").trim();
    if (!id) {
      return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    }

    // Cross-tenant guard: nunca apaga um secret de outro workspace/gateway.
    const secret = await prisma.workspaceGatewaySecret.findUnique({
      where: { id },
      select: { id: true, workspaceId: true, gateway: true },
    });
    if (!secret || secret.workspaceId !== workspace.id || secret.gateway !== GATEWAY) {
      return NextResponse.json({ error: "Token não encontrado" }, { status: 404 });
    }

    await prisma.workspaceGatewaySecret.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { resolveStaffWorkspace } from "@/lib/workspace";

const MAX_TOKENS_PER_WORKSPACE = 5;

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
  console.error(
    "/api/producer/integrations/applyfy-tokens error:",
    error
  );
  return NextResponse.json({ error: msg || "Erro" }, { status });
}

// Keep the legacy Settings row (`applyfy_token:<wsId>`) in sync with the new
// table so the webhook's fallback path stays consistent during the transition
// window. The mirror is always the oldest remaining token; empty → row deleted.
async function syncLegacySettings(workspaceId: string) {
  const oldest = await prisma.workspaceApplyfyToken.findFirst({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
    select: { value: true },
  });
  const key = `applyfy_token:${workspaceId}`;
  if (oldest) {
    await prisma.settings.upsert({
      where: { key },
      create: { key, value: oldest.value },
      update: { value: oldest.value },
    });
  } else {
    await prisma.settings.deleteMany({ where: { key } });
  }
}

export async function GET() {
  try {
    const staff = await requireStaff();
    const { workspace } = await resolveStaffWorkspace(staff);
    if (!workspace) {
      return NextResponse.json({ tokens: [] });
    }
    const rows = await prisma.workspaceApplyfyToken.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        label: true,
        value: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });
    return NextResponse.json({
      tokens: rows.map((r) => ({
        id: r.id,
        label: r.label,
        createdAt: r.createdAt,
        lastUsedAt: r.lastUsedAt,
        maskedValue: mask(r.value),
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

    const raw = await request.json().catch(() => ({}));
    const parsed = createSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Token inválido" }, { status: 400 });
    }
    const value = parsed.data.value.trim();
    const label = parsed.data.label?.trim() || "Token principal";
    if (!value) {
      return NextResponse.json({ error: "Token vazio" }, { status: 400 });
    }

    const [count, existing] = await Promise.all([
      prisma.workspaceApplyfyToken.count({
        where: { workspaceId: workspace.id },
      }),
      prisma.workspaceApplyfyToken.findFirst({
        where: { workspaceId: workspace.id, value },
        select: { id: true },
      }),
    ]);
    if (count >= MAX_TOKENS_PER_WORKSPACE) {
      return NextResponse.json(
        {
          error: `Máximo de ${MAX_TOKENS_PER_WORKSPACE} tokens atingido`,
        },
        { status: 400 }
      );
    }
    if (existing) {
      return NextResponse.json(
        { error: "Este token já está cadastrado neste workspace" },
        { status: 409 }
      );
    }

    const created = await prisma.workspaceApplyfyToken.create({
      data: { workspaceId: workspace.id, value, label },
      select: { id: true, label: true, value: true, createdAt: true },
    });

    await syncLegacySettings(workspace.id);

    return NextResponse.json({
      id: created.id,
      label: created.label,
      createdAt: created.createdAt,
      maskedValue: mask(created.value),
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
      return NextResponse.json(
        { error: "Nenhum workspace ativo." },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = (searchParams.get("id") || "").trim();
    if (!id) {
      return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    }

    // Cross-tenant guard: never delete a token from another workspace.
    const token = await prisma.workspaceApplyfyToken.findUnique({
      where: { id },
      select: { id: true, workspaceId: true },
    });
    if (!token || token.workspaceId !== workspace.id) {
      return NextResponse.json(
        { error: "Token não encontrado" },
        { status: 404 }
      );
    }

    await prisma.workspaceApplyfyToken.delete({ where: { id } });
    await syncLegacySettings(workspace.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}

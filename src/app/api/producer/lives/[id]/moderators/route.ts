import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, requirePermission } from "@/lib/auth";
import { resolveStaffWorkspace } from "@/lib/workspace";
import { hasWorkspaceAccess } from "@/lib/workspace-access";
import { liveModeratorSchema, validateBody } from "@/lib/validations";

async function verifyOwnership(params: { id: string }) {
  const staff = await requireStaff();
  const { workspace } = await resolveStaffWorkspace(staff);
  if (!workspace) throw new Error("Sem permissão");
  await requirePermission(staff, "MANAGE_LIVES");

  const live = await prisma.live.findFirst({
    where: { id: params.id, workspaceId: workspace.id },
    select: { id: true },
  });
  if (!live) throw new Error("Live não encontrada");
  return { workspace, live };
}

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    await verifyOwnership(params);

    const moderators = await prisma.liveModerator.findMany({
      where: { liveId: params.id },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ moderators });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : msg === "Live não encontrada" ? 404 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const { workspace } = await verifyOwnership(params);

    const raw = await request.json().catch(() => ({}));
    const v = validateBody(liveModeratorSchema, raw);
    if (!v.success) return v.error;
    const { userId } = v.data;
    if (!userId) {
      return NextResponse.json({ error: "userId é obrigatório" }, { status: 400 });
    }

    // Cross-tenant guard (gêmeo do FURO#5): userId vem do body cru e não é
    // amarrado ao workspace. Sem isto, staff do ws A planta uma conta de outro
    // tenant como moderador da live do A (ganha poder de deletar mensagens do
    // chat via lives/[id]/messages/[messageId]). 404 esconde existência.
    if (!(await hasWorkspaceAccess(userId, workspace.id))) {
      return NextResponse.json(
        { error: "Usuário não encontrado neste workspace" },
        { status: 404 }
      );
    }

    const existing = await prisma.liveModerator.findUnique({
      where: { liveId_userId: { liveId: params.id, userId } },
    });
    if (existing) {
      return NextResponse.json({ error: "Já é moderador" }, { status: 409 });
    }

    const mod = await prisma.liveModerator.create({
      data: { liveId: params.id, userId },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, email: true } },
      },
    });

    return NextResponse.json({ moderator: mod }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : msg === "Live não encontrada" ? 404 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    await verifyOwnership(params);

    const raw = await request.json().catch(() => ({}));
    const v = validateBody(liveModeratorSchema, raw);
    if (!v.success) return v.error;
    const { userId } = v.data;
    if (!userId) {
      return NextResponse.json({ error: "userId é obrigatório" }, { status: 400 });
    }

    await prisma.liveModerator.deleteMany({
      where: { liveId: params.id, userId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : msg === "Live não encontrada" ? 404 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function DELETE(
  _request: Request,
  props: { params: Promise<{ id: string; messageId: string }> }
) {
  const params = await props.params;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const message = await prisma.liveMessage.findUnique({
      where: { id: params.messageId },
      select: { id: true, liveId: true },
    });
    if (!message || message.liveId !== params.id) {
      return NextResponse.json({ error: "Mensagem não encontrada" }, { status: 404 });
    }

    const live = await prisma.live.findUnique({
      where: { id: params.id },
      include: { workspace: { select: { ownerId: true } } },
    });
    if (!live) {
      return NextResponse.json({ error: "Live não encontrada" }, { status: 404 });
    }

    const isOwner = live.workspace.ownerId === user.id;
    const isAdmin = user.role === "ADMIN";

    let isCollaborator = false;
    if (!isOwner && !isAdmin) {
      const collab = await prisma.collaborator.findFirst({
        where: { userId: user.id, workspaceId: live.workspaceId, status: "ACCEPTED" },
        select: { id: true },
      });
      isCollaborator = !!collab;
    }

    let isMod = false;
    if (!isOwner && !isAdmin && !isCollaborator) {
      const mod = await prisma.liveModerator.findUnique({
        where: { liveId_userId: { liveId: params.id, userId: user.id } },
      });
      isMod = !!mod;
    }

    if (!isOwner && !isAdmin && !isCollaborator && !isMod) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    await prisma.liveMessage.delete({ where: { id: params.messageId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/lives/[id]/messages/[messageId] error:", error);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}

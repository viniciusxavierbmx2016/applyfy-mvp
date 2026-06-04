import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasWorkspaceAccess } from "@/lib/workspace-access";

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const live = await prisma.live.findUnique({
      where: { id: params.id },
      include: {
        course: { select: { id: true, title: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 100,
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
        workspace: { select: { id: true, slug: true, name: true, ownerId: true } },
      },
    });

    if (!live) {
      return NextResponse.json({ error: "Live não encontrada" }, { status: 404 });
    }

    // Isolation gate: every role except ADMIN must prove workspace access.
    if (user.role !== "ADMIN") {
      const allowed = await hasWorkspaceAccess(user.id, live.workspace.id);
      if (!allowed) {
        return NextResponse.json({ error: "Sem acesso" }, { status: 403 });
      }
    }

    // Student content restrictions: a COURSE_ONLY live needs an ACTIVE
    // enrollment, and a closed room is off-limits. Staff (owner / collaborator
    // / admin) manage the live and are exempt — same as before this change.
    if (user.role === "STUDENT") {
      if (live.visibility === "COURSE_ONLY" && live.courseId) {
        const enrollment = await prisma.enrollment.findFirst({
          where: { userId: user.id, courseId: live.courseId, status: "ACTIVE" },
          select: { id: true },
        });
        if (!enrollment) {
          return NextResponse.json({ error: "Você não tem acesso a esta live" }, { status: 403 });
        }
      }

      if (!live.roomOpen) {
        return NextResponse.json({ error: "Sala fechada" }, { status: 403 });
      }
    }

    // Moderator = owner of THIS workspace, ADMIN, an accepted collaborator of
    // THIS workspace, or an explicit LiveModerator for this live. NOT any
    // platform PRODUCER — that let a producer from another workspace moderate
    // this live (cross-tenant privilege escalation). Mirrors the authorization
    // in DELETE /api/lives/[id]/messages/[messageId].
    const isOwner = live.workspace.ownerId === user.id;
    const isAdmin = user.role === "ADMIN";
    let isCollaborator = false;
    if (!isOwner && !isAdmin) {
      const collab = await prisma.collaborator.findFirst({
        where: { userId: user.id, workspaceId: live.workspace.id, status: "ACCEPTED" },
        select: { id: true },
      });
      isCollaborator = !!collab;
    }
    let isExplicitMod = false;
    if (!isOwner && !isAdmin && !isCollaborator) {
      const mod = await prisma.liveModerator.findUnique({
        where: { liveId_userId: { liveId: live.id, userId: user.id } },
      });
      isExplicitMod = !!mod;
    }
    const isModerator = isOwner || isAdmin || isCollaborator || isExplicitMod;

    // Do not leak the workspace owner's user id to the client.
    const { ownerId: _ownerId, ...workspacePublic } = live.workspace;
    void _ownerId;

    return NextResponse.json({
      live: {
        ...live,
        workspace: workspacePublic,
        roomOpen: live.roomOpen,
        chatEnabled: live.chatEnabled,
        isModerator,
      },
    });
  } catch (error) {
    console.error("GET /api/lives/[id] error:", error);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}

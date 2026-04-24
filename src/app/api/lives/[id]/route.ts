import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasWorkspaceAccess } from "@/lib/workspace-access";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
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
        workspace: { select: { id: true, slug: true, name: true } },
      },
    });

    if (!live) {
      return NextResponse.json({ error: "Live não encontrada" }, { status: 404 });
    }

    if (user.role === "STUDENT") {
      const allowed = await hasWorkspaceAccess(user.id, live.workspace.id);
      if (!allowed) {
        return NextResponse.json({ error: "Sem acesso" }, { status: 403 });
      }

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

    const isMod = await prisma.liveModerator.findUnique({
      where: { liveId_userId: { liveId: live.id, userId: user.id } },
    });

    return NextResponse.json({
      live: {
        ...live,
        roomOpen: live.roomOpen,
        chatEnabled: live.chatEnabled,
        isModerator: !!isMod || user.role === "ADMIN" || user.role === "PRODUCER",
      },
    });
  } catch (error) {
    console.error("GET /api/lives/[id] error:", error);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}

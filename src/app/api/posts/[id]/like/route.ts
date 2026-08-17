import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isCourseStaffOwner } from "@/lib/auth";
import { collaboratorCanActOnCourse } from "@/lib/collaborator";
import { GAMIFICATION, getLevelForPoints } from "@/lib/utils";
import { createNotification } from "@/lib/notifications";

export async function POST(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const post = await prisma.post.findUnique({
      where: { id: params.id },
      include: {
        course: { include: { workspace: { select: { ownerId: true } } } },
      },
    });
    if (!post) {
      return NextResponse.json(
        { error: "Post não encontrado" },
        { status: 404 }
      );
    }

    if (post.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Post aguardando aprovação" },
        { status: 403 }
      );
    }

    /* 9.72 — CURTIR É AÇÃO DE MEMBRO, não de staff.
       O predicado era `ADMIN || dono`, e quem não passasse caía na exigência de
       matrícula. Resultado: o colaborador com MANAGE_COMMUNITY **excluía post
       alheio e não conseguia curtir** — podia o mais e não podia o menos.
       A régua abaixo é a MESMA da ENTRADA da comunidade (publicar/comentar, em
       `posts/route.ts`): curtir é menos que comentar, então nada afrouxa.
       ⚠️ Short-circuit ADMIN/dono ANTES do vínculo (lição 9.63: há PRODUCER em
       produção que também tem linha de Collaborator). */
    if (!isCourseStaffOwner(user, post.course)) {
      const colaborador = await collaboratorCanActOnCourse(
        user.id,
        post.courseId,
        ["MANAGE_COMMUNITY", "REPLY_COMMENTS"],
        { requireMemberAccess: true }
      );
      if (!colaborador) {
        const enrollment = await prisma.enrollment.findUnique({
          where: {
            userId_courseId: { userId: user.id, courseId: post.courseId },
          },
        });
        if (!enrollment || enrollment.status !== "ACTIVE") {
          return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
        }
      }
    }

    const existing = await prisma.like.findUnique({
      where: {
        userId_postId: { userId: user.id, postId: post.id },
      },
    });

    let liked: boolean;
    let pointsDelta = 0;

    if (existing) {
      await prisma.like.delete({ where: { id: existing.id } });
      liked = false;
      // Remove points from post author (but not below 0 and not self-like edge)
      if (post.userId !== user.id) {
        pointsDelta = -GAMIFICATION.POINTS.RECEIVE_LIKE;
      }
    } else {
      await prisma.like.create({
        data: { userId: user.id, postId: post.id },
      });
      liked = true;
      if (post.userId !== user.id) {
        pointsDelta = GAMIFICATION.POINTS.RECEIVE_LIKE;
        await createNotification({
          userId: post.userId,
          workspaceId: post.course.workspaceId,
          type: "LIKE",
          message: `${user.name} curtiu seu post`,
          link: `/course/${post.course.slug}/community`,
          actorId: user.id,
        });
      }
    }

    let author = null;
    if (pointsDelta !== 0) {
      // Atomic increment + ledger in a single transaction. For unlikes
      // (negative delta) on authors with low points, the increment can
      // briefly drop below 0 — the clamp below restores the floor.
      // Worst case under concurrent unlikes: -2 for a few ms until the
      // next event corrects it.
      const [, updated] = await prisma.$transaction([
        prisma.pointsLedger.create({
          data: {
            userId: post.userId,
            workspaceId: post.course.workspaceId,
            delta: pointsDelta,
            source: "RECEIVE_LIKE",
            sourceId: post.id,
          },
        }),
        prisma.user.update({
          where: { id: post.userId },
          data: { points: { increment: pointsDelta } },
        }),
      ]);
      // Defensive clamp: Postgres `increment` has no built-in floor.
      let finalPoints = updated.points;
      if (finalPoints < 0) {
        const clamped = await prisma.user.update({
          where: { id: post.userId },
          data: { points: 0 },
        });
        finalPoints = clamped.points;
      }
      const newLevel = getLevelForPoints(finalPoints).level;
      if (updated.level !== newLevel) {
        author = await prisma.user.update({
          where: { id: post.userId },
          data: { level: newLevel },
        });
      } else if (finalPoints !== updated.points) {
        // Points were clamped; keep the unchanged level.
        author = { ...updated, points: finalPoints };
      } else {
        author = updated;
      }
    }

    const likeCount = await prisma.like.count({ where: { postId: post.id } });

    return NextResponse.json({
      success: true,
      liked,
      likeCount,
      authorPoints: author ? author.points : undefined,
    });
  } catch (error) {
    console.error("POST /api/posts/[id]/like error:", error);
    return NextResponse.json(
      { error: "Erro ao curtir post" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
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

    const isCourseOwner =
      user.role === "PRODUCER" &&
      (post.course.ownerId === user.id ||
        post.course.workspace.ownerId === user.id);
    const isStaffViewer = user.role === "ADMIN" || isCourseOwner;

    if (!isStaffViewer) {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: { userId: user.id, courseId: post.courseId },
        },
      });
      if (!enrollment || enrollment.status !== "ACTIVE") {
        return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
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
          type: "LIKE",
          message: `${user.name} curtiu seu post`,
          link: `/course/${post.course.slug}/community`,
          actorId: user.id,
        });
      }
    }

    let author = null;
    if (pointsDelta !== 0) {
      const authorUser = await prisma.user.findUnique({
        where: { id: post.userId },
      });
      if (authorUser) {
        const newPoints = Math.max(0, authorUser.points + pointsDelta);
        const newLevel = getLevelForPoints(newPoints).level;
        author = await prisma.user.update({
          where: { id: authorUser.id },
          data: { points: newPoints, level: newLevel },
        });
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

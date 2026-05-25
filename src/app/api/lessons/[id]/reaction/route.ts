import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import type { ReactionType } from "@prisma/client";
import { lessonReactionSchema, validateBody } from "@/lib/validations";
import { createNotification } from "@/lib/notifications";

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        module: {
          select: {
            course: {
              select: {
                id: true,
                lessonReactionsEnabled: true,
                ownerId: true,
                workspace: { select: { ownerId: true } },
              },
            },
          },
        },
      },
    });

    if (!lesson) {
      return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 });
    }

    const course = lesson.module.course;

    if (!course.lessonReactionsEnabled) {
      return NextResponse.json({ enabled: false, likeCount: 0, dislikeCount: 0, userReaction: null });
    }

    const isStaff =
      user.role === "ADMIN" ||
      (user.role === "PRODUCER" && (course.ownerId === user.id || course.workspace.ownerId === user.id));

    if (!isStaff) {
      const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId: course.id } },
      });
      if (!enrollment || enrollment.status !== "ACTIVE") {
        return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
      }
    }

    const [likeCount, dislikeCount, existing] = await Promise.all([
      prisma.lessonReaction.count({ where: { lessonId: params.id, type: "LIKE" } }),
      prisma.lessonReaction.count({ where: { lessonId: params.id, type: "DISLIKE" } }),
      prisma.lessonReaction.findUnique({
        where: { userId_lessonId: { userId: user.id, lessonId: params.id } },
      }),
    ]);

    return NextResponse.json({
      enabled: true,
      likeCount,
      dislikeCount: isStaff ? dislikeCount : 0,
      userReaction: existing?.type ?? null,
    });
  } catch (error) {
    console.error("GET /api/lessons/[id]/reaction error:", error);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const raw = await request.json().catch(() => ({}));
    const v = validateBody(lessonReactionSchema, raw);
    if (!v.success) return v.error;
    const type = v.data.type as ReactionType;
    const { reason, comment } = v.data;

    const lesson = await prisma.lesson.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        title: true,
        module: {
          select: {
            course: {
              select: {
                id: true,
                lessonReactionsEnabled: true,
                ownerId: true,
                workspace: { select: { ownerId: true } },
              },
            },
          },
        },
      },
    });

    if (!lesson) {
      return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 });
    }

    const course = lesson.module.course;

    if (!course.lessonReactionsEnabled) {
      return NextResponse.json({ error: "Reações desativadas neste curso" }, { status: 403 });
    }

    const isStaff =
      user.role === "ADMIN" ||
      (user.role === "PRODUCER" && (course.ownerId === user.id || course.workspace.ownerId === user.id));

    if (!isStaff) {
      const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId: course.id } },
      });
      if (!enrollment || enrollment.status !== "ACTIVE") {
        return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
      }
    }

    const existing = await prisma.lessonReaction.findUnique({
      where: { userId_lessonId: { userId: user.id, lessonId: params.id } },
    });

    if (!existing) {
      await prisma.lessonReaction.create({
        data: {
          userId: user.id,
          lessonId: params.id,
          type,
          reason: type === "DISLIKE" ? reason : null,
          comment: type === "DISLIKE" ? comment : null,
        },
      });
    } else if (existing.type === type) {
      await prisma.lessonReaction.delete({ where: { id: existing.id } });
    } else {
      await prisma.lessonReaction.update({
        where: { id: existing.id },
        data: {
          type,
          reason: type === "DISLIKE" ? reason : null,
          comment: type === "DISLIKE" ? comment : null,
        },
      });
    }

    const [likeCount, dislikeCount, updated] = await Promise.all([
      prisma.lessonReaction.count({ where: { lessonId: params.id, type: "LIKE" } }),
      prisma.lessonReaction.count({ where: { lessonId: params.id, type: "DISLIKE" } }),
      prisma.lessonReaction.findUnique({
        where: { userId_lessonId: { userId: user.id, lessonId: params.id } },
      }),
    ]);

    // Notify producer when a lesson reaches exactly 5 dislikes in the last 7 days.
    if (type === "DISLIKE" && (!existing || existing.type !== "DISLIKE")) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentDislikeCount = await prisma.lessonReaction.count({
        where: {
          lessonId: params.id,
          type: "DISLIKE",
          createdAt: { gte: sevenDaysAgo },
        },
      });
      if (recentDislikeCount === 5) {
        const ownerId = course.ownerId ?? course.workspace.ownerId;
        if (ownerId) {
          await createNotification({
            userId: ownerId,
            type: "LESSON_FEEDBACK",
            message: `A aula "${lesson.title}" recebeu 5 avaliações negativas nos últimos 7 dias. Veja os motivos.`,
            link: "/producer/analytics?tab=feedback",
          });
        }
      }
    }

    return NextResponse.json({
      likeCount,
      dislikeCount: isStaff ? dislikeCount : 0,
      userReaction: updated?.type ?? null,
    });
  } catch (error) {
    console.error("POST /api/lessons/[id]/reaction error:", error);
    return NextResponse.json({ error: "Erro ao reagir" }, { status: 500 });
  }
}

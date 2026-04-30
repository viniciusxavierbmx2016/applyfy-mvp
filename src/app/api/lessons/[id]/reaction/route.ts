import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import type { ReactionType } from "@prisma/client";

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
      dislikeCount,
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

    const body = await request.json();
    const type = body.type as ReactionType;
    if (type !== "LIKE" && type !== "DISLIKE") {
      return NextResponse.json({ error: "type deve ser LIKE ou DISLIKE" }, { status: 400 });
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
        data: { userId: user.id, lessonId: params.id, type },
      });
    } else if (existing.type === type) {
      await prisma.lessonReaction.delete({ where: { id: existing.id } });
    } else {
      await prisma.lessonReaction.update({
        where: { id: existing.id },
        data: { type },
      });
    }

    const [likeCount, dislikeCount, updated] = await Promise.all([
      prisma.lessonReaction.count({ where: { lessonId: params.id, type: "LIKE" } }),
      prisma.lessonReaction.count({ where: { lessonId: params.id, type: "DISLIKE" } }),
      prisma.lessonReaction.findUnique({
        where: { userId_lessonId: { userId: user.id, lessonId: params.id } },
      }),
    ]);

    return NextResponse.json({
      likeCount,
      dislikeCount,
      userReaction: updated?.type ?? null,
    });
  } catch (error) {
    console.error("POST /api/lessons/[id]/reaction error:", error);
    return NextResponse.json({ error: "Erro ao reagir" }, { status: 500 });
  }
}

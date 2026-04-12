import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: params.id },
      include: { module: true },
    });
    if (!lesson) {
      return NextResponse.json(
        { error: "Aula não encontrada" },
        { status: 404 }
      );
    }

    if (user.role !== "ADMIN") {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: user.id,
            courseId: lesson.module.courseId,
          },
        },
      });
      if (!enrollment || enrollment.status !== "ACTIVE") {
        return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
      }
    }

    const comments = await prisma.lessonComment.findMany({
      where: { lessonId: lesson.id },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, role: true } },
      },
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error("GET lesson comments error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar comentários" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { content } = await request.json();
    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { error: "Conteúdo obrigatório" },
        { status: 400 }
      );
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: params.id },
      include: { module: true },
    });
    if (!lesson) {
      return NextResponse.json(
        { error: "Aula não encontrada" },
        { status: 404 }
      );
    }

    if (user.role !== "ADMIN") {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: user.id,
            courseId: lesson.module.courseId,
          },
        },
      });
      if (!enrollment || enrollment.status !== "ACTIVE") {
        return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
      }
    }

    const comment = await prisma.lessonComment.create({
      data: {
        content: content.trim(),
        userId: user.id,
        lessonId: lesson.id,
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, role: true } },
      },
    });

    const course = await prisma.course.findUnique({
      where: { id: lesson.module.courseId },
      select: { slug: true },
    });
    const previousCommenters = await prisma.lessonComment.findMany({
      where: {
        lessonId: lesson.id,
        userId: { not: user.id },
        id: { not: comment.id },
      },
      distinct: ["userId"],
      select: { userId: true },
    });
    const link = course
      ? `/course/${course.slug}/lesson/${lesson.id}`
      : null;
    await Promise.all(
      previousCommenters.map((c) =>
        createNotification({
          userId: c.userId,
          type: "REPLY",
          message: `${user.name} comentou na aula ${lesson.title}`,
          link,
          actorId: user.id,
        })
      )
    );

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("POST lesson comments error:", error);
    return NextResponse.json({ error: "Erro ao comentar" }, { status: 500 });
  }
}

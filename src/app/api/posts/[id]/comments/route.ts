import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { collaboratorCanActOnCourse } from "@/lib/collaborator";
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

    const post = await prisma.post.findUnique({
      where: { id: params.id },
      include: {
        course: { select: { ownerId: true, workspace: { select: { ownerId: true } } } },
      },
    });
    if (!post) {
      return NextResponse.json(
        { error: "Post não encontrado" },
        { status: 404 }
      );
    }

    if (user.role !== "ADMIN") {
      let allowed =
        user.role === "PRODUCER" &&
        (post.course.ownerId === user.id ||
          post.course.workspace.ownerId === user.id);
      if (!allowed && user.role === "COLLABORATOR") {
        allowed = await collaboratorCanActOnCourse(user.id, post.courseId, [
          "REPLY_COMMENTS",
          "MANAGE_COMMUNITY",
        ]);
      }
      if (!allowed) {
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

    const comments = await prisma.comment.findMany({
      where: { postId: post.id },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, role: true } },
      },
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error("GET comments error:", error);
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

    const post = await prisma.post.findUnique({
      where: { id: params.id },
      include: {
        course: {
          select: {
            slug: true,
            ownerId: true,
            workspace: { select: { ownerId: true } },
          },
        },
      },
    });
    if (!post) {
      return NextResponse.json(
        { error: "Post não encontrado" },
        { status: 404 }
      );
    }

    if (user.role !== "ADMIN") {
      let allowed =
        user.role === "PRODUCER" &&
        (post.course.ownerId === user.id ||
          post.course.workspace.ownerId === user.id);
      if (!allowed && user.role === "COLLABORATOR") {
        allowed = await collaboratorCanActOnCourse(user.id, post.courseId, [
          "REPLY_COMMENTS",
          "MANAGE_COMMUNITY",
        ]);
      }
      if (!allowed) {
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

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        userId: user.id,
        postId: post.id,
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, role: true } },
      },
    });

    await createNotification({
      userId: post.userId,
      type: "COMMENT",
      message: `${user.name} comentou no seu post`,
      link: `/course/${post.course.slug}/community`,
      actorId: user.id,
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("POST comments error:", error);
    return NextResponse.json(
      { error: "Erro ao comentar" },
      { status: 500 }
    );
  }
}

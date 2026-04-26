import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { collaboratorCanActOnCourse } from "@/lib/collaborator";
import { createNotification } from "@/lib/notifications";

async function checkAccess(userId: string, userRole: string, post: { courseId: string; course: { ownerId: string | null; workspace: { ownerId: string } } }) {
  if (userRole === "ADMIN") return true;
  if (userRole === "PRODUCER" && (post.course.ownerId === userId || post.course.workspace.ownerId === userId)) return true;
  if (userRole === "COLLABORATOR") {
    const allowed = await collaboratorCanActOnCourse(userId, post.courseId, ["REPLY_COMMENTS", "MANAGE_COMMUNITY"]);
    if (allowed) return true;
  }
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: post.courseId } },
  });
  return enrollment?.status === "ACTIVE";
}

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
      return NextResponse.json({ error: "Post não encontrado" }, { status: 404 });
    }

    if (!(await checkAccess(user.id, user.role, post))) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const userSelect = { id: true, name: true, avatarUrl: true, role: true };

    const comments = await prisma.comment.findMany({
      where: { postId: post.id, parentId: null },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: userSelect },
        replies: {
          orderBy: { createdAt: "asc" },
          include: { user: { select: userSelect } },
        },
      },
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error("GET comments error:", error);
    return NextResponse.json({ error: "Erro ao buscar comentários" }, { status: 500 });
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

    const { content, parentId } = await request.json();
    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Conteúdo obrigatório" }, { status: 400 });
    }

    const post = await prisma.post.findUnique({
      where: { id: params.id },
      include: {
        course: {
          select: { slug: true, ownerId: true, workspace: { select: { ownerId: true } } },
        },
      },
    });
    if (!post) {
      return NextResponse.json({ error: "Post não encontrado" }, { status: 404 });
    }

    if (!(await checkAccess(user.id, user.role, post))) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    let validParentId: string | null = null;
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { id: true, postId: true, userId: true, parentId: true },
      });
      if (!parentComment || parentComment.postId !== post.id) {
        return NextResponse.json({ error: "Comentário pai inválido" }, { status: 400 });
      }
      // Only allow 1 level of nesting — reply to a reply goes to the top-level parent
      validParentId = parentComment.parentId || parentComment.id;
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        userId: user.id,
        postId: post.id,
        parentId: validParentId,
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, role: true } },
      },
    });

    // Notify post author
    if (post.userId !== user.id) {
      await createNotification({
        userId: post.userId,
        type: "COMMENT",
        message: `${user.name} comentou no seu post`,
        link: `/course/${post.course.slug}/community`,
        actorId: user.id,
      });
    }

    // Notify parent comment author (if reply)
    if (validParentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: validParentId },
        select: { userId: true },
      });
      if (parentComment && parentComment.userId !== user.id && parentComment.userId !== post.userId) {
        await createNotification({
          userId: parentComment.userId,
          type: "REPLY",
          message: `${user.name} respondeu ao seu comentário`,
          link: `/course/${post.course.slug}/community`,
          actorId: user.id,
        });
      }
    }

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("POST comments error:", error);
    return NextResponse.json({ error: "Erro ao comentar" }, { status: 500 });
  }
}

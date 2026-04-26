import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { collaboratorCanActOnCourse } from "@/lib/collaborator";
import { sanitizeHtml, stripHtml } from "@/lib/sanitize-html";
import { PostType } from "@prisma/client";

const VALID_TYPES: PostType[] = ["QUESTION", "RESULT", "FEEDBACK", "FREE"];

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const post = await prisma.post.findUnique({ where: { id: params.id } });
    if (!post) {
      return NextResponse.json({ error: "Post não encontrado" }, { status: 404 });
    }

    let canEdit = user.role === "ADMIN" || post.userId === user.id;
    if (!canEdit && user.role === "PRODUCER") {
      const course = await prisma.course.findUnique({
        where: { id: post.courseId },
        select: { ownerId: true, workspace: { select: { ownerId: true } } },
      });
      canEdit = course?.ownerId === user.id || course?.workspace.ownerId === user.id;
    }
    if (!canEdit && user.role === "COLLABORATOR") {
      canEdit = await collaboratorCanActOnCourse(user.id, post.courseId, ["MANAGE_COMMUNITY"]);
    }
    if (!canEdit) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { content, type } = await request.json();

    const data: Record<string, unknown> = {};
    if (content !== undefined) {
      if (typeof content !== "string") {
        return NextResponse.json({ error: "Conteúdo inválido" }, { status: 400 });
      }
      const sanitized = sanitizeHtml(content);
      if (!stripHtml(sanitized)) {
        return NextResponse.json({ error: "Conteúdo obrigatório" }, { status: 400 });
      }
      if (sanitized.length > 20000) {
        return NextResponse.json({ error: "Conteúdo muito longo" }, { status: 400 });
      }
      data.content = sanitized;
    }
    if (type !== undefined && VALID_TYPES.includes(type)) {
      data.type = type;
    }

    const updated = await prisma.post.update({
      where: { id: params.id },
      data,
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, role: true } },
        group: { select: { id: true, name: true, slug: true, permission: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    return NextResponse.json({ post: updated });
  } catch (error) {
    console.error("PUT /api/posts/[id] error:", error);
    return NextResponse.json({ error: "Erro ao editar post" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const post = await prisma.post.findUnique({ where: { id: params.id } });
    if (!post) {
      return NextResponse.json(
        { error: "Post não encontrado" },
        { status: 404 }
      );
    }

    let canDelete = user.role === "ADMIN" || post.userId === user.id;
    if (!canDelete && user.role === "PRODUCER") {
      const course = await prisma.course.findUnique({
        where: { id: post.courseId },
        select: { ownerId: true, workspace: { select: { ownerId: true } } },
      });
      canDelete =
        course?.ownerId === user.id ||
        course?.workspace.ownerId === user.id;
    }
    if (!canDelete && user.role === "COLLABORATOR") {
      canDelete = await collaboratorCanActOnCourse(user.id, post.courseId, [
        "MANAGE_COMMUNITY",
      ]);
    }
    if (!canDelete) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    await prisma.post.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/posts/[id] error:", error);
    return NextResponse.json(
      { error: "Erro ao excluir post" },
      { status: 500 }
    );
  }
}

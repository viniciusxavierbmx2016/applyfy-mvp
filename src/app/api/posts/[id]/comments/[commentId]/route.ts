import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { collaboratorCanActOnCourse } from "@/lib/collaborator";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const comment = await prisma.comment.findUnique({
      where: { id: params.commentId },
      include: {
        post: {
          select: {
            id: true,
            courseId: true,
            course: {
              select: {
                ownerId: true,
                workspace: { select: { ownerId: true } },
              },
            },
          },
        },
      },
    });

    if (!comment || comment.postId !== params.id) {
      return NextResponse.json(
        { error: "Comentário não encontrado" },
        { status: 404 }
      );
    }

    let canDelete = user.role === "ADMIN" || comment.userId === user.id;
    if (!canDelete && user.role === "PRODUCER") {
      canDelete =
        comment.post.course.ownerId === user.id ||
        comment.post.course.workspace.ownerId === user.id;
    }
    if (!canDelete && user.role === "COLLABORATOR") {
      canDelete = await collaboratorCanActOnCourse(
        user.id,
        comment.post.courseId,
        ["MANAGE_COMMUNITY"]
      );
    }
    if (!canDelete) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    await prisma.comment.delete({ where: { id: params.commentId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/posts/[id]/comments/[commentId] error:", error);
    return NextResponse.json(
      { error: "Erro ao excluir comentário" },
      { status: 500 }
    );
  }
}

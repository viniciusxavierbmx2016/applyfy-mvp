import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { collaboratorCanActOnCourse } from "@/lib/collaborator";

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
        select: { ownerId: true },
      });
      canDelete = course?.ownerId === user.id;
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

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { collaboratorCanActOnCourse } from "@/lib/collaborator";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const staff = await requireStaff();
    const courseId = params.id;

    if (staff.role === "COLLABORATOR") {
      const allowed = await collaboratorCanActOnCourse(staff.id, courseId, [
        "REPLY_COMMENTS",
        "MANAGE_COMMUNITY",
        "MANAGE_LESSONS",
      ]);
      if (!allowed) {
        return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
      }
    }

    const { searchParams } = new URL(request.url);
    const lessonFilter = searchParams.get("lessonId") || "";
    const statusFilter = searchParams.get("status");

    const where: Record<string, unknown> = {
      lesson: { module: { courseId } },
    };
    if (lessonFilter) {
      where.lessonId = lessonFilter;
    }
    if (statusFilter === "PENDING" || statusFilter === "APPROVED" || statusFilter === "REJECTED") {
      where.status = statusFilter;
    }

    const comments = await prisma.lessonComment.findMany({
      where: { ...where, parentId: null },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true, role: true },
        },
        lesson: {
          select: {
            id: true,
            title: true,
            module: { select: { id: true, title: true } },
          },
        },
        replies: {
          orderBy: { createdAt: "asc" },
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true, role: true },
            },
          },
        },
      },
      take: 200,
    });

    const pendingCount = await prisma.lessonComment.count({
      where: {
        lesson: { module: { courseId } },
        parentId: null,
        status: "PENDING",
        ...(lessonFilter ? { lessonId: lessonFilter } : {}),
      },
    });

    const lessons = await prisma.lesson.findMany({
      where: { module: { courseId } },
      select: { id: true, title: true, module: { select: { title: true } } },
      orderBy: [{ module: { order: "asc" } }, { order: "asc" }],
    });

    return NextResponse.json({ comments, lessons, pendingCount });
  } catch (error) {
    const message =
      error instanceof Error && error.message === "Forbidden"
        ? "Acesso negado"
        : "Erro ao buscar comentários";
    const status = message === "Acesso negado" ? 403 : 500;
    if (status === 500) console.error("GET /api/courses/[id]/comments error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}

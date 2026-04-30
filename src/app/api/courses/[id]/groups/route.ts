import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ensureDefaultGroup } from "@/lib/community-helpers";

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const course = await prisma.course.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        communityEnabled: true,
        ownerId: true,
        workspace: { select: { ownerId: true } },
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Curso não encontrado" },
        { status: 404 }
      );
    }

    if (!course.communityEnabled) {
      return NextResponse.json(
        { error: "Comunidade desativada" },
        { status: 403 }
      );
    }

    const isStaff =
      user.role === "ADMIN" ||
      (user.role === "PRODUCER" &&
        (course.ownerId === user.id || course.workspace.ownerId === user.id)) ||
      user.role === "COLLABORATOR";

    if (!isStaff) {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: { userId: user.id, courseId: course.id },
        },
      });
      if (!enrollment || enrollment.status !== "ACTIVE") {
        return NextResponse.json(
          { error: "Não matriculado neste curso" },
          { status: 403 }
        );
      }
    }

    await ensureDefaultGroup(course.id);

    const groups = await prisma.communityGroup.findMany({
      where: { courseId: course.id },
      orderBy: { order: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        isDefault: true,
        permission: true,
        order: true,
        _count: { select: { posts: true } },
      },
    });

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("GET /api/courses/[id]/groups error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar grupos" },
      { status: 500 }
    );
  }
}

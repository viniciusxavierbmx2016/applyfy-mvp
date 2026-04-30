import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isEnrollmentActive } from "@/lib/auth";

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
    const isOwner =
      user.role === "ADMIN" ||
      (user.role === "PRODUCER" &&
        (course.ownerId === user.id || course.workspace.ownerId === user.id));

    if (!isOwner) {
      const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId: course.id } },
      });
      if (!isEnrollmentActive(enrollment)) {
        return NextResponse.json({ error: "Sem acesso" }, { status: 403 });
      }
    }

    const materials = await prisma.lessonMaterial.findMany({
      where: { lessonId: params.id },
      select: {
        id: true,
        name: true,
        fileName: true,
        fileSize: true,
        fileType: true,
        fileUrl: true,
      },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ materials });
  } catch (error) {
    console.error("GET lesson materials error:", error);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}

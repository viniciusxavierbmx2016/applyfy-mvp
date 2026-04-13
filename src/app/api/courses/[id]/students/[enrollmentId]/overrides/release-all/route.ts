import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEditCourse, requireStaff } from "@/lib/auth";

export async function POST(
  _request: Request,
  { params }: { params: { id: string; enrollmentId: string } }
) {
  try {
    const staff = await requireStaff();
    if (!(await canEditCourse(staff, params.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: params.enrollmentId },
      select: { courseId: true },
    });
    if (!enrollment || enrollment.courseId !== params.id) {
      return NextResponse.json(
        { error: "Matrícula não encontrada" },
        { status: 404 }
      );
    }

    const modules = await prisma.module.findMany({
      where: { courseId: params.id },
      select: { id: true },
    });

    await prisma.$transaction([
      prisma.enrollmentOverride.deleteMany({
        where: { enrollmentId: params.enrollmentId },
      }),
      prisma.enrollmentOverride.createMany({
        data: modules.map((m) => ({
          enrollmentId: params.enrollmentId,
          moduleId: m.id,
          released: true,
        })),
      }),
    ]);

    const overrides = await prisma.enrollmentOverride.findMany({
      where: { enrollmentId: params.enrollmentId },
      select: { id: true, moduleId: true, lessonId: true, released: true },
    });
    return NextResponse.json({ overrides });
  } catch (error) {
    console.error("release-all error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

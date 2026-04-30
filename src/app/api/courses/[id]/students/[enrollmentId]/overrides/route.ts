import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEditCourse, requireStaff } from "@/lib/auth";

async function loadEnrollment(enrollmentId: string, courseId: string) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: { courseId: true },
  });
  if (!enrollment || enrollment.courseId !== courseId) return null;
  return enrollment;
}

export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string; enrollmentId: string }> }
) {
  const params = await props.params;
  try {
    const staff = await requireStaff();
    if (!(await canEditCourse(staff, params.id))) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }
    if (!(await loadEnrollment(params.enrollmentId, params.id))) {
      return NextResponse.json(
        { error: "Matrícula não encontrada" },
        { status: 404 }
      );
    }
    const overrides = await prisma.enrollmentOverride.findMany({
      where: { enrollmentId: params.enrollmentId },
      select: { id: true, moduleId: true, lessonId: true, released: true },
    });
    return NextResponse.json({ overrides });
  } catch (error) {
    console.error("GET overrides error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string; enrollmentId: string }> }
) {
  const params = await props.params;
  try {
    const staff = await requireStaff();
    if (!(await canEditCourse(staff, params.id))) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }
    if (!(await loadEnrollment(params.enrollmentId, params.id))) {
      return NextResponse.json(
        { error: "Matrícula não encontrada" },
        { status: 404 }
      );
    }
    const body = await request.json().catch(() => ({}));
    const moduleId: string | null = body.moduleId ?? null;
    const lessonId: string | null = body.lessonId ?? null;
    const released: boolean = body.released !== false;

    if (!moduleId && !lessonId) {
      return NextResponse.json(
        { error: "moduleId ou lessonId obrigatório" },
        { status: 400 }
      );
    }
    if (moduleId && lessonId) {
      return NextResponse.json(
        { error: "Use moduleId OU lessonId, não ambos" },
        { status: 400 }
      );
    }

    if (moduleId) {
      const mod = await prisma.module.findUnique({
        where: { id: moduleId },
        select: { courseId: true },
      });
      if (!mod || mod.courseId !== params.id) {
        return NextResponse.json(
          { error: "Módulo não pertence ao curso" },
          { status: 400 }
        );
      }
      if (!released) {
        await prisma.enrollmentOverride.deleteMany({
          where: { enrollmentId: params.enrollmentId, moduleId },
        });
        return NextResponse.json({ removed: true });
      }
      const override = await prisma.enrollmentOverride.upsert({
        where: {
          enrollmentId_moduleId: {
            enrollmentId: params.enrollmentId,
            moduleId,
          },
        },
        create: {
          enrollmentId: params.enrollmentId,
          moduleId,
          released: true,
        },
        update: { released: true },
      });
      return NextResponse.json({ override });
    }

    // lesson override
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId! },
      select: { module: { select: { courseId: true } } },
    });
    if (!lesson || lesson.module.courseId !== params.id) {
      return NextResponse.json(
        { error: "Aula não pertence ao curso" },
        { status: 400 }
      );
    }
    if (!released) {
      await prisma.enrollmentOverride.deleteMany({
        where: { enrollmentId: params.enrollmentId, lessonId },
      });
      return NextResponse.json({ removed: true });
    }
    const override = await prisma.enrollmentOverride.upsert({
      where: {
        enrollmentId_lessonId: {
          enrollmentId: params.enrollmentId,
          lessonId: lessonId!,
        },
      },
      create: {
        enrollmentId: params.enrollmentId,
        lessonId,
        released: true,
      },
      update: { released: true },
    });
    return NextResponse.json({ override });
  } catch (error) {
    console.error("POST override error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

export async function DELETE(
  _request: Request,
  props: { params: Promise<{ id: string; enrollmentId: string }> }
) {
  const params = await props.params;
  try {
    const staff = await requireStaff();
    if (!(await canEditCourse(staff, params.id))) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }
    if (!(await loadEnrollment(params.enrollmentId, params.id))) {
      return NextResponse.json(
        { error: "Matrícula não encontrada" },
        { status: 404 }
      );
    }
    await prisma.enrollmentOverride.deleteMany({
      where: { enrollmentId: params.enrollmentId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE overrides error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const course = await prisma.course.findUnique({
      where: { id: params.id },
      select: { termsContent: true },
    });
    if (!course) {
      return NextResponse.json({ error: "Curso não encontrado" }, { status: 404 });
    }
    if (!course.termsContent) {
      return NextResponse.json({ error: "Este curso não possui termos" }, { status: 400 });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: params.id } },
    });
    if (!enrollment) {
      return NextResponse.json({ error: "Não matriculado" }, { status: 403 });
    }

    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { termsAcceptedAt: new Date() },
    });

    return NextResponse.json({ accepted: true });
  } catch (error) {
    console.error("POST /api/courses/[id]/accept-terms error:", error);
    return NextResponse.json({ error: "Erro ao aceitar termos" }, { status: 500 });
  }
}

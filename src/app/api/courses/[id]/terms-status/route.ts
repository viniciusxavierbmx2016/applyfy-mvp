import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isStaff } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (isStaff(user)) {
      return NextResponse.json({ required: false });
    }

    const course = await prisma.course.findUnique({
      where: { id: params.id },
      select: { termsContent: true, termsFileUrl: true, termsUpdatedAt: true },
    });
    if (!course) {
      return NextResponse.json({ error: "Curso não encontrado" }, { status: 404 });
    }

    if (!course.termsContent && !course.termsFileUrl) {
      return NextResponse.json({ required: false });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: params.id } },
      select: { termsAcceptedAt: true },
    });
    if (!enrollment) {
      return NextResponse.json({ required: false });
    }

    const termsPayload = {
      termsContent: course.termsContent,
      termsFileUrl: course.termsFileUrl,
    };

    if (!enrollment.termsAcceptedAt) {
      return NextResponse.json({ required: true, ...termsPayload });
    }

    if (
      course.termsUpdatedAt &&
      enrollment.termsAcceptedAt < course.termsUpdatedAt
    ) {
      return NextResponse.json({ required: true, ...termsPayload });
    }

    return NextResponse.json({ required: false });
  } catch (error) {
    console.error("GET /api/courses/[id]/terms-status error:", error);
    return NextResponse.json({ error: "Erro ao verificar termos" }, { status: 500 });
  }
}

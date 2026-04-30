import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  buildCertificatePdf,
  generateCertificateCode,
} from "@/lib/certificate-pdf";

export async function GET(request: Request, props: { params: Promise<{ courseId: string }> }) {
  const params = await props.params;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const course = await prisma.course.findUnique({
      where: { id: params.courseId },
      include: {
        modules: { include: { lessons: { select: { id: true } } } },
      },
    });
    if (!course) {
      return NextResponse.json(
        { error: "Curso não encontrado" },
        { status: 404 }
      );
    }
    if (!course.certificateEnabled) {
      return NextResponse.json(
        { error: "Este curso não emite certificado" },
        { status: 400 }
      );
    }

    if (user.role !== "ADMIN") {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: { userId: user.id, courseId: course.id },
        },
      });
      if (!enrollment || enrollment.status !== "ACTIVE") {
        return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
      }
    }

    const lessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
    if (lessonIds.length === 0) {
      return NextResponse.json(
        { error: "Curso sem aulas" },
        { status: 400 }
      );
    }

    const completed = await prisma.lessonProgress.count({
      where: {
        userId: user.id,
        completed: true,
        lessonId: { in: lessonIds },
      },
    });

    if (completed < lessonIds.length) {
      return NextResponse.json(
        { error: "Você ainda não concluiu 100% do curso" },
        { status: 400 }
      );
    }

    const code = generateCertificateCode(user.id, course.id);
    const certificate = await prisma.certificate.upsert({
      where: {
        userId_courseId: { userId: user.id, courseId: course.id },
      },
      create: { code, userId: user.id, courseId: course.id },
      update: {},
    });

    const origin = new URL(request.url).origin;
    const pdf = buildCertificatePdf({
      studentName: user.name,
      courseTitle: course.title,
      issuedAt: certificate.issuedAt,
      code: certificate.code,
      verifyUrl: `${origin}/verify/${certificate.code}`,
    });

    const safeTitle = course.title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="certificado-${safeTitle}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("GET /api/certificates/[courseId] error:", error);
    return NextResponse.json(
      { error: "Erro ao gerar certificado" },
      { status: 500 }
    );
  }
}

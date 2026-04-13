import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isEnrollmentActive } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const course = await prisma.course.findUnique({
      where: { slug: params.slug },
      include: {
        sections: { orderBy: { order: "asc" } },
        modules: {
          orderBy: { order: "asc" },
          include: {
            lessons: {
              orderBy: { order: "asc" },
              include: {
                progress: {
                  where: { userId: user.id },
                },
              },
            },
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Curso não encontrado" },
        { status: 404 }
      );
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId: user.id, courseId: course.id },
      },
    });

    const hasAccess =
      user.role === "ADMIN" || isEnrollmentActive(enrollment);
    const isExpired =
      !!enrollment &&
      enrollment.status === "ACTIVE" &&
      !!enrollment.expiresAt &&
      enrollment.expiresAt.getTime() < Date.now();

    const [agg, myReview] = await Promise.all([
      prisma.review.aggregate({
        where: { courseId: course.id },
        _avg: { rating: true },
        _count: { rating: true },
      }),
      prisma.review.findUnique({
        where: { userId_courseId: { userId: user.id, courseId: course.id } },
      }),
    ]);

    return NextResponse.json({
      course: {
        ...course,
        ratingAverage: agg._avg.rating ?? 0,
        ratingCount: agg._count.rating,
      },
      hasAccess,
      isExpired,
      enrollment,
      myReview,
    });
  } catch (error) {
    console.error("GET /api/courses/by-slug/[slug] error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar curso" },
      { status: 500 }
    );
  }
}

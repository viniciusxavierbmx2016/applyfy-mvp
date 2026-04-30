import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const course = await prisma.course.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!course) {
      return NextResponse.json(
        { error: "Curso não encontrado" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = 10;

    const [reviews, total, agg] = await Promise.all([
      prisma.review.findMany({
        where: { courseId: course.id },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
      }),
      prisma.review.count({ where: { courseId: course.id } }),
      prisma.review.aggregate({
        where: { courseId: course.id },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    return NextResponse.json({
      reviews,
      total,
      hasMore: page * pageSize < total,
      average: agg._avg.rating ?? 0,
      count: agg._count.rating,
    });
  } catch (error) {
    console.error("GET /api/courses/[id]/reviews error:", error);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const course = await prisma.course.findUnique({
      where: { id: params.id },
      select: { id: true, reviewsEnabled: true },
    });
    if (!course) {
      return NextResponse.json(
        { error: "Curso não encontrado" },
        { status: 404 }
      );
    }
    if (!course.reviewsEnabled) {
      return NextResponse.json(
        { error: "Avaliações desativadas neste curso" },
        { status: 403 }
      );
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId: user.id, courseId: course.id },
      },
    });
    if (!enrollment || enrollment.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Apenas alunos matriculados podem avaliar" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const rating = Number(body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Nota deve ser um inteiro entre 1 e 5" },
        { status: 400 }
      );
    }

    const rawComment =
      typeof body.comment === "string" ? body.comment.trim() : "";
    if (rawComment.length > 2000) {
      return NextResponse.json(
        { error: "Comentário muito longo" },
        { status: 400 }
      );
    }
    const comment = rawComment || null;

    const review = await prisma.review.upsert({
      where: {
        userId_courseId: { userId: user.id, courseId: course.id },
      },
      create: {
        userId: user.id,
        courseId: course.id,
        rating,
        comment,
      },
      update: { rating, comment },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    console.error("POST /api/courses/[id]/reviews error:", error);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}

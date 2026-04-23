import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEditLesson, requireStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

const QUIZ_INCLUDE = {
  questions: {
    orderBy: { sortOrder: "asc" as const },
    include: { options: { orderBy: { sortOrder: "asc" as const } } },
  },
};

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const quiz = await prisma.quiz.findUnique({
      where: { lessonId: params.id },
      include: QUIZ_INCLUDE,
    });
    return NextResponse.json({ quiz });
  } catch (error) {
    console.error("GET quiz error:", error);
    return NextResponse.json({ error: "Erro ao buscar quiz" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const staff = await requireStaff();
    if (!(await canEditLesson(staff, params.id))) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const existing = await prisma.quiz.findUnique({ where: { lessonId: params.id } });
    if (existing) {
      return NextResponse.json({ error: "Aula já possui quiz" }, { status: 400 });
    }

    const body = await request.json();
    const quiz = await prisma.quiz.create({
      data: {
        lessonId: params.id,
        title: body.title || null,
        passingScore: body.passingScore ?? 70,
        showAnswers: body.showAnswers ?? true,
      },
      include: QUIZ_INCLUDE,
    });

    return NextResponse.json({ quiz }, { status: 201 });
  } catch (error) {
    console.error("POST quiz error:", error);
    const msg = error instanceof Error ? error.message : "";
    if (msg === "Não autorizado") return NextResponse.json({ error: msg }, { status: 401 });
    return NextResponse.json({ error: "Erro ao criar quiz" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const staff = await requireStaff();
    if (!(await canEditLesson(staff, params.id))) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const existing = await prisma.quiz.findUnique({ where: { lessonId: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "Quiz não encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title || null;
    if (body.passingScore !== undefined) data.passingScore = Math.max(0, Math.min(100, Number(body.passingScore)));
    if (body.showAnswers !== undefined) data.showAnswers = !!body.showAnswers;

    const quiz = await prisma.quiz.update({
      where: { id: existing.id },
      data,
      include: QUIZ_INCLUDE,
    });

    return NextResponse.json({ quiz });
  } catch (error) {
    console.error("PUT quiz error:", error);
    const msg = error instanceof Error ? error.message : "";
    if (msg === "Não autorizado") return NextResponse.json({ error: msg }, { status: 401 });
    return NextResponse.json({ error: "Erro ao atualizar quiz" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const staff = await requireStaff();
    if (!(await canEditLesson(staff, params.id))) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const existing = await prisma.quiz.findUnique({ where: { lessonId: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "Quiz não encontrado" }, { status: 404 });
    }

    await prisma.quiz.delete({ where: { id: existing.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE quiz error:", error);
    const msg = error instanceof Error ? error.message : "";
    if (msg === "Não autorizado") return NextResponse.json({ error: msg }, { status: 401 });
    return NextResponse.json({ error: "Erro ao excluir quiz" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEditLesson, requireStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const staff = await requireStaff();
    if (!(await canEditLesson(staff, params.id))) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const quiz = await prisma.quiz.findUnique({ where: { lessonId: params.id } });
    if (!quiz) {
      return NextResponse.json({ error: "Quiz não encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const { text, options } = body;

    if (!text?.trim()) {
      return NextResponse.json({ error: "Texto da pergunta obrigatório" }, { status: 400 });
    }
    if (!Array.isArray(options) || options.length < 2) {
      return NextResponse.json({ error: "Mínimo 2 opções" }, { status: 400 });
    }
    if (options.length > 6) {
      return NextResponse.json({ error: "Máximo 6 opções" }, { status: 400 });
    }
    const correctCount = options.filter((o: { isCorrect?: boolean }) => o.isCorrect).length;
    if (correctCount !== 1) {
      return NextResponse.json({ error: "Exatamente 1 opção correta" }, { status: 400 });
    }

    const maxOrder = await prisma.quizQuestion.aggregate({
      where: { quizId: quiz.id },
      _max: { sortOrder: true },
    });

    const question = await prisma.quizQuestion.create({
      data: {
        quizId: quiz.id,
        text: text.trim(),
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
        options: {
          create: options.map((o: { text: string; isCorrect?: boolean }, i: number) => ({
            text: o.text.trim(),
            isCorrect: !!o.isCorrect,
            sortOrder: i,
          })),
        },
      },
      include: { options: { orderBy: { sortOrder: "asc" } } },
    });

    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    console.error("POST question error:", error);
    const msg = error instanceof Error ? error.message : "";
    if (msg === "Não autorizado") return NextResponse.json({ error: msg }, { status: 401 });
    return NextResponse.json({ error: "Erro ao criar pergunta" }, { status: 500 });
  }
}

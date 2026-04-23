import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEditLesson, requireStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  { params }: { params: { id: string; questionId: string } }
) {
  try {
    const staff = await requireStaff();
    if (!(await canEditLesson(staff, params.id))) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body.text !== undefined) data.text = String(body.text).trim();

    if (body.options) {
      const opts = body.options as Array<{ text: string; isCorrect?: boolean }>;
      if (opts.length < 2) return NextResponse.json({ error: "Mínimo 2 opções" }, { status: 400 });
      if (opts.length > 6) return NextResponse.json({ error: "Máximo 6 opções" }, { status: 400 });
      const correctCount = opts.filter((o) => o.isCorrect).length;
      if (correctCount !== 1) return NextResponse.json({ error: "Exatamente 1 opção correta" }, { status: 400 });

      await prisma.quizOption.deleteMany({ where: { questionId: params.questionId } });
      await prisma.quizOption.createMany({
        data: opts.map((o, i) => ({
          questionId: params.questionId,
          text: o.text.trim(),
          isCorrect: !!o.isCorrect,
          sortOrder: i,
        })),
      });
    }

    const question = await prisma.quizQuestion.update({
      where: { id: params.questionId },
      data,
      include: { options: { orderBy: { sortOrder: "asc" } } },
    });

    return NextResponse.json({ question });
  } catch (error) {
    console.error("PUT question error:", error);
    const msg = error instanceof Error ? error.message : "";
    if (msg === "Não autorizado") return NextResponse.json({ error: msg }, { status: 401 });
    return NextResponse.json({ error: "Erro ao atualizar pergunta" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; questionId: string } }
) {
  try {
    const staff = await requireStaff();
    if (!(await canEditLesson(staff, params.id))) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    await prisma.quizQuestion.delete({ where: { id: params.questionId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE question error:", error);
    const msg = error instanceof Error ? error.message : "";
    if (msg === "Não autorizado") return NextResponse.json({ error: msg }, { status: 401 });
    return NextResponse.json({ error: "Erro ao excluir pergunta" }, { status: 500 });
  }
}

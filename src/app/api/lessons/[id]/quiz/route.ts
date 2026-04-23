import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { processAutomations } from "@/lib/automation-engine";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const quiz = await prisma.quiz.findUnique({
      where: { lessonId: params.id },
      include: {
        questions: {
          orderBy: { sortOrder: "asc" },
          include: {
            options: {
              orderBy: { sortOrder: "asc" },
              select: { id: true, text: true, sortOrder: true },
            },
          },
        },
      },
    });

    if (!quiz) return NextResponse.json({ quiz: null });

    const lastAttempt = await prisma.quizAttempt.findFirst({
      where: { quizId: quiz.id, userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        passingScore: quiz.passingScore,
        showAnswers: quiz.showAnswers,
        questions: quiz.questions,
      },
      lastAttempt: lastAttempt
        ? { score: lastAttempt.score, passed: lastAttempt.passed, answers: JSON.parse(lastAttempt.answers) }
        : null,
    });
  } catch (error) {
    console.error("GET student quiz error:", error);
    return NextResponse.json({ error: "Erro ao buscar quiz" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const quiz = await prisma.quiz.findUnique({
      where: { lessonId: params.id },
      include: {
        questions: {
          include: { options: true },
        },
        lesson: {
          select: { module: { select: { course: { select: { id: true, workspaceId: true } } } } },
        },
      },
    });

    if (!quiz) return NextResponse.json({ error: "Quiz não encontrado" }, { status: 404 });

    const body = await request.json();
    const submittedAnswers = body.answers as Array<{ questionId: string; selectedOptionId: string }>;

    if (!Array.isArray(submittedAnswers) || submittedAnswers.length !== quiz.questions.length) {
      return NextResponse.json({ error: "Responda todas as perguntas" }, { status: 400 });
    }

    const results = quiz.questions.map((q) => {
      const answer = submittedAnswers.find((a) => a.questionId === q.id);
      const correctOption = q.options.find((o) => o.isCorrect);
      const isCorrect = answer?.selectedOptionId === correctOption?.id;
      return {
        questionId: q.id,
        selectedOptionId: answer?.selectedOptionId ?? null,
        correctOptionId: correctOption?.id ?? null,
        isCorrect,
      };
    });

    const correctCount = results.filter((r) => r.isCorrect).length;
    const score = Math.round((correctCount / quiz.questions.length) * 100);
    const passed = score >= quiz.passingScore;

    await prisma.quizAttempt.create({
      data: {
        quizId: quiz.id,
        userId: user.id,
        score,
        passed,
        answers: JSON.stringify(results),
      },
    });

    if (passed && quiz.lesson) {
      const course = quiz.lesson.module.course;
      processAutomations({
        type: "QUIZ_PASSED",
        workspaceId: course.workspaceId,
        courseId: course.id,
        userId: user.id,
        data: { quizId: quiz.id, score },
      }).catch(() => {});
    }

    return NextResponse.json({ score, passed, total: quiz.questions.length, correct: correctCount, results });
  } catch (error) {
    console.error("POST student quiz error:", error);
    return NextResponse.json({ error: "Erro ao enviar respostas" }, { status: 500 });
  }
}

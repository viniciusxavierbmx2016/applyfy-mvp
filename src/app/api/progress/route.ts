import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  computeLessonReleaseWithOverride,
  getCurrentUser,
  isEnrollmentActive,
  loadEnrollmentOverrides,
} from "@/lib/auth";
import { GAMIFICATION, getLevelForPoints } from "@/lib/utils";
import { createNotification } from "@/lib/notifications";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { lessonId, completed } = await request.json();
    if (!lessonId || typeof completed !== "boolean") {
      return NextResponse.json(
        { error: "lessonId e completed são obrigatórios" },
        { status: 400 }
      );
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: {
              include: {
                modules: { include: { lessons: { select: { id: true } } } },
              },
            },
          },
        },
      },
    });

    if (!lesson) {
      return NextResponse.json(
        { error: "Aula não encontrada" },
        { status: 404 }
      );
    }

    const course = lesson.module.course;

    // Enrollment check (admins bypass)
    if (user.role !== "ADMIN") {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: { userId: user.id, courseId: course.id },
        },
      });
      if (!isEnrollmentActive(enrollment)) {
        return NextResponse.json(
          { error: "Acesso expirado ou não matriculado" },
          { status: 403 }
        );
      }
      if (completed) {
        const overrides = await loadEnrollmentOverrides(enrollment!.id);
        const release = computeLessonReleaseWithOverride(
          enrollment!.createdAt,
          lesson.moduleId,
          lesson.id,
          lesson.module.daysToRelease,
          lesson.daysToRelease,
          overrides
        );
        if (!release.released) {
          return NextResponse.json(
            {
              error: `Este conteúdo será liberado em ${release.daysRemaining} dia${release.daysRemaining === 1 ? "" : "s"}`,
            },
            { status: 403 }
          );
        }
      }
    }

    // Previous state
    const existing = await prisma.lessonProgress.findUnique({
      where: {
        userId_lessonId: { userId: user.id, lessonId },
      },
    });
    const wasCompleted = existing?.completed ?? false;

    // Upsert progress
    await prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: { userId: user.id, lessonId },
      },
      create: {
        userId: user.id,
        lessonId,
        completed,
        completedAt: completed ? new Date() : null,
      },
      update: {
        completed,
        completedAt: completed ? new Date() : null,
      },
    });

    // Only award points on transition → true
    let pointsAwarded = 0;
    let moduleCompleted = false;
    let courseCompleted = false;

    if (completed && !wasCompleted) {
      pointsAwarded += GAMIFICATION.POINTS.COMPLETE_LESSON;

      // Check module completion
      const moduleLessons = await prisma.lesson.findMany({
        where: { moduleId: lesson.moduleId },
        select: { id: true },
      });
      const moduleLessonIds = moduleLessons.map((l) => l.id);

      const moduleProgress = await prisma.lessonProgress.findMany({
        where: {
          userId: user.id,
          lessonId: { in: moduleLessonIds },
          completed: true,
        },
        select: { lessonId: true },
      });

      if (
        moduleLessonIds.length > 0 &&
        moduleProgress.length === moduleLessonIds.length
      ) {
        moduleCompleted = true;
        pointsAwarded += GAMIFICATION.POINTS.COMPLETE_MODULE;
      }

      // Check course completion
      const courseLessonIds = course.modules.flatMap((m) =>
        m.lessons.map((l) => l.id)
      );
      const courseProgress = await prisma.lessonProgress.findMany({
        where: {
          userId: user.id,
          lessonId: { in: courseLessonIds },
          completed: true,
        },
        select: { lessonId: true },
      });

      if (
        courseLessonIds.length > 0 &&
        courseProgress.length === courseLessonIds.length
      ) {
        courseCompleted = true;
        pointsAwarded += GAMIFICATION.POINTS.COMPLETE_COURSE;
      }
    }

    // Penalize on unmark? PRD says award on transition → true; don't subtract on unmark.
    let updatedUser = user;
    let leveledUp = false;

    if (pointsAwarded > 0) {
      const newPoints = user.points + pointsAwarded;
      const newLevel = getLevelForPoints(newPoints).level;
      leveledUp = newLevel > user.level;

      updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { points: newPoints, level: newLevel },
      });

      if (leveledUp) {
        const levelInfo = getLevelForPoints(newPoints);
        await createNotification({
          userId: user.id,
          type: "LEVEL_UP",
          message: `Parabéns! Você alcançou o nível ${levelInfo.name}`,
          link: "/profile",
        });
      }
    }

    return NextResponse.json({
      success: true,
      pointsAwarded,
      moduleCompleted,
      courseCompleted,
      leveledUp,
      user: {
        points: updatedUser.points,
        level: updatedUser.level,
      },
    });
  } catch (error) {
    console.error("POST /api/progress error:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar progresso" },
      { status: 500 }
    );
  }
}

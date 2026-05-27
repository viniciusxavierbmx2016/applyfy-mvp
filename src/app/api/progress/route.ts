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
import { processAutomations } from "@/lib/automation-engine";
import { progressSchema, validateBody } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const raw = await request.json().catch(() => ({}));
    const v = validateBody(progressSchema, raw);
    if (!v.success) return v.error;
    const { lessonId, completed } = v.data;

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

    prisma.user.update({ where: { id: user.id }, data: { lastAccessAt: new Date() } }).catch(() => {});

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
      if (course.gamificationEnabled) {
        pointsAwarded += GAMIFICATION.POINTS.COMPLETE_LESSON;
      }

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
        if (course.gamificationEnabled) {
          pointsAwarded += GAMIFICATION.POINTS.COMPLETE_MODULE;
        }
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
        if (course.gamificationEnabled) {
          pointsAwarded += GAMIFICATION.POINTS.COMPLETE_COURSE;
        }
      }
    }

    // Fire-and-forget automation triggers
    if (completed && !wasCompleted) {
      const triggerBase = { workspaceId: course.workspaceId, courseId: course.id, userId: user.id };
      processAutomations({ type: "LESSON_COMPLETED", ...triggerBase, data: { lessonId } }).catch(() => {});
      if (moduleCompleted) {
        processAutomations({ type: "MODULE_COMPLETED", ...triggerBase, data: { moduleId: lesson.moduleId } }).catch(() => {});
      }
      if (courseCompleted) {
        processAutomations({ type: "COURSE_COMPLETED", ...triggerBase, data: { courseId: course.id } }).catch(() => {});
      }
    }

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

      // Per-workspace ledger entry: single row with the total delta (sum of
      // lesson + module + course bonuses). Source reflects the highest tier
      // completion so audits read naturally.
      await prisma.pointsLedger.create({
        data: {
          userId: user.id,
          workspaceId: course.workspaceId,
          delta: pointsAwarded,
          source: courseCompleted
            ? "COMPLETE_COURSE"
            : moduleCompleted
              ? "COMPLETE_MODULE"
              : "COMPLETE_LESSON",
          sourceId: courseCompleted
            ? course.id
            : moduleCompleted
              ? lesson.moduleId
              : lesson.id,
        },
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

      // F18: dispatch POINTS_REACHED trigger so automations with a points
      // threshold can fire (matchesTrigger only passes on the crossing).
      // Per-workspace gating: sum the ledger for this (user, workspace) so
      // points earned in OTHER workspaces never unlock automations here.
      // Aggregate runs AFTER the ledger.create above, so wsNewPoints already
      // includes the delta just awarded.
      const wsPointsResult = await prisma.pointsLedger.aggregate({
        where: { userId: user.id, workspaceId: course.workspaceId },
        _sum: { delta: true },
      });
      const wsNewPoints = wsPointsResult._sum.delta ?? 0;
      const wsPrevPoints = wsNewPoints - pointsAwarded;
      processAutomations({
        type: "POINTS_REACHED",
        workspaceId: course.workspaceId,
        userId: user.id,
        data: { prevPoints: wsPrevPoints, newPoints: wsNewPoints },
      }).catch(() => {});
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

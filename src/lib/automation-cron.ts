import { prisma } from "@/lib/prisma";
import { executeAction } from "@/lib/automation-engine";

const TAG_COLORS: Record<string, string> = {
  STUDENT_INACTIVE: "#ef4444",
  STUDENT_NEVER_ACCESSED: "#f97316",
  PROGRESS_BELOW: "#ec4899",
  PROGRESS_ABOVE: "#14b8a6",
  MODULE_NOT_STARTED: "#a855f7",
};

async function autoTagStudent(
  workspaceId: string,
  userId: string,
  triggerType: string,
  automationName: string
): Promise<void> {
  try {
    const tagName = `auto:${automationName}`;
    const color = TAG_COLORS[triggerType] || "#6366f1";
    const tag = await prisma.tag.upsert({
      where: { workspaceId_name: { workspaceId, name: tagName } },
      create: { workspaceId, name: tagName, color, autoSource: "automation" },
      update: {},
    });
    await prisma.userTag.upsert({
      where: { userId_tagId: { userId, tagId: tag.id } },
      create: { userId, tagId: tag.id },
      update: {},
    });
  } catch {
    // non-critical
  }
}

const BEHAVIORAL_TYPES = [
  "STUDENT_INACTIVE",
  "STUDENT_NEVER_ACCESSED",
  "PROGRESS_BELOW",
  "PROGRESS_ABOVE",
  "MODULE_NOT_STARTED",
];

async function findInactiveStudents(workspaceId: string, days: number) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return prisma.user.findMany({
    where: {
      enrollments: { some: { course: { workspaceId }, status: "ACTIVE" } },
      lastAccessAt: { lt: cutoff, not: null },
    },
    select: { id: true },
  });
}

async function findNeverAccessedStudents(workspaceId: string, afterDays: number) {
  const cutoff = new Date(Date.now() - afterDays * 24 * 60 * 60 * 1000);
  return prisma.user.findMany({
    where: {
      enrollments: {
        some: { course: { workspaceId }, status: "ACTIVE", createdAt: { lt: cutoff } },
      },
      lastAccessAt: null,
    },
    select: { id: true },
  });
}

async function findLowProgressStudents(
  workspaceId: string,
  courseId: string | null,
  progressPercent: number,
  afterDays: number
) {
  if (!courseId) return [];
  const cutoff = new Date(Date.now() - afterDays * 24 * 60 * 60 * 1000);

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId, status: "ACTIVE", createdAt: { lt: cutoff } },
    select: { userId: true },
  });
  if (enrollments.length === 0) return [];

  const totalLessons = await prisma.lesson.count({
    where: { module: { courseId } },
  });
  if (totalLessons === 0) return [];

  const result: { id: string }[] = [];
  for (const enr of enrollments) {
    const completed = await prisma.lessonProgress.count({
      where: {
        userId: enr.userId,
        completed: true,
        lesson: { module: { courseId } },
      },
    });
    const pct = (completed / totalLessons) * 100;
    if (pct < progressPercent) {
      result.push({ id: enr.userId });
    }
  }
  return result;
}

async function findHighProgressStudents(
  workspaceId: string,
  courseId: string | null,
  progressPercent: number
) {
  if (!courseId) return [];

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId, status: "ACTIVE" },
    select: { userId: true },
  });
  if (enrollments.length === 0) return [];

  const totalLessons = await prisma.lesson.count({
    where: { module: { courseId } },
  });
  if (totalLessons === 0) return [];

  const result: { id: string }[] = [];
  for (const enr of enrollments) {
    const completed = await prisma.lessonProgress.count({
      where: {
        userId: enr.userId,
        completed: true,
        lesson: { module: { courseId } },
      },
    });
    const pct = (completed / totalLessons) * 100;
    if (pct >= progressPercent) {
      result.push({ id: enr.userId });
    }
  }
  return result;
}

async function findModuleNotStartedStudents(
  workspaceId: string,
  courseId: string | null,
  moduleId: string,
  afterDays: number
) {
  if (!courseId) return [];
  const cutoff = new Date(Date.now() - afterDays * 24 * 60 * 60 * 1000);

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId, status: "ACTIVE", createdAt: { lt: cutoff } },
    select: { userId: true },
  });
  if (enrollments.length === 0) return [];

  const result: { id: string }[] = [];
  for (const enr of enrollments) {
    const started = await prisma.lessonProgress.count({
      where: {
        userId: enr.userId,
        lesson: { moduleId },
      },
    });
    if (started === 0) {
      result.push({ id: enr.userId });
    }
  }
  return result;
}

export async function checkBehavioralAutomations(workspaceId: string): Promise<number> {
  let triggered = 0;

  const automations = await prisma.automation.findMany({
    where: {
      workspaceId,
      active: true,
      triggerType: { in: BEHAVIORAL_TYPES },
    },
  });

  for (const auto of automations) {
    try {
      const config = JSON.parse(auto.triggerConfig) as Record<string, unknown>;
      let matchingStudents: { id: string }[] = [];

      switch (auto.triggerType) {
        case "STUDENT_INACTIVE":
          matchingStudents = await findInactiveStudents(workspaceId, (config.inactiveDays as number) || 7);
          break;
        case "STUDENT_NEVER_ACCESSED":
          matchingStudents = await findNeverAccessedStudents(workspaceId, (config.afterDays as number) || 3);
          break;
        case "PROGRESS_BELOW":
          matchingStudents = await findLowProgressStudents(
            workspaceId, auto.courseId, (config.progressPercent as number) || 25, (config.afterDays as number) || 14
          );
          break;
        case "PROGRESS_ABOVE":
          matchingStudents = await findHighProgressStudents(
            workspaceId, auto.courseId, (config.progressPercent as number) || 50
          );
          break;
        case "MODULE_NOT_STARTED":
          matchingStudents = await findModuleNotStartedStudents(
            workspaceId, auto.courseId, config.moduleId as string, (config.afterDays as number) || 7
          );
          break;
      }

      for (const student of matchingStudents) {
        const alreadyExecuted = await prisma.automationLog.findFirst({
          where: { automationId: auto.id, userId: student.id },
        });
        if (alreadyExecuted) continue;

        try {
          const result = await executeAction(auto, student.id, auto.courseId || undefined);

          await prisma.automationLog.create({
            data: {
              automationId: auto.id,
              userId: student.id,
              status: result.status,
              details: result.details,
            },
          });

          if (result.status === "SUCCESS") {
            triggered++;
            await prisma.automation.update({
              where: { id: auto.id },
              data: { executionCount: { increment: 1 }, lastExecutedAt: new Date() },
            });
            autoTagStudent(workspaceId, student.id, auto.triggerType, auto.name).catch(() => {});
          }
        } catch (err) {
          await prisma.automationLog.create({
            data: {
              automationId: auto.id,
              userId: student.id,
              status: "FAILED",
              details: err instanceof Error ? err.message : "Erro interno",
            },
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.error(`Behavioral automation ${auto.id} error:`, err);
    }
  }

  return triggered;
}

export async function runAllBehavioralAutomations(): Promise<{ processed: number; triggered: number }> {
  const workspaces = await prisma.workspace.findMany({
    where: {
      automations: {
        some: { active: true, triggerType: { in: BEHAVIORAL_TYPES } },
      },
    },
    select: { id: true },
  });

  let totalTriggered = 0;
  for (const ws of workspaces) {
    totalTriggered += await checkBehavioralAutomations(ws.id);
  }

  return { processed: workspaces.length, triggered: totalTriggered };
}

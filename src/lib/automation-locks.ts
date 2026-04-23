import { prisma } from "@/lib/prisma";

export interface AutomationLockInfo {
  reason: string;
}

export async function getAutomationLocks(
  courseId: string,
  userId: string
): Promise<Record<string, AutomationLockInfo>> {
  const automations = await prisma.automation.findMany({
    where: { active: true, courseId, actionType: "UNLOCK_MODULE" },
    select: { id: true, triggerType: true, triggerConfig: true, actionConfig: true },
  });

  if (automations.length === 0) return {};

  const targetMap = new Map<string, (typeof automations)[0]>();
  for (const auto of automations) {
    try {
      const cfg = JSON.parse(auto.actionConfig as string);
      if (cfg.moduleId) targetMap.set(cfg.moduleId as string, auto);
    } catch { /* ignore */ }
  }

  if (targetMap.size === 0) return {};

  const enrollment = await prisma.enrollment.findFirst({
    where: { userId, courseId, status: "ACTIVE" },
    select: { id: true },
  });

  if (!enrollment) return {};

  const overrides = await prisma.enrollmentOverride.findMany({
    where: {
      enrollmentId: enrollment.id,
      moduleId: { in: Array.from(targetMap.keys()) },
      released: true,
    },
    select: { moduleId: true },
  });

  const releasedSet = new Set(overrides.map((o) => o.moduleId!));

  const triggerModuleIds = new Set<string>();
  const triggerLessonIds = new Set<string>();
  Array.from(targetMap.values()).forEach((auto) => {
    try {
      const cfg = JSON.parse(auto.triggerConfig as string);
      if (cfg.moduleId) triggerModuleIds.add(cfg.moduleId as string);
      if (cfg.lessonId) triggerLessonIds.add(cfg.lessonId as string);
    } catch { /* ignore */ }
  });

  const [triggerModules, triggerLessons] = await Promise.all([
    triggerModuleIds.size > 0
      ? prisma.module.findMany({
          where: { id: { in: Array.from(triggerModuleIds) } },
          select: { id: true, title: true },
        })
      : [],
    triggerLessonIds.size > 0
      ? prisma.lesson.findMany({
          where: { id: { in: Array.from(triggerLessonIds) } },
          select: { id: true, title: true },
        })
      : [],
  ]);

  const moduleNames = new Map(triggerModules.map((m) => [m.id, m.title]));
  const lessonNames = new Map(triggerLessons.map((l) => [l.id, l.title]));

  const result: Record<string, AutomationLockInfo> = {};

  Array.from(targetMap.entries()).forEach(([moduleId, auto]) => {
    if (releasedSet.has(moduleId)) return;

    const cfg = JSON.parse(auto.triggerConfig as string);
    let reason = "Complete a atividade anterior para desbloquear";

    switch (auto.triggerType) {
      case "MODULE_COMPLETED": {
        const name = moduleNames.get(cfg.moduleId as string);
        reason = `Complete "${name || "o módulo anterior"}" para desbloquear`;
        break;
      }
      case "LESSON_COMPLETED": {
        const name = lessonNames.get(cfg.lessonId as string);
        reason = `Complete a aula "${name || "anterior"}" para desbloquear`;
        break;
      }
      case "QUIZ_PASSED":
        reason = "Passe no quiz para desbloquear";
        break;
      case "COURSE_COMPLETED":
        reason = "Complete o curso para desbloquear";
        break;
    }

    result[moduleId] = { reason };
  });

  return result;
}

import { prisma } from "@/lib/prisma";
import { generateCertificateCode } from "@/lib/certificate-pdf";

export interface AutomationTrigger {
  type: string;
  workspaceId: string;
  courseId?: string;
  userId: string;
  data?: Record<string, unknown>;
}

const BEHAVIORAL_TRIGGERS = [
  "STUDENT_INACTIVE",
  "STUDENT_NEVER_ACCESSED",
  "PROGRESS_BELOW",
  "PROGRESS_ABOVE",
  "MODULE_NOT_STARTED",
  "HAS_TAG",
];

export function isBehavioralTrigger(type: string): boolean {
  return BEHAVIORAL_TRIGGERS.includes(type);
}

function matchesTrigger(
  trigger: AutomationTrigger,
  config: Record<string, unknown>
): boolean {
  switch (trigger.type) {
    case "LESSON_COMPLETED":
      return !config.lessonId || config.lessonId === trigger.data?.lessonId;
    case "MODULE_COMPLETED":
      return !config.moduleId || config.moduleId === trigger.data?.moduleId;
    case "COURSE_COMPLETED":
      return !config.courseId || config.courseId === trigger.data?.courseId;
    case "QUIZ_PASSED":
      return !config.quizId || config.quizId === trigger.data?.quizId;
    case "STUDENT_ENROLLED":
      return true;
    default:
      return false;
  }
}

export async function executeAction(
  automation: { id: string; actionType: string; actionConfig: string },
  userId: string,
  courseId?: string
): Promise<{ status: string; details?: string }> {
  const config = JSON.parse(automation.actionConfig) as Record<string, unknown>;

  switch (automation.actionType) {
    case "UNLOCK_MODULE": {
      const moduleId = config.moduleId as string;
      if (!moduleId) return { status: "FAILED", details: "moduleId ausente" };
      const enrollment = courseId
        ? await prisma.enrollment.findFirst({
            where: { userId, courseId, status: "ACTIVE" },
          })
        : null;
      if (!enrollment) return { status: "SKIPPED", details: "Sem matrícula ativa" };
      await prisma.enrollmentOverride.upsert({
        where: { enrollmentId_moduleId: { enrollmentId: enrollment.id, moduleId } },
        create: { enrollmentId: enrollment.id, moduleId, released: true },
        update: { released: true },
      });
      return { status: "SUCCESS", details: `Módulo ${moduleId} liberado` };
    }

    case "SEND_EMAIL": {
      const subject = (config.subject as string) || "Notificação";
      const body = (config.body as string) || "";
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
      if (!user) return { status: "FAILED", details: "Usuário não encontrado" };
      try {
        const apiKey = process.env.BREVO_API_KEY;
        if (!apiKey) return { status: "SKIPPED", details: "BREVO_API_KEY não configurada" };
        await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: { "api-key": apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            sender: { name: "Members Club", email: "noreply@membersclub.com.br" },
            to: [{ email: user.email, name: user.name }],
            subject,
            htmlContent: body.replace(/\n/g, "<br>"),
          }),
        });
        return { status: "SUCCESS", details: `Email enviado para ${user.email}` };
      } catch (err) {
        return { status: "FAILED", details: err instanceof Error ? err.message : "Erro ao enviar email" };
      }
    }

    case "ENROLL_COURSE": {
      const targetCourseId = config.courseId as string;
      if (!targetCourseId) return { status: "FAILED", details: "courseId ausente" };
      const existing = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId: targetCourseId } },
      });
      if (existing?.status === "ACTIVE") return { status: "SKIPPED", details: "Já matriculado" };
      await prisma.enrollment.upsert({
        where: { userId_courseId: { userId, courseId: targetCourseId } },
        create: { userId, courseId: targetCourseId, status: "ACTIVE" },
        update: { status: "ACTIVE" },
      });
      return { status: "SUCCESS", details: `Matriculado no curso ${targetCourseId}` };
    }

    case "GRANT_CERTIFICATE": {
      if (!courseId) return { status: "FAILED", details: "courseId ausente" };
      const existing = await prisma.certificate.findFirst({ where: { userId, courseId } });
      if (existing) return { status: "SKIPPED", details: "Certificado já existe" };
      const code = generateCertificateCode(userId, courseId);
      await prisma.certificate.create({ data: { userId, courseId, code } });
      return { status: "SUCCESS", details: "Certificado gerado" };
    }

    case "ADD_TAG": {
      const tagName = config.tagName as string;
      if (!tagName) return { status: "FAILED", details: "tagName ausente" };
      const workspaceId = config.workspaceId as string;
      if (!workspaceId) return { status: "FAILED", details: "workspaceId ausente" };
      const tagColor = (config.tagColor as string) || "#6366f1";
      const tag = await prisma.tag.upsert({
        where: { workspaceId_name: { workspaceId, name: tagName } },
        create: { workspaceId, name: tagName, color: tagColor, autoSource: "automation" },
        update: {},
      });
      const existingLink = await prisma.userTag.findUnique({
        where: { userId_tagId: { userId, tagId: tag.id } },
      });
      if (existingLink) return { status: "SKIPPED", details: "Tag já atribuída" };
      await prisma.userTag.create({ data: { userId, tagId: tag.id } });
      return { status: "SUCCESS", details: `Tag "${tagName}" atribuída` };
    }

    default:
      return { status: "FAILED", details: `Ação desconhecida: ${automation.actionType}` };
  }
}

const TAG_COLORS: Record<string, string> = {
  LESSON_COMPLETED: "#10b981",
  MODULE_COMPLETED: "#3b82f6",
  COURSE_COMPLETED: "#8b5cf6",
  QUIZ_PASSED: "#f59e0b",
  STUDENT_ENROLLED: "#06b6d4",
  STUDENT_INACTIVE: "#ef4444",
  STUDENT_NEVER_ACCESSED: "#f97316",
  PROGRESS_BELOW: "#ec4899",
  PROGRESS_ABOVE: "#14b8a6",
  MODULE_NOT_STARTED: "#a855f7",
  HAS_TAG: "#7c3aed",
};

function generateAutoTagName(triggerType: string, actionType: string, automationName: string): string {
  return `auto:${automationName}`;
}

async function autoTagStudent(
  workspaceId: string,
  userId: string,
  triggerType: string,
  actionType: string,
  automationName: string
): Promise<void> {
  try {
    const tagName = generateAutoTagName(triggerType, actionType, automationName);
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

export async function processAutomations(trigger: AutomationTrigger): Promise<void> {
  try {
    const automations = await prisma.automation.findMany({
      where: {
        workspaceId: trigger.workspaceId,
        active: true,
        triggerType: trigger.type,
      },
    });

    for (const auto of automations) {
      try {
        const config = JSON.parse(auto.triggerConfig) as Record<string, unknown>;
        if (!matchesTrigger(trigger, config)) continue;

        const result = await executeAction(auto, trigger.userId, trigger.courseId);

        await prisma.automationLog.create({
          data: {
            automationId: auto.id,
            userId: trigger.userId,
            status: result.status,
            details: result.details,
          },
        });

        if (result.status === "SUCCESS") {
          await prisma.automation.update({
            where: { id: auto.id },
            data: {
              executionCount: { increment: 1 },
              lastExecutedAt: new Date(),
            },
          });
          autoTagStudent(trigger.workspaceId, trigger.userId, trigger.type, auto.actionType, auto.name).catch(() => {});
        }
      } catch (err) {
        console.error(`Automation ${auto.id} error:`, err);
        await prisma.automationLog.create({
          data: {
            automationId: auto.id,
            userId: trigger.userId,
            status: "FAILED",
            details: err instanceof Error ? err.message : "Erro interno",
          },
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.error("processAutomations error:", err);
  }
}

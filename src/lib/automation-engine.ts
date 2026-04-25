import { prisma } from "@/lib/prisma";
import { generateCertificateCode } from "@/lib/certificate-pdf";
import { sendEmail } from "@/lib/email";
import { automationEmail } from "@/lib/email-templates";
import { sendPushToUser } from "@/lib/push-send";
import { autoTagStudent } from "@/lib/automation-constants";

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

async function resolveVariables(
  text: string,
  userId: string,
  courseId?: string,
  triggerConfig?: string
): Promise<string> {
  let result = text;
  if (result.includes("{nome}")) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    result = result.replace(/\{nome\}/g, user?.name || "Aluno");
  }
  if (result.includes("{curso}") && courseId) {
    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { title: true } });
    result = result.replace(/\{curso\}/g, course?.title || "");
  }
  if (result.includes("{modulo}") && triggerConfig) {
    try {
      const cfg = JSON.parse(triggerConfig);
      if (cfg.moduleId) {
        const mod = await prisma.module.findUnique({ where: { id: cfg.moduleId }, select: { title: true } });
        result = result.replace(/\{modulo\}/g, mod?.title || "");
      }
    } catch { /* ignore */ }
  }
  return result;
}

export async function executeAction(
  automation: { id: string; actionType: string; actionConfig: string; workspaceId?: string; triggerConfig?: string; courseId?: string | null },
  userId: string,
  courseId?: string
): Promise<{ status: string; details?: string }> {
  const config = JSON.parse(automation.actionConfig) as Record<string, unknown>;
  const effectiveCourseId = courseId || automation.courseId || undefined;

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
      const rawSubject = (config.subject as string) || "Notificação";
      const rawBody = (config.body as string) || "";
      const subject = await resolveVariables(rawSubject, userId, effectiveCourseId, automation.triggerConfig);
      const body = await resolveVariables(rawBody, userId, effectiveCourseId, automation.triggerConfig);
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
      if (!user) return { status: "FAILED", details: "Usuário não encontrado" };
      try {
        const workspace = automation.workspaceId
          ? await prisma.workspace.findUnique({ where: { id: automation.workspaceId }, select: { name: true } })
          : null;
        const template = automationEmail(user.name || "", subject, body, workspace?.name || undefined);
        const result = await sendEmail({
          to: { email: user.email, name: user.name || undefined },
          subject: template.subject,
          htmlContent: template.htmlContent,
          senderName: workspace?.name || undefined,
        });
        if (!result.success) {
          return { status: "SKIPPED", details: typeof result.error === "string" ? result.error : "Falha ao enviar email" };
        }
        return { status: "SUCCESS", details: `Email enviado para ${user.email}` };
      } catch (err) {
        return { status: "FAILED", details: err instanceof Error ? err.message : "Erro ao enviar email" };
      }
    }

    case "SEND_PUSH": {
      const pushTitle = await resolveVariables(
        (config.pushTitle as string) || "Notificação",
        userId, effectiveCourseId, automation.triggerConfig
      );
      const pushBody = await resolveVariables(
        (config.pushBody as string) || "",
        userId, effectiveCourseId, automation.triggerConfig
      );
      const pushUrl = (config.pushUrl as string) || "/";
      try {
        await sendPushToUser(userId, {
          title: pushTitle,
          body: pushBody,
          url: pushUrl,
          tag: `automation-${automation.id}`,
        });
        return { status: "SUCCESS", details: `Push enviado` };
      } catch (err) {
        return { status: "FAILED", details: err instanceof Error ? err.message : "Erro ao enviar push" };
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
      const workspaceId = (config.workspaceId as string) || automation.workspaceId;
      if (!workspaceId) return { status: "FAILED", details: "workspaceId ausente" };
      const tagColor = (config.tagColor as string) || "#3b82f6";
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

        const delayMinutes = Number(config.delayMinutes) || 0;

        if (delayMinutes > 0) {
          const existing = await prisma.pendingExecution.findFirst({
            where: { automationId: auto.id, userId: trigger.userId, status: "PENDING" },
          });
          if (existing) continue;

          await prisma.pendingExecution.create({
            data: {
              automationId: auto.id,
              userId: trigger.userId,
              triggerData: JSON.stringify({
                courseId: trigger.courseId,
                workspaceId: trigger.workspaceId,
                triggerType: trigger.type,
                data: trigger.data,
              }),
              executeAt: new Date(Date.now() + delayMinutes * 60 * 1000),
              status: "PENDING",
            },
          });

          await prisma.automationLog.create({
            data: {
              automationId: auto.id,
              userId: trigger.userId,
              status: "SCHEDULED",
              details: `Agendado para ${delayMinutes} minutos após o gatilho`,
            },
          });
          continue;
        }

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
          autoTagStudent(trigger.workspaceId, trigger.userId, trigger.type, auto.name).catch(() => {});
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

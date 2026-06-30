import { prisma } from "@/lib/prisma";

// Trigger/action catalog + compatibility. Moved verbatim from the automations
// route so both the create (POST) and update (PUT) routes can share the same
// validation. The producer UI keeps its own copies under
// src/app/producer/automations/_lib (client-side, intentionally separate).
export const VALID_TRIGGERS = [
  "LESSON_COMPLETED", "MODULE_COMPLETED", "COURSE_COMPLETED", "QUIZ_PASSED",
  "STUDENT_ENROLLED", "STUDENT_INACTIVE", "STUDENT_NEVER_ACCESSED",
  "PROGRESS_BELOW", "PROGRESS_ABOVE", "MODULE_NOT_STARTED", "HAS_TAG",
];
export const VALID_ACTIONS = ["UNLOCK_MODULE", "SEND_EMAIL", "ENROLL_COURSE", "ADD_TAG", "SEND_PUSH"];

export const GLOBAL_TRIGGERS = ["STUDENT_INACTIVE", "STUDENT_NEVER_ACCESSED", "HAS_TAG"];

export const VALID_PAIRS: Record<string, string[]> = {
  MODULE_COMPLETED: ["UNLOCK_MODULE", "SEND_EMAIL", "ENROLL_COURSE", "SEND_PUSH", "ADD_TAG"],
  COURSE_COMPLETED: ["SEND_EMAIL", "ENROLL_COURSE", "SEND_PUSH", "ADD_TAG"],
  LESSON_COMPLETED: ["SEND_EMAIL", "UNLOCK_MODULE", "ENROLL_COURSE", "SEND_PUSH", "ADD_TAG"],
  QUIZ_PASSED: ["SEND_EMAIL", "UNLOCK_MODULE", "ENROLL_COURSE", "SEND_PUSH", "ADD_TAG"],
  STUDENT_ENROLLED: ["SEND_EMAIL", "ENROLL_COURSE", "SEND_PUSH", "ADD_TAG"],
  STUDENT_INACTIVE: ["SEND_EMAIL", "SEND_PUSH", "ADD_TAG"],
  STUDENT_NEVER_ACCESSED: ["SEND_EMAIL", "SEND_PUSH", "ADD_TAG"],
  PROGRESS_BELOW: ["SEND_EMAIL", "SEND_PUSH", "ADD_TAG"],
  PROGRESS_ABOVE: ["SEND_EMAIL", "SEND_PUSH", "ADD_TAG"],
  MODULE_NOT_STARTED: ["SEND_EMAIL", "SEND_PUSH", "ADD_TAG"],
  HAS_TAG: ["SEND_EMAIL", "ENROLL_COURSE", "UNLOCK_MODULE", "SEND_PUSH", "ADD_TAG"],
};

// Synchronous shape/compatibility validation. Returns an error message (→ 400)
// or null. Moved verbatim from automations/route.ts.
export function validateAutomation(
  triggerType: string,
  actionType: string,
  triggerConfig: Record<string, unknown>,
  actionConfig: Record<string, unknown>,
  courseId: string | null
): string | null {
  if (!VALID_TRIGGERS.includes(triggerType)) return "Tipo de trigger inválido";
  if (!VALID_ACTIONS.includes(actionType)) return "Tipo de ação inválido";

  const allowed = VALID_PAIRS[triggerType];
  if (allowed && !allowed.includes(actionType)) {
    return `Ação "${actionType}" não é compatível com o trigger "${triggerType}"`;
  }

  if (!GLOBAL_TRIGGERS.includes(triggerType) && !courseId) {
    return "Selecione um curso para esta automação";
  }

  if (triggerType === "STUDENT_INACTIVE") {
    const days = Number(triggerConfig.inactiveDays);
    if (!days || days < 1) return "Informe dias de inatividade (mínimo 1)";
  }
  if (triggerType === "STUDENT_NEVER_ACCESSED") {
    const days = Number(triggerConfig.afterDays);
    if (!days || days < 1) return "Informe dias após matrícula (mínimo 1)";
  }
  if (triggerType === "PROGRESS_BELOW") {
    const pct = Number(triggerConfig.progressPercent);
    const days = Number(triggerConfig.afterDays);
    if (!pct || pct < 1 || pct > 99) return "Informe porcentagem entre 1 e 99";
    if (!days || days < 1) return "Informe dias mínimos";
  }
  if (triggerType === "PROGRESS_ABOVE") {
    const pct = Number(triggerConfig.progressPercent);
    if (!pct || pct < 1 || pct > 100) return "Informe porcentagem entre 1 e 100";
  }
  if (triggerType === "MODULE_NOT_STARTED") {
    if (!triggerConfig.moduleId) return "Selecione o módulo";
    const days = Number(triggerConfig.afterDays);
    if (!days || days < 1) return "Informe dias mínimos";
  }
  if (triggerType === "HAS_TAG") {
    if (!triggerConfig.tagId) return "Selecione uma tag";
  }

  if (actionType === "UNLOCK_MODULE") {
    if (!actionConfig.moduleId) return "Selecione o módulo para liberar";
    if (triggerType === "MODULE_COMPLETED" && triggerConfig.moduleId === actionConfig.moduleId) {
      return "O módulo do trigger não pode ser o mesmo da ação";
    }
  }
  if (actionType === "SEND_EMAIL") {
    if (!actionConfig.subject || !(actionConfig.subject as string).trim()) return "Informe o assunto do email";
    if (!actionConfig.body || !(actionConfig.body as string).trim()) return "Informe o corpo do email";
  }
  if (actionType === "ENROLL_COURSE") {
    if (!actionConfig.courseId) return "Selecione o curso destino";
  }
  if (actionType === "SEND_PUSH") {
    if (!actionConfig.pushTitle || !(actionConfig.pushTitle as string).trim()) return "Informe o título da notificação";
    if (!actionConfig.pushBody || !(actionConfig.pushBody as string).trim()) return "Informe a mensagem da notificação";
  }
  if (actionType === "ADD_TAG") {
    if (!actionConfig.tagName || !(actionConfig.tagName as string).trim()) return "Informe o nome da tag";
  }

  return null;
}

// Cross-tenant guard (família do FURO#5): garante que todo recurso referenciado
// (curso/módulo/tag, no trigger e na ação) pertence ao workspace ANTES de gravar.
// Mesmo contrato do validateAutomation: retorna a mensagem de erro (→ 400) ou null.
// Id ausente (opcional) é pulado; id presente fora do ws é rejeitado.
export async function validateAutomationResources(
  workspaceId: string,
  opts: {
    courseId?: string | null;
    actionType?: string;
    actionConfig?: Record<string, unknown>;
    triggerType?: string;
    triggerConfig?: Record<string, unknown>;
  }
): Promise<string | null> {
  const { courseId, actionType, actionConfig = {}, triggerType, triggerConfig = {} } = opts;

  const courseInWs = (id: string) =>
    prisma.course.findFirst({ where: { id, workspaceId }, select: { id: true } });
  const moduleInWs = (id: string) =>
    prisma.module.findFirst({ where: { id, course: { workspaceId } }, select: { id: true } });
  const tagInWs = (id: string) =>
    prisma.tag.findFirst({ where: { id, workspaceId }, select: { id: true } });

  // 1) curso top-level (trigger course) — feeds GRANT_CERTIFICATE/UNLOCK/vars
  if (courseId && !(await courseInWs(courseId))) {
    return "Curso não pertence a este workspace";
  }

  // 2) ENROLL_COURSE — curso destino (o maior blast)
  if (actionType === "ENROLL_COURSE") {
    const cid = actionConfig.courseId as string | undefined;
    if (cid && !(await courseInWs(cid))) {
      return "Curso destino não pertence a este workspace";
    }
  }

  // 3) UNLOCK_MODULE — módulo destino
  if (actionType === "UNLOCK_MODULE") {
    const mid = actionConfig.moduleId as string | undefined;
    if (mid && !(await moduleInWs(mid))) {
      return "Módulo não pertence a este workspace";
    }
  }

  // 4) MODULE_* trigger — módulo do gatilho
  if (triggerType === "MODULE_NOT_STARTED" || triggerType === "MODULE_COMPLETED") {
    const mid = triggerConfig.moduleId as string | undefined;
    if (mid && !(await moduleInWs(mid))) {
      return "Módulo do gatilho não pertence a este workspace";
    }
  }

  // 5) HAS_TAG trigger — tag do gatilho
  if (triggerType === "HAS_TAG") {
    const tid = triggerConfig.tagId as string | undefined;
    if (tid && !(await tagInWs(tid))) {
      return "Tag do gatilho não pertence a este workspace";
    }
  }

  return null;
}

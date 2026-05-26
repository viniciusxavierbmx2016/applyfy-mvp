import { AutomationItem, CourseOption, TagOption, CanvasNode } from "../_types";
import { VALID_ACTIONS_FOR_TRIGGER, GLOBAL_TRIGGERS } from "./meta";

export function getValidActions(triggerType: string): string[] {
  return VALID_ACTIONS_FOR_TRIGGER[triggerType] || [];
}

export function formatDelay(minutes: number): string {
  if (minutes >= 1440 && minutes % 1440 === 0) return `${minutes / 1440} dia(s)`;
  if (minutes >= 60 && minutes % 60 === 0) return `${minutes / 60} hora(s)`;
  return `${minutes} min`;
}

export function parseDelayMinutes(minutes: number): { value: string; unit: string } {
  if (!minutes || minutes <= 0) return { value: "", unit: "minutes" };
  if (minutes >= 1440 && minutes % 1440 === 0) return { value: String(minutes / 1440), unit: "days" };
  if (minutes >= 60 && minutes % 60 === 0) return { value: String(minutes / 60), unit: "hours" };
  return { value: String(minutes), unit: "minutes" };
}

export function toDelayMinutes(value: string, unit: string): number {
  const n = Number(value) || 0;
  if (n <= 0) return 0;
  if (unit === "hours") return n * 60;
  if (unit === "days") return n * 1440;
  return n;
}

export function getTriggerDetail(auto: AutomationItem, courses: CourseOption[], tags?: TagOption[]): string | null {
  try {
    const cfg = JSON.parse(auto.triggerConfig);
    if (auto.triggerType === "HAS_TAG" && cfg.tagId && tags) {
      const tag = tags.find((t) => t.id === cfg.tagId);
      return tag ? `${tag.name} (${tag.studentCount})` : null;
    }
    if (auto.triggerType === "POINTS_REACHED" && cfg.minPoints != null) {
      return `≥ ${cfg.minPoints} pontos`;
    }
    if (cfg.inactiveDays) return `${cfg.inactiveDays} dias`;
    if (cfg.afterDays && auto.triggerType === "STUDENT_NEVER_ACCESSED") return `após ${cfg.afterDays}d`;
    if (cfg.progressPercent != null) {
      const extra = cfg.afterDays ? ` após ${cfg.afterDays}d` : "";
      return `${cfg.progressPercent}%${extra}`;
    }
    const course = courses.find((c) => c.id === auto.courseId);
    if (cfg.moduleId && course) {
      const mod = course.modules.find((m) => m.id === cfg.moduleId);
      return mod?.title || null;
    }
    if (cfg.lessonId && course) {
      for (const m of course.modules) {
        const l = m.lessons.find((les) => les.id === cfg.lessonId);
        if (l) return l.title;
      }
    }
  } catch { /* ignore */ }
  return null;
}

export function getActionDetail(auto: AutomationItem, courses: CourseOption[]): string | null {
  try {
    const cfg = JSON.parse(auto.actionConfig);
    if (cfg.moduleId) {
      const course = courses.find((c) => c.id === auto.courseId);
      const mod = course?.modules.find((m) => m.id === cfg.moduleId);
      return mod?.title || null;
    }
    if (cfg.subject) return `"${cfg.subject}"`;
    if (cfg.pushTitle) return `"${cfg.pushTitle}"`;
    if (cfg.tagName) return `"${cfg.tagName}"`;
    if (cfg.courseId) {
      const c = courses.find((cr) => cr.id === cfg.courseId);
      return c?.title || null;
    }
  } catch { /* ignore */ }
  return null;
}

export function validateFrontend(
  name: string, courseId: string, triggerType: string, triggerConfig: Record<string, string>,
  actionType: string, actionConfig: Record<string, string>
): string | null {
  if (!name.trim()) return "Nome é obrigatório";
  if (!GLOBAL_TRIGGERS.includes(triggerType) && !courseId) return "Selecione um curso";
  if (!triggerType) return "Selecione o gatilho (clique no nó azul)";
  if (!actionType) return "Selecione a ação (clique no nó verde)";

  const validActions = getValidActions(triggerType);
  if (!validActions.includes(actionType)) return "Ação incompatível com o gatilho selecionado";

  if (triggerType === "STUDENT_INACTIVE" && (!triggerConfig.inactiveDays || Number(triggerConfig.inactiveDays) < 1)) return "Informe dias de inatividade";
  if (triggerType === "STUDENT_NEVER_ACCESSED" && (!triggerConfig.afterDays || Number(triggerConfig.afterDays) < 1)) return "Informe dias após matrícula";
  if (triggerType === "PROGRESS_BELOW") {
    if (!triggerConfig.progressPercent || Number(triggerConfig.progressPercent) < 1) return "Informe a porcentagem";
    if (!triggerConfig.afterDays || Number(triggerConfig.afterDays) < 1) return "Informe dias mínimos";
  }
  if (triggerType === "PROGRESS_ABOVE" && (!triggerConfig.progressPercent || Number(triggerConfig.progressPercent) < 1)) return "Informe a porcentagem";
  if (triggerType === "MODULE_NOT_STARTED") {
    if (!triggerConfig.moduleId) return "Selecione o módulo no trigger";
    if (!triggerConfig.afterDays || Number(triggerConfig.afterDays) < 1) return "Informe dias mínimos";
  }
  if (triggerType === "HAS_TAG") {
    if (!triggerConfig.tagId) return "Selecione uma tag";
  }

  if (actionType === "UNLOCK_MODULE") {
    if (!actionConfig.moduleId) return "Selecione o módulo para liberar";
    if (triggerType === "MODULE_COMPLETED" && triggerConfig.moduleId === actionConfig.moduleId) return "O módulo do trigger deve ser diferente do módulo da ação";
  }
  if (actionType === "SEND_EMAIL") {
    if (!actionConfig.subject?.trim()) return "Informe o assunto do email";
    if (!actionConfig.body?.trim()) return "Informe o corpo do email";
  }
  if (actionType === "ENROLL_COURSE" && !actionConfig.courseId) return "Selecione o curso destino";
  if (actionType === "SEND_PUSH") {
    if (!actionConfig.pushTitle?.trim()) return "Informe o título da notificação";
    if (!actionConfig.pushBody?.trim()) return "Informe a mensagem da notificação";
  }
  if (actionType === "ADD_TAG" && !actionConfig.tagName?.trim()) return "Informe o nome da tag";

  return null;
}

export function defaultNodes(): CanvasNode[] {
  return [
    { id: "start", type: "start", x: 80, y: 250 },
    { id: "trigger", type: "trigger", x: 220, y: 220 },
    { id: "action", type: "action", x: 540, y: 220 },
  ];
}

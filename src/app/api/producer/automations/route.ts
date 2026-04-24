import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { resolveStaffWorkspace } from "@/lib/workspace";

const VALID_TRIGGERS = [
  "LESSON_COMPLETED", "MODULE_COMPLETED", "COURSE_COMPLETED", "QUIZ_PASSED",
  "STUDENT_ENROLLED", "STUDENT_INACTIVE", "STUDENT_NEVER_ACCESSED",
  "PROGRESS_BELOW", "PROGRESS_ABOVE", "MODULE_NOT_STARTED", "HAS_TAG",
];
const VALID_ACTIONS = ["UNLOCK_MODULE", "SEND_EMAIL", "ENROLL_COURSE", "ADD_TAG", "SEND_PUSH"];
const MAX_AUTOMATIONS = 20;

const GLOBAL_TRIGGERS = ["STUDENT_INACTIVE", "STUDENT_NEVER_ACCESSED", "HAS_TAG"];

const VALID_PAIRS: Record<string, string[]> = {
  MODULE_COMPLETED: ["UNLOCK_MODULE", "SEND_EMAIL", "ENROLL_COURSE", "SEND_PUSH", "ADD_TAG"],
  COURSE_COMPLETED: ["SEND_EMAIL", "ENROLL_COURSE", "SEND_PUSH", "ADD_TAG"],
  LESSON_COMPLETED: ["SEND_EMAIL", "UNLOCK_MODULE", "ENROLL_COURSE", "SEND_PUSH", "ADD_TAG"],
  QUIZ_PASSED: ["SEND_EMAIL", "UNLOCK_MODULE", "ENROLL_COURSE", "SEND_PUSH", "ADD_TAG"],
  STUDENT_ENROLLED: ["ENROLL_COURSE", "SEND_PUSH", "ADD_TAG"],
  STUDENT_INACTIVE: ["SEND_EMAIL", "SEND_PUSH", "ADD_TAG"],
  STUDENT_NEVER_ACCESSED: ["SEND_EMAIL", "SEND_PUSH", "ADD_TAG"],
  PROGRESS_BELOW: ["SEND_EMAIL", "SEND_PUSH", "ADD_TAG"],
  PROGRESS_ABOVE: ["SEND_EMAIL", "SEND_PUSH", "ADD_TAG"],
  MODULE_NOT_STARTED: ["SEND_EMAIL", "SEND_PUSH", "ADD_TAG"],
  HAS_TAG: ["SEND_EMAIL", "ENROLL_COURSE", "UNLOCK_MODULE", "SEND_PUSH", "ADD_TAG"],
};

async function getWorkspaceId(staff: Parameters<typeof resolveStaffWorkspace>[0]) {
  const { workspace } = await resolveStaffWorkspace(staff);
  if (!workspace) throw new Error("Sem permissão");
  return workspace.id;
}

export async function GET() {
  try {
    const staff = await requireStaff();
    const workspaceId = await getWorkspaceId(staff);

    const [automations, courses, tags] = await Promise.all([
      prisma.automation.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.course.findMany({
        where: { workspaceId },
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          modules: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              title: true,
              daysToRelease: true,
              lessons: {
                orderBy: { order: "asc" },
                select: {
                  id: true,
                  title: true,
                  quiz: { select: { id: true } },
                },
              },
            },
          },
        },
      }),
      prisma.tag.findMany({
        where: { workspaceId },
        orderBy: { name: "asc" },
        select: { id: true, name: true, color: true, _count: { select: { userTags: true } } },
      }),
    ]);

    return NextResponse.json({
      automations,
      courses,
      tags: tags.map((t) => ({ id: t.id, name: t.name, color: t.color, studentCount: t._count.userTags })),
    });
  } catch (error) {
    console.error("GET automations error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

function validateAutomation(
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

export async function POST(request: Request) {
  try {
    const staff = await requireStaff();
    const workspaceId = await getWorkspaceId(staff);

    const count = await prisma.automation.count({ where: { workspaceId } });
    if (count >= MAX_AUTOMATIONS) {
      return NextResponse.json(
        { error: `Limite de ${MAX_AUTOMATIONS} automações atingido` },
        { status: 400 }
      );
    }

    const { name, triggerType, triggerConfig, actionType, actionConfig, courseId } =
      await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
    }

    const validationError = validateAutomation(
      triggerType, actionType,
      triggerConfig || {}, actionConfig || {},
      courseId || null
    );
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const automation = await prisma.automation.create({
      data: {
        workspaceId,
        courseId: courseId || null,
        name: name.trim(),
        triggerType,
        triggerConfig: JSON.stringify(triggerConfig || {}),
        actionType,
        actionConfig: JSON.stringify(actionConfig || {}),
      },
    });

    return NextResponse.json({ automation }, { status: 201 });
  } catch (error) {
    console.error("POST automations error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

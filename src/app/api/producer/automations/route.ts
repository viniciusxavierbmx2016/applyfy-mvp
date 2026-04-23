import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { resolveStaffWorkspace } from "@/lib/workspace";

const VALID_TRIGGERS = ["LESSON_COMPLETED", "MODULE_COMPLETED", "COURSE_COMPLETED", "QUIZ_PASSED", "STUDENT_ENROLLED"];
const VALID_ACTIONS = ["UNLOCK_MODULE", "SEND_EMAIL", "GRANT_CERTIFICATE", "ENROLL_COURSE", "ADD_TAG"];
const MAX_AUTOMATIONS = 20;

async function getWorkspaceId(staff: Parameters<typeof resolveStaffWorkspace>[0]) {
  const { workspace } = await resolveStaffWorkspace(staff);
  if (!workspace) throw new Error("Sem permissão");
  return workspace.id;
}

export async function GET() {
  try {
    const staff = await requireStaff();
    const workspaceId = await getWorkspaceId(staff);

    const [automations, courses] = await Promise.all([
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
              lessons: { orderBy: { order: "asc" }, select: { id: true, title: true } },
            },
          },
        },
      }),
    ]);

    return NextResponse.json({ automations, courses });
  } catch (error) {
    console.error("GET automations error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
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
    if (!VALID_TRIGGERS.includes(triggerType)) {
      return NextResponse.json({ error: "Tipo de trigger inválido" }, { status: 400 });
    }
    if (!VALID_ACTIONS.includes(actionType)) {
      return NextResponse.json({ error: "Tipo de ação inválido" }, { status: 400 });
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

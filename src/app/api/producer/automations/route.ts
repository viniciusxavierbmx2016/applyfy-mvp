import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, requirePermission } from "@/lib/auth";
import { resolveStaffWorkspace } from "@/lib/workspace";
import { createAutomationSchema, validateBody } from "@/lib/validations";
import { validateAutomation, validateAutomationResources } from "@/lib/automation-validate";

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
    await requirePermission(staff, "MANAGE_AUTOMATIONS");

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

export async function POST(request: Request) {
  try {
    const staff = await requireStaff();
    const workspaceId = await getWorkspaceId(staff);
    await requirePermission(staff, "MANAGE_AUTOMATIONS");

    const count = await prisma.automation.count({ where: { workspaceId } });
    if (count >= MAX_AUTOMATIONS) {
      return NextResponse.json(
        { error: `Limite de ${MAX_AUTOMATIONS} automações atingido` },
        { status: 400 }
      );
    }

    const raw = await request.json().catch(() => ({}));
    const v = validateBody(createAutomationSchema, raw);
    if (!v.success) return v.error;
    const { name, triggerType, triggerConfig, actionType, actionConfig, courseId } = v.data;

    const validationError = validateAutomation(
      triggerType, actionType,
      triggerConfig || {}, actionConfig || {},
      courseId || null
    );
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const resourceError = await validateAutomationResources(workspaceId, {
      courseId: courseId || null,
      actionType,
      actionConfig: actionConfig || {},
      triggerType,
      triggerConfig: triggerConfig || {},
    });
    if (resourceError) {
      return NextResponse.json({ error: resourceError }, { status: 400 });
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

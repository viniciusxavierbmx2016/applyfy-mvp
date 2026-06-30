import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, requirePermission } from "@/lib/auth";
import { resolveStaffWorkspace } from "@/lib/workspace";
import { updateAutomationSchema, validateBody } from "@/lib/validations";
import { validateAutomation, validateAutomationResources } from "@/lib/automation-validate";

async function getWorkspaceId(staff: Parameters<typeof resolveStaffWorkspace>[0]) {
  const { workspace } = await resolveStaffWorkspace(staff);
  if (!workspace) throw new Error("Sem permissão");
  return workspace.id;
}

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const staff = await requireStaff();
    const workspaceId = await getWorkspaceId(staff);
    await requirePermission(staff, "MANAGE_AUTOMATIONS");

    const automation = await prisma.automation.findFirst({
      where: { id: params.id, workspaceId },
    });

    if (!automation) {
      return NextResponse.json({ error: "Não encontrada" }, { status: 404 });
    }

    const logs = await prisma.automationLog.findMany({
      where: { automationId: params.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ automation, logs });
  } catch (error) {
    console.error("GET automation error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const staff = await requireStaff();
    const workspaceId = await getWorkspaceId(staff);
    await requirePermission(staff, "MANAGE_AUTOMATIONS");

    const existing = await prisma.automation.findFirst({
      where: { id: params.id, workspaceId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Não encontrada" }, { status: 404 });
    }

    const raw = await request.json().catch(() => ({}));
    const v = validateBody(updateAutomationSchema, raw);
    if (!v.success) return v.error;
    const body = v.data;

    // Validate the EFFECTIVE automation (patch ?? existing). The PUT used to
    // skip validateAutomation entirely and never checked resource ownership —
    // so it could store an incompatible trigger/action pair OR a foreign
    // course/module/tag (cross-tenant, família do FURO#5).
    const parseConfig = (s: string): Record<string, unknown> => {
      try { return JSON.parse(s) as Record<string, unknown>; } catch { return {}; }
    };
    const effTriggerType = body.triggerType ?? existing.triggerType;
    const effActionType = body.actionType ?? existing.actionType;
    const effTriggerConfig = body.triggerConfig ?? parseConfig(existing.triggerConfig);
    const effActionConfig = body.actionConfig ?? parseConfig(existing.actionConfig);
    const effCourseId: string | null =
      body.courseId !== undefined ? ((body.courseId as string | null) || null) : existing.courseId;

    const validationError = validateAutomation(
      effTriggerType, effActionType, effTriggerConfig, effActionConfig, effCourseId
    );
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const resourceError = await validateAutomationResources(workspaceId, {
      courseId: effCourseId,
      actionType: effActionType,
      actionConfig: effActionConfig,
      triggerType: effTriggerType,
      triggerConfig: effTriggerConfig,
    });
    if (resourceError) {
      return NextResponse.json({ error: resourceError }, { status: 400 });
    }

    const automation = await prisma.automation.update({
      where: { id: params.id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(typeof body.active === "boolean" && { active: body.active }),
        ...(body.triggerType !== undefined && { triggerType: body.triggerType }),
        ...(body.triggerConfig !== undefined && {
          triggerConfig: JSON.stringify(body.triggerConfig),
        }),
        ...(body.actionType !== undefined && { actionType: body.actionType }),
        ...(body.actionConfig !== undefined && {
          actionConfig: JSON.stringify(body.actionConfig),
        }),
        ...(body.courseId !== undefined && { courseId: body.courseId || null }),
      },
    });

    return NextResponse.json({ automation });
  } catch (error) {
    console.error("PUT automation error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

export async function DELETE(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const staff = await requireStaff();
    const workspaceId = await getWorkspaceId(staff);
    await requirePermission(staff, "MANAGE_AUTOMATIONS");

    const existing = await prisma.automation.findFirst({
      where: { id: params.id, workspaceId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Não encontrada" }, { status: 404 });
    }

    await prisma.automation.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE automation error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

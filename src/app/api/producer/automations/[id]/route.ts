import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { resolveStaffWorkspace } from "@/lib/workspace";

async function getWorkspaceId(staff: Parameters<typeof resolveStaffWorkspace>[0]) {
  const { workspace } = await resolveStaffWorkspace(staff);
  if (!workspace) throw new Error("Sem permissão");
  return workspace.id;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const staff = await requireStaff();
    const workspaceId = await getWorkspaceId(staff);

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

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const staff = await requireStaff();
    const workspaceId = await getWorkspaceId(staff);

    const existing = await prisma.automation.findFirst({
      where: { id: params.id, workspaceId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Não encontrada" }, { status: 404 });
    }

    const body = await request.json();

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

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const staff = await requireStaff();
    const workspaceId = await getWorkspaceId(staff);

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

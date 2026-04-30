import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { resolveStaffWorkspace } from "@/lib/workspace";
import { executeAction } from "@/lib/automation-engine";

export async function POST(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const staff = await requireStaff();
    const { workspace } = await resolveStaffWorkspace(staff);
    if (!workspace) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const automation = await prisma.automation.findFirst({
      where: { id: params.id, workspaceId: workspace.id },
    });

    if (!automation) {
      return NextResponse.json({ error: "Automação não encontrada" }, { status: 404 });
    }

    if (automation.triggerType !== "HAS_TAG") {
      return NextResponse.json({ error: "Apenas automações HAS_TAG podem ser executadas manualmente" }, { status: 400 });
    }

    const config = JSON.parse(automation.triggerConfig) as Record<string, unknown>;
    const tagId = config.tagId as string;
    if (!tagId) {
      return NextResponse.json({ error: "Tag não configurada" }, { status: 400 });
    }

    const students = await prisma.user.findMany({
      where: {
        userTags: { some: { tagId } },
        enrollments: { some: { course: { workspaceId: workspace.id }, status: "ACTIVE" } },
      },
      select: { id: true },
    });

    let executed = 0;
    let skipped = 0;

    for (const student of students) {
      const alreadyExecuted = await prisma.automationLog.findFirst({
        where: { automationId: automation.id, userId: student.id },
      });
      if (alreadyExecuted) {
        skipped++;
        continue;
      }

      try {
        const result = await executeAction(automation, student.id, automation.courseId || undefined);

        await prisma.automationLog.create({
          data: {
            automationId: automation.id,
            userId: student.id,
            status: result.status,
            details: result.details,
          },
        });

        if (result.status === "SUCCESS") {
          executed++;
          await prisma.automation.update({
            where: { id: automation.id },
            data: { executionCount: { increment: 1 }, lastExecutedAt: new Date() },
          });
        } else {
          skipped++;
        }
      } catch (err) {
        await prisma.automationLog.create({
          data: {
            automationId: automation.id,
            userId: student.id,
            status: "FAILED",
            details: err instanceof Error ? err.message : "Erro interno",
          },
        }).catch(() => {});
        skipped++;
      }
    }

    return NextResponse.json({ executed, skipped, total: students.length });
  } catch (error) {
    console.error("POST execute automation error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

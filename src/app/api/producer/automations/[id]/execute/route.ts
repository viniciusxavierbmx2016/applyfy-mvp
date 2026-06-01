import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { resolveStaffWorkspace } from "@/lib/workspace";
import { executeAction } from "@/lib/automation-engine";

// Sequential per-student executeAction (each awaits its push); needs more room.
export const maxDuration = 60;

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "true";
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

    let config: Record<string, unknown>;
    try {
      config = JSON.parse(automation.triggerConfig) as Record<string, unknown>;
    } catch {
      // triggerConfig is producer-managed, written through the UI. A
      // corrupt blob here is a real data problem the producer must see
      // (so they can re-save the automation), not a generic 500.
      return NextResponse.json(
        { error: "Configuração da automação inválida" },
        { status: 400 }
      );
    }
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

    // ── Dedup batch (was N findFirst inside the loop). The original
    // code only used the `alreadyExecuted` row as a boolean ("any prior
    // log row, regardless of status"), so a Set<userId> is semantically
    // identical. `distinct` keeps the payload small when a user has
    // multiple prior logs.
    const prevLogs = students.length
      ? await prisma.automationLog.findMany({
          where: {
            automationId: automation.id,
            userId: { in: students.map((s) => s.id) },
          },
          select: { userId: true },
          distinct: ["userId"],
        })
      : [];
    const executedSet = new Set(prevLogs.map((l) => l.userId));

    let executed = 0;
    let skipped = 0;
    let reExecuted = 0;

    for (const student of students) {
      const alreadyExecuted = executedSet.has(student.id);
      if (alreadyExecuted && !force) {
        skipped++;
        continue;
      }
      if (alreadyExecuted && force) {
        reExecuted++;
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

    // ── Single counter update at the end (was N updates, one per
    // SUCCESS). `lastExecutedAt` becomes the batch-end timestamp
    // instead of the last-success instant — diff is bounded by the
    // sequential loop's runtime (≤ maxDuration = 60s).
    if (executed > 0) {
      await prisma.automation.update({
        where: { id: automation.id },
        data: {
          executionCount: { increment: executed },
          lastExecutedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ executed, skipped, reExecuted, total: students.length, forced: force });
  } catch (error) {
    console.error("POST execute automation error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

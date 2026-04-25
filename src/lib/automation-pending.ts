import { prisma } from "@/lib/prisma";
import { executeAction } from "@/lib/automation-engine";
import { autoTagStudent } from "@/lib/automation-constants";

export async function processPendingExecutions(): Promise<{ processed: number; executed: number }> {
  const pending = await prisma.pendingExecution.findMany({
    where: {
      status: "PENDING",
      executeAt: { lte: new Date() },
    },
    include: { automation: true },
    take: 50,
    orderBy: { executeAt: "asc" },
  });

  let executed = 0;

  for (const item of pending) {
    try {
      if (!item.automation.active) {
        await prisma.pendingExecution.update({
          where: { id: item.id },
          data: { status: "CANCELLED", completedAt: new Date(), error: "Automação desativada" },
        });
        continue;
      }

      const existingSuccess = await prisma.automationLog.findFirst({
        where: { automationId: item.automationId, userId: item.userId, status: "SUCCESS" },
      });
      if (existingSuccess) {
        await prisma.pendingExecution.update({
          where: { id: item.id },
          data: { status: "CANCELLED", completedAt: new Date(), error: "Já executado anteriormente" },
        });
        continue;
      }

      const triggerData = JSON.parse(item.triggerData || "{}") as Record<string, unknown>;
      const courseId = (triggerData.courseId as string) || item.automation.courseId || undefined;

      const result = await executeAction(item.automation, item.userId, courseId);

      await prisma.pendingExecution.update({
        where: { id: item.id },
        data: { status: result.status === "SUCCESS" ? "COMPLETED" : "FAILED", completedAt: new Date(), error: result.status !== "SUCCESS" ? result.details : undefined },
      });

      await prisma.automationLog.create({
        data: {
          automationId: item.automationId,
          userId: item.userId,
          status: result.status,
          details: result.details,
        },
      });

      if (result.status === "SUCCESS") {
        executed++;
        await prisma.automation.update({
          where: { id: item.automationId },
          data: { executionCount: { increment: 1 }, lastExecutedAt: new Date() },
        });
        const ws = item.automation.workspaceId;
        if (ws) {
          autoTagStudent(ws, item.userId, item.automation.triggerType, item.automation.name).catch(() => {});
        }
      }
    } catch (err) {
      await prisma.pendingExecution.update({
        where: { id: item.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          error: err instanceof Error ? err.message : "Erro desconhecido",
        },
      }).catch(() => {});
    }
  }

  await prisma.pendingExecution.deleteMany({
    where: {
      status: { in: ["COMPLETED", "CANCELLED", "FAILED"] },
      createdAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
  }).catch(() => {});

  return { processed: pending.length, executed };
}

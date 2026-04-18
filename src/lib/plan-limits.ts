import { prisma } from "./prisma";

export class PlanLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlanLimitError";
  }
}

export async function checkPlanLimits(
  userId: string,
  type: "workspace" | "course",
  workspaceId?: string
): Promise<{ ok: true; used: number; limit: number }> {
  const sub = await prisma.subscription.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { plan: true },
  });

  if (!sub || sub.status === "CANCELLED" || sub.status === "SUSPENDED" || sub.status === "PENDING") {
    throw new PlanLimitError("Assine um plano para continuar");
  }

  if (sub.exempt) {
    return { ok: true, used: 0, limit: Infinity };
  }

  if (sub.status !== "ACTIVE" && sub.status !== "PAST_DUE") {
    throw new PlanLimitError("Assine um plano para continuar");
  }

  const plan = sub.plan;

  if (type === "workspace") {
    const used = await prisma.workspace.count({ where: { ownerId: userId } });
    if (used >= plan.maxWorkspaces) {
      throw new PlanLimitError(
        `Limite de ${plan.maxWorkspaces} workspaces atingido. Faça upgrade do seu plano.`
      );
    }
    return { ok: true, used, limit: plan.maxWorkspaces };
  }

  if (type === "course") {
    if (!workspaceId) {
      throw new PlanLimitError("Workspace não informado");
    }
    const used = await prisma.course.count({ where: { workspaceId } });
    if (used >= plan.maxCoursesPerWorkspace) {
      throw new PlanLimitError(
        `Limite de ${plan.maxCoursesPerWorkspace} cursos por workspace atingido. Faça upgrade do seu plano.`
      );
    }
    return { ok: true, used, limit: plan.maxCoursesPerWorkspace };
  }

  return { ok: true, used: 0, limit: Infinity };
}

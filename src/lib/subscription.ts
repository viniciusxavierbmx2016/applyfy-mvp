import { prisma } from "./prisma";
import type { Plan } from "@prisma/client";

export interface SubscriptionCheck {
  status: "NONE" | "ACTIVE" | "EXEMPT" | "PAST_DUE" | "SUSPENDED" | "CANCELLED" | "PENDING";
  blocked: boolean;
  restricted?: boolean;
  daysLeft?: number;
  periodEnd?: Date | null;
  plan?: Plan;
}

export async function getProducerSubscriptionStatus(
  userId: string
): Promise<SubscriptionCheck> {
  const sub = await prisma.subscription.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { plan: true },
  });

  if (!sub) {
    return { status: "NONE", blocked: true };
  }

  if (sub.exempt) {
    return { status: "EXEMPT", blocked: false, plan: sub.plan };
  }

  switch (sub.status) {
    case "ACTIVE":
      return {
        status: "ACTIVE",
        blocked: false,
        periodEnd: sub.currentPeriodEnd,
        plan: sub.plan,
      };

    case "PAST_DUE": {
      if (sub.currentPeriodEnd) {
        const daysSince = Math.floor(
          (Date.now() - sub.currentPeriodEnd.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSince <= 3) {
          return {
            status: "PAST_DUE",
            blocked: false,
            restricted: true,
            daysLeft: 3 - daysSince,
            periodEnd: sub.currentPeriodEnd,
            plan: sub.plan,
          };
        }
      }
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: "SUSPENDED", suspendedAt: new Date() },
      });
      return { status: "SUSPENDED", blocked: true, plan: sub.plan };
    }

    case "SUSPENDED":
      return { status: "SUSPENDED", blocked: true, plan: sub.plan };

    case "CANCELLED":
      return { status: "CANCELLED", blocked: true, plan: sub.plan };

    case "PENDING":
      return { status: "PENDING", blocked: true, plan: sub.plan };

    default:
      return { status: "NONE", blocked: true };
  }
}

export async function isWorkspaceSuspended(workspaceId: string): Promise<boolean> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { ownerId: true },
  });
  if (!workspace) return false;

  const sub = await prisma.subscription.findFirst({
    where: { userId: workspace.ownerId },
    orderBy: { createdAt: "desc" },
  });

  if (!sub) return false;
  if (sub.exempt) return false;

  return sub.status === "SUSPENDED" || sub.status === "CANCELLED";
}

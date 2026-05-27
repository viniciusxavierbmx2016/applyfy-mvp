import { prisma } from "@/lib/prisma";

/**
 * Per-workspace points helpers.
 *
 * `User.points` / `User.level` stay GLOBAL for the user's profile view.
 * Anything scoped to a workspace (producer students, analytics, exports,
 * POINTS_REACHED automation gating) reads from PointsLedger via these
 * helpers — never from `User.points`.
 *
 * Users with no ledger entries (pre-rollout, or zero earnings in this
 * workspace) return 0. Callers derive level via getLevelForPoints(points).
 */

/** Sum PointsLedger per (user, workspace) for a batch of users. */
export async function getWorkspacePointsByUser(
  userIds: string[],
  workspaceId: string
): Promise<Map<string, number>> {
  if (!userIds.length) return new Map();
  const rows = await prisma.pointsLedger.groupBy({
    by: ["userId"],
    where: { workspaceId, userId: { in: userIds } },
    _sum: { delta: true },
  });
  return new Map(rows.map((r) => [r.userId, r._sum.delta ?? 0]));
}

/** Sum PointsLedger for a single (user, workspace). */
export async function getWorkspacePoints(
  userId: string,
  workspaceId: string
): Promise<number> {
  const result = await prisma.pointsLedger.aggregate({
    where: { userId, workspaceId },
    _sum: { delta: true },
  });
  return result._sum.delta ?? 0;
}

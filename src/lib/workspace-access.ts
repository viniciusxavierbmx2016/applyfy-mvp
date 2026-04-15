import { prisma } from "@/lib/prisma";

/**
 * Returns true if the given user has access to the given workspace.
 * A student has access when they have at least one Enrollment in a course
 * of the workspace, OR an accepted Collaborator record, OR they own the
 * workspace (PRODUCER). Does not handle the ADMIN global bypass — callers
 * should skip this check for ADMIN role.
 */
export async function hasWorkspaceAccess(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const [enrollment, collab, ws] = await Promise.all([
    prisma.enrollment.findFirst({
      where: { userId, course: { workspaceId } },
      select: { id: true },
    }),
    prisma.collaborator.findFirst({
      where: { userId, workspaceId, status: "ACCEPTED" },
      select: { id: true },
    }),
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true },
    }),
  ]);
  if (enrollment || collab) return true;
  if (ws?.ownerId === userId) return true;
  return false;
}

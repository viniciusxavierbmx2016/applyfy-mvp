import { cookies, headers } from "next/headers";
import { prisma } from "./prisma";
import type { User, Workspace } from "@prisma/client";

export const ACTIVE_WORKSPACE_COOKIE = "active_workspace_id";
export const ACTIVE_WORKSPACE_HEADER = "x-workspace-id";

export async function getWorkspaceBySlug(
  slug: string
): Promise<Workspace | null> {
  if (!slug) return null;
  return prisma.workspace.findUnique({ where: { slug } });
}

export async function getWorkspacesByOwner(
  userId: string
): Promise<Workspace[]> {
  return prisma.workspace.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Reads the active workspace id from the `x-workspace-id` request header,
 * falling back to the `active_workspace_id` cookie.
 */
export async function readActiveWorkspaceId(): Promise<string | null> {
  try {
    const h = await headers();
    const fromHeader = h.get(ACTIVE_WORKSPACE_HEADER);
    if (fromHeader) return fromHeader;
  } catch {
    /* not in request scope */
  }
  try {
    const c = await cookies();
    const v = c.get(ACTIVE_WORKSPACE_COOKIE)?.value;
    return v || null;
  } catch {
    return null;
  }
}

/**
 * Returns the PRODUCER's active workspace. Resolution order:
 * 1. Explicit workspaceId arg (validated as owned)
 * 2. Header/cookie value (validated as owned)
 * 3. First workspace owned by the user (by creation date)
 *
 * Returns null if the user has no workspaces.
 */
export async function getCurrentWorkspace(
  userId: string,
  workspaceId?: string | null
): Promise<Workspace | null> {
  if (workspaceId) {
    const ws = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (ws && ws.ownerId === userId) return ws;
  }

  const hinted = await readActiveWorkspaceId();
  if (hinted) {
    const ws = await prisma.workspace.findUnique({ where: { id: hinted } });
    if (ws && ws.ownerId === userId) return ws;
  }

  const first = await prisma.workspace.findFirst({
    where: { ownerId: userId },
    orderBy: { createdAt: "asc" },
  });
  return first;
}

/**
 * Ensures the staff user is allowed to operate on the given workspace.
 * ADMIN: any workspace. PRODUCER: only their own.
 */
export async function canAccessWorkspace(
  staff: Pick<User, "id" | "role">,
  workspaceId: string
): Promise<boolean> {
  if (staff.role === "ADMIN") return true;
  if (staff.role === "COLLABORATOR") {
    const c = await prisma.collaborator.findFirst({
      where: { userId: staff.id, status: "ACCEPTED" },
      select: { workspaceId: true },
    });
    return !!c && c.workspaceId === workspaceId;
  }
  if (staff.role !== "PRODUCER") return false;
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { ownerId: true },
  });
  return !!ws && ws.ownerId === staff.id;
}

/**
 * Resolve the effective workspace scope for a staff request.
 * - ADMIN: if a workspace is hinted (header/cookie) and exists, scope to it;
 *   otherwise global (returns null to mean "no filter").
 * - PRODUCER: always scoped to their active workspace; throws if they have none.
 */
export async function resolveStaffWorkspace(
  staff: Pick<User, "id" | "role">
): Promise<{ workspace: Workspace | null; scoped: boolean }> {
  if (staff.role === "ADMIN") {
    const hinted = await readActiveWorkspaceId();
    if (hinted) {
      const ws = await prisma.workspace.findUnique({ where: { id: hinted } });
      if (ws) return { workspace: ws, scoped: true };
    }
    return { workspace: null, scoped: false };
  }
  if (staff.role === "COLLABORATOR") {
    const c = await prisma.collaborator.findFirst({
      where: { userId: staff.id, status: "ACCEPTED" },
      select: { workspaceId: true },
    });
    if (!c) return { workspace: null, scoped: true };
    const ws = await prisma.workspace.findUnique({
      where: { id: c.workspaceId },
    });
    return { workspace: ws, scoped: true };
  }
  const ws = await getCurrentWorkspace(staff.id);
  return { workspace: ws, scoped: true };
}

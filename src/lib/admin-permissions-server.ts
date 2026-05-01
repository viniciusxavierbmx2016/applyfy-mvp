import { cache } from "react";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  ALL_ADMIN_PERMS,
  type AdminPerm,
} from "@/lib/admin-permissions";

// Resolves the effective permissions for a user.
// - ADMIN → all permissions.
// - ADMIN_COLLABORATOR with status=ACCEPTED → permissions from
//   AdminCollaborator (FULL_ACCESS expands to all). Non-accepted → empty.
// - Any other role → empty set.
// React `cache()` deduplicates within a single request.
export const getAdminPermissions = cache(
  async (userId: string, role: string): Promise<Set<AdminPerm>> => {
    if (role === "ADMIN") return new Set(ALL_ADMIN_PERMS);
    if (role !== "ADMIN_COLLABORATOR") return new Set();

    const collab = await prisma.adminCollaborator.findUnique({
      where: { userId },
      select: { status: true, permissions: true },
    });
    if (!collab || collab.status !== "ACCEPTED") return new Set();

    if (collab.permissions.includes("FULL_ACCESS")) {
      return new Set(ALL_ADMIN_PERMS);
    }
    const out = new Set<AdminPerm>();
    for (const p of collab.permissions) {
      if ((ALL_ADMIN_PERMS as string[]).includes(p)) out.add(p as AdminPerm);
    }
    return out;
  }
);

export async function adminHasPerm(
  user: Pick<User, "id" | "role">,
  perm: AdminPerm
): Promise<boolean> {
  const perms = await getAdminPermissions(user.id, user.role);
  return perms.has(perm);
}

// Throws if user is not admin/admin-collaborator OR lacks the permission.
// Mirrors the throw-style of requireAdmin/requireStaff in auth.ts.
export async function requireAdminPerm(perm: AdminPerm): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Não autorizado");
  if (user.role !== "ADMIN" && user.role !== "ADMIN_COLLABORATOR") {
    throw new Error("Sem permissão");
  }
  if (!(await adminHasPerm(user, perm))) {
    throw new Error("Sem permissão");
  }
  return user;
}

// Allow any ADMIN or any ACCEPTED ADMIN_COLLABORATOR (regardless of which
// specific permissions they have). Use this for routes that don't map cleanly
// to a single permission but should be visible to anyone in the admin team
// (e.g., /api/admin/dashboard).
export async function requireAdminOrCollab(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Não autorizado");
  if (user.role === "ADMIN") return user;
  if (user.role !== "ADMIN_COLLABORATOR") throw new Error("Sem permissão");
  // Empty Set means PENDING/REVOKED collaborator — block.
  const perms = await getAdminPermissions(user.id, user.role);
  if (perms.size === 0) throw new Error("Sem permissão");
  return user;
}

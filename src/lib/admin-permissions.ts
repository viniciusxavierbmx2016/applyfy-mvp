import { cache } from "react";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// Granular permissions for ADMIN_COLLABORATOR. Plain ADMIN gets everything
// implicitly. FULL_ACCESS is a shorthand the inviter can grant to give all
// other permissions at once — at runtime it expands to the full set.
export const ADMIN_PERMS = {
  SUPPORT: "SUPPORT",
  MANAGE_PRODUCERS: "MANAGE_PRODUCERS",
  MANAGE_PLANS: "MANAGE_PLANS",
  MANAGE_BILLING: "MANAGE_BILLING",
  VIEW_REPORTS: "VIEW_REPORTS",
  VIEW_AUDIT: "VIEW_AUDIT",
  FULL_ACCESS: "FULL_ACCESS",
} as const;

export type AdminPerm = (typeof ADMIN_PERMS)[keyof typeof ADMIN_PERMS];

export const ALL_ADMIN_PERMS: AdminPerm[] = Object.values(ADMIN_PERMS);

// Permissions actually grantable in the UI (FULL_ACCESS is granted via the
// "all permissions" toggle, not a checkbox among the rest).
export const GRANTABLE_ADMIN_PERMS: AdminPerm[] = [
  "SUPPORT",
  "MANAGE_PRODUCERS",
  "MANAGE_PLANS",
  "MANAGE_BILLING",
  "VIEW_REPORTS",
  "VIEW_AUDIT",
];

export const ADMIN_PERM_LABELS: Record<AdminPerm, string> = {
  SUPPORT: "Suporte",
  MANAGE_PRODUCERS: "Gerenciar produtores",
  MANAGE_PLANS: "Gerenciar planos",
  MANAGE_BILLING: "Gerenciar assinaturas",
  VIEW_REPORTS: "Ver relatórios",
  VIEW_AUDIT: "Ver logs de auditoria",
  FULL_ACCESS: "Acesso total",
};

// Resolves the effective permissions for a user.
// - ADMIN → all permissions.
// - ADMIN_COLLABORATOR with status=ACCEPTED → permissions from AdminCollaborator
//   (FULL_ACCESS expands to all). Non-accepted statuses → empty set.
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

// Maps each admin route to the perm it requires. Used by the sidebar to
// filter visible links and (optionally) by middleware/page guards. Routes not
// listed here are open to any admin (e.g., the Dashboard at /admin).
export const ADMIN_ROUTE_PERMS: Record<string, AdminPerm> = {
  "/admin/producers": "MANAGE_PRODUCERS",
  "/admin/reports": "VIEW_REPORTS",
  "/admin/audit": "VIEW_AUDIT",
  "/admin/plans": "MANAGE_PLANS",
  "/admin/subscriptions": "MANAGE_BILLING",
  "/admin/integrations": "FULL_ACCESS",
  "/admin/settings": "FULL_ACCESS",
};

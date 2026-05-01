// Pure constants/types, safe for both client and server bundles.
// Server-only runtime helpers (getAdminPermissions, requireAdminPerm) live in
// admin-permissions-server.ts to avoid pulling next/headers into client builds.

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

export const ADMIN_ROUTE_PERMS: Record<string, AdminPerm> = {
  "/admin/producers": "MANAGE_PRODUCERS",
  "/admin/reports": "VIEW_REPORTS",
  "/admin/audit": "VIEW_AUDIT",
  "/admin/plans": "MANAGE_PLANS",
  "/admin/subscriptions": "MANAGE_BILLING",
  "/admin/integrations": "FULL_ACCESS",
  "/admin/settings": "FULL_ACCESS",
};

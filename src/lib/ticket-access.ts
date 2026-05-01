import type { User, SupportTicket } from "@prisma/client";
import { adminHasPerm } from "@/lib/admin-permissions-server";

// True if `user` may read/post on `ticket`. Producer-owner OR ADMIN OR
// ADMIN_COLLABORATOR with SUPPORT permission.
export async function canAccessTicket(
  user: Pick<User, "id" | "role">,
  ticket: Pick<SupportTicket, "producerId">
): Promise<boolean> {
  if (user.id === ticket.producerId) return true;
  if (user.role === "ADMIN") return true;
  if (user.role === "ADMIN_COLLABORATOR") {
    return await adminHasPerm(user, "SUPPORT");
  }
  return false;
}

// True if `user` may change a ticket's status/assignment. Admin team only;
// the producer cannot self-resolve or self-assign.
export async function canManageTicket(
  user: Pick<User, "id" | "role">
): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  if (user.role === "ADMIN_COLLABORATOR") {
    return await adminHasPerm(user, "SUPPORT");
  }
  return false;
}

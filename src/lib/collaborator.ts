import { prisma } from "./prisma";
import type { User } from "@prisma/client";

export const COLLABORATOR_PERMISSIONS = [
  "REPLY_COMMENTS",
  "MANAGE_COMMUNITY",
  "MANAGE_STUDENTS",
  "VIEW_ANALYTICS",
  "MANAGE_LESSONS",
] as const;

export type CollaboratorPermission = (typeof COLLABORATOR_PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<CollaboratorPermission, string> = {
  REPLY_COMMENTS: "Responder comentários nas aulas",
  MANAGE_COMMUNITY: "Moderar comunidade",
  MANAGE_STUDENTS: "Gerenciar alunos (matricular/remover)",
  VIEW_ANALYTICS: "Ver analytics",
  MANAGE_LESSONS: "Gerenciar módulos e aulas",
};

export interface CollaboratorContext {
  id: string;
  userId: string;
  workspaceId: string;
  permissions: CollaboratorPermission[];
  courseIds: string[]; // empty array = all courses in workspace
}

export async function getCollaboratorContext(
  user: Pick<User, "id" | "role">
): Promise<CollaboratorContext | null> {
  if (user.role !== "COLLABORATOR") return null;
  const record = await prisma.collaborator.findFirst({
    where: { userId: user.id, status: "ACCEPTED" },
  });
  if (!record) return null;
  return {
    id: record.id,
    userId: user.id,
    workspaceId: record.workspaceId,
    permissions: record.permissions as CollaboratorPermission[],
    courseIds: record.courseIds,
  };
}

export function hasPermission(
  ctx: CollaboratorContext,
  perm: CollaboratorPermission
): boolean {
  return ctx.permissions.includes(perm);
}

export function canAccessCourse(
  ctx: CollaboratorContext,
  courseId: string
): boolean {
  if (ctx.courseIds.length === 0) return true;
  return ctx.courseIds.includes(courseId);
}

// One-shot check: user is an accepted collaborator on the given course and
// has at least one of the listed permissions. Cheap enough to call per-request
// since it's two indexed lookups.
export async function collaboratorCanActOnCourse(
  userId: string,
  courseId: string,
  anyOf: CollaboratorPermission[]
): Promise<boolean> {
  const rec = await prisma.collaborator.findFirst({
    where: { userId, status: "ACCEPTED" },
    select: { workspaceId: true, permissions: true, courseIds: true },
  });
  if (!rec) return false;
  const hasPerm = anyOf.some((p) => rec.permissions.includes(p));
  if (!hasPerm) return false;
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { workspaceId: true },
  });
  if (!course || course.workspaceId !== rec.workspaceId) return false;
  if (rec.courseIds.length === 0) return true;
  return rec.courseIds.includes(courseId);
}

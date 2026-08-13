import { prisma } from "./prisma";

export const COLLABORATOR_PERMISSIONS = [
  "REPLY_COMMENTS",
  "MANAGE_COMMUNITY",
  "MANAGE_STUDENTS",
  "VIEW_DASHBOARD",
  "VIEW_ANALYTICS",
  "MANAGE_LESSONS",
  "MANAGE_AUTOMATIONS",
  "MANAGE_LIVES",
] as const;


export type CollaboratorPermission = (typeof COLLABORATOR_PERMISSIONS)[number];

// Os KPIs da tela inicial são um RECORTE dos Relatórios, então quem tem
// VIEW_ANALYTICS enxerga o dashboard sem precisar da permissão nova — é o que
// evita que os 6 colaboradores que já viam os números os percam no deploy
// (§21 do 9.62). A granularidade nova serve para LIBERAR só o dashboard a quem
// não deve ver Relatórios inteiros. Ordem importa: gate = qualquer uma das duas.
export const DASHBOARD_PERMISSIONS = [
  "VIEW_DASHBOARD",
  "VIEW_ANALYTICS",
] as const satisfies readonly CollaboratorPermission[];


export const PERMISSION_LABELS: Record<CollaboratorPermission, string> = {
  REPLY_COMMENTS: "Responder comentários nas aulas",
  MANAGE_COMMUNITY: "Moderar comunidade",
  MANAGE_STUDENTS: "Gerenciar alunos (matricular/remover)",
  VIEW_DASHBOARD: "Ver dashboard (KPIs de receita, vendas e alunos na tela inicial)",
  VIEW_ANALYTICS: "Ver analytics",
  MANAGE_LESSONS: "Gerenciar módulos e aulas",
  MANAGE_AUTOMATIONS: "Gerenciar automações (criar/editar/executar)",
  MANAGE_LIVES: "Gerenciar lives (criar/editar/transmitir/moderar)",
};

export interface CollaboratorContext {
  id: string;
  userId: string;
  workspaceId: string;
  permissions: CollaboratorPermission[];
  courseIds: string[]; // empty array = all courses in workspace
}

// REMOVIDO: `getCollaboratorContext(user)` vivia aqui e filtrava
// `role !== "COLLABORATOR"` — cego ao aluno-colaborador (role STUDENT desde o
// C5), devolvendo null justamente para quem precisava ser avaliado. Tinha o
// MESMO NOME do helper correto em `@/lib/auth` (por userId, sem role, cache()),
// que já era o usado por todos os outros call-sites; o autocompletar puxava o
// errado. Ficou com zero consumidores e foi apagado para não haver de novo
// duas funções homônimas com resultados diferentes.

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

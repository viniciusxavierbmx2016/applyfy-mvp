import { prisma } from "@/lib/prisma";
import { MEMBER_AREA_PERMISSION } from "@/lib/collaborator";

/**
 * Returns true if the given user has access to the given workspace.
 * A student has access when they have at least one Enrollment in a course
 * of the workspace, OR an accepted Collaborator record, OR they own the
 * workspace (PRODUCER). Does not handle the ADMIN global bypass — callers
 * should skip this check for ADMIN role.
 *
 * `requireMemberPermission` (opt-in, default false) exige `ACCESS_MEMBER_AREA`
 * do ramo COLABORADOR — e só dele. Serve às PORTAS da área de membros (login do
 * workspace, vitrine, curso), onde o produtor passou a poder revogar a entrada.
 *
 * ⚠️ Opt-in por call-site, e NÃO embutido no helper, porque `hasWorkspaceAccess`
 * também é chamado pelo PAINEL — e lá a pergunta é outra:
 *   · `producer/students/[id]/tags` pergunta pelo ALUNO (passa params.id, não o
 *     id de quem está logado): exigir permissão de colaborador ali seria
 *     perguntar a coisa errada sobre a pessoa errada;
 *   · `producer/lives/[id]/moderators` valida um CANDIDATO a moderador.
 * Ligar a exigência dentro do helper quebraria os dois em silêncio.
 *
 * Matrícula e posse NÃO são afetadas: aluno e dono entram como sempre.
 */
export async function hasWorkspaceAccess(
  userId: string,
  workspaceId: string,
  opts?: { requireMemberPermission?: boolean }
): Promise<boolean> {
  const [enrollment, collab, ws] = await Promise.all([
    prisma.enrollment.findFirst({
      where: {
        userId,
        course: { workspaceId },
        status: { in: ["ACTIVE", "EXPIRED"] },
      },
      select: { id: true },
    }),
    prisma.collaborator.findFirst({
      where: { userId, workspaceId, status: "ACCEPTED" },
      select: { id: true, permissions: true },
    }),
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true },
    }),
  ]);
  if (enrollment) return true;
  if (collab) {
    if (!opts?.requireMemberPermission) return true;
    if (collab.permissions.includes(MEMBER_AREA_PERMISSION)) return true;
    // Sem a permissão o vínculo não abre a porta — mas o dono e a matrícula
    // seguem abrindo, então quem também é aluno entra pelo caminho de aluno.
  }
  if (ws?.ownerId === userId) return true;
  return false;
}

import { prisma } from "@/lib/prisma";

/* "Esta pessoa entra no PAINEL?" — a pergunta de CONTA, não de curso.

   ⚠️ Não confundir com `isCourseStaffOwner` (lib/auth.ts), que responde "manda
   NESTE curso". Aqui a pergunta é sobre a pessoa e o produto inteiro: quem
   opera o painel do produtor, seja como dono ou como convidado.

   Nasceu da forma comum entre o gate de upload (9.88) e o de 2FA (9.109) — a
   mesma decisão, dois call-sites. Uma terceira cópia seria a família
   9.42/9.54/9.57 pela quinta vez.

   ⚠️ O colaborador mantém `role = "STUDENT"` desde o C5 — por isso **nenhum**
   predicado aqui pode ser por role global. O que decide é o VÍNCULO. */

export interface StaffPanelOpts {
  /** Exige que a colaboração ACCEPTED tenha esta permissão. Sem ela, qualquer
   *  colaboração aceita basta — é o caso de "protege a própria conta". */
  requirePermission?: string;
}

export async function hasStaffPanelAccess(
  user: { id: string; role: string },
  opts: StaffPanelOpts = {}
): Promise<boolean> {
  // Short-circuit ADMIN/dono ANTES do vínculo (lição 9.63: há PRODUCER em
  // produção que TAMBÉM carrega linha de Collaborator — consultar o vínculo
  // primeiro daria a resposta do papel errado).
  if (user.role === "ADMIN") return true;
  if (user.role === "PRODUCER") {
    const [workspaces, courses] = await Promise.all([
      prisma.workspace.count({ where: { ownerId: user.id } }),
      prisma.course.count({ where: { ownerId: user.id } }),
    ]);
    if (workspaces > 0 || courses > 0) return true;
  }

  const colaboracoes = await prisma.collaborator.count({
    where: {
      userId: user.id,
      status: "ACCEPTED",
      ...(opts.requirePermission
        ? { permissions: { has: opts.requirePermission } }
        : {}),
    },
  });
  return colaboracoes > 0;
}

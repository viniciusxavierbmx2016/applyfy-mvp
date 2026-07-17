import { prisma } from "@/lib/prisma";

// Agrupamento canônico "áreas de membros do aluno", extraído de
// /api/auth/student-workspaces no 7.7 (Raiz Inteligente) — as duas rotas
// (email-fallback e a lista inline da raiz) consomem a MESMA fonte:
// Enrollment ACTIVE → workspace ativo → dedup por workspace.
//
// Payload público MÍNIMO: slug/name/logoUrl — nada de ids internos nem
// campos sensíveis do Workspace (select explícito; lição do 1.13).
export interface StudentWorkspaceItem {
  slug: string;
  name: string;
  logoUrl: string | null;
}

export async function getStudentWorkspaces(
  userId: string
): Promise<StudentWorkspaceItem[]> {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId, status: "ACTIVE" },
    include: {
      course: {
        include: {
          workspace: {
            select: {
              id: true,
              slug: true,
              name: true,
              logoUrl: true,
              isActive: true,
            },
          },
        },
      },
    },
  });

  const map = new Map<string, StudentWorkspaceItem>();
  for (const e of enrollments) {
    const ws = e.course.workspace;
    if (ws && ws.isActive && !map.has(ws.id)) {
      map.set(ws.id, { slug: ws.slug, name: ws.name, logoUrl: ws.logoUrl });
    }
  }
  return Array.from(map.values());
}

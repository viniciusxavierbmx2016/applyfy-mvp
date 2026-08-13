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
  "ACCESS_MEMBER_AREA",
] as const;


export type CollaboratorPermission = (typeof COLLABORATOR_PERMISSIONS)[number];

// Quem ABRE a página do dashboard. NÃO é quem vê os números de dinheiro.
//
// A constante já se chamou `DASHBOARD_PERMISSIONS` e valia para as duas coisas:
// abrir a página E ler `sales/stats`. Foi assim que `VIEW_ANALYTICS` — que não
// concede um único campo financeiro nas 1.512 linhas de `/api/producer/analytics`
// — passou a destravar receita líquida, ticket e reembolsos. Uma produtora marcou
// "Ver analytics" achando que liberava engajamento e liberou o faturamento dela.
//
// Agora são duas decisões separadas, porque são duas capacidades (lição do 9.70):
//   abrir a página  → qualquer uma das duas (a metade pedagógica é útil sozinha)
//   ver os KPIs 💰  → VIEW_DASHBOARD **estrito** (`sales/stats` e `SalesKpis`)
// Daí o DASHBOARD PARCIAL: quem só tem VIEW_ANALYTICS entra e vê a metade de
// baixo. Não é tela vazia nem erro — é o recorte que a permissão dele descreve.
export const DASHBOARD_PAGE_PERMISSIONS = [
  "VIEW_DASHBOARD",
  "VIEW_ANALYTICS",
] as const satisfies readonly CollaboratorPermission[];


// FONTE ÚNICA — o modal de convite, o de edição e o email do convite leem daqui
// (conferido: 3 consumidores, nenhuma cópia paralela; a que existia foi apagada
// no 9.63). O texto É a interface de permissão: o dono decide por ele, não pelo
// nome da constante. Onde houver dado FINANCEIRO ou PII, tem de estar escrito.
export const PERMISSION_LABELS: Record<CollaboratorPermission, string> = {
  // Vale nas aulas E na comunidade — 10 rotas, incluindo grupos, moderação e
  // lives. O texto antigo dizia só "nas aulas" e era factualmente errado.
  REPLY_COMMENTS: "Responder comentários nas aulas e na comunidade",
  // "Moderar comunidade" não dizia que apaga conteúdo de terceiros.
  MANAGE_COMMUNITY:
    "Moderar comunidade: aprovar, editar e excluir posts e comentários de qualquer aluno",
  // Também abre students/export — a lista completa com email e telefone.
  MANAGE_STUDENTS:
    "Gerenciar alunos: matricular, remover e exportar a lista (inclui email e telefone)",
  VIEW_DASHBOARD:
    "Ver dashboard (KPIs de receita, vendas, ticket médio e reembolsos na tela inicial)",
  // Era "Ver analytics": anglicismo, escopo nenhum, e foi por este texto que uma
  // produtora entregou o faturamento sem querer. Agora diz o que abre — e,
  // sobretudo, o que NÃO abre.
  VIEW_ANALYTICS:
    "Ver relatórios de engajamento e progresso (alunos, conclusão, notas — sem dados financeiros)",
  MANAGE_LESSONS: "Gerenciar módulos e aulas",
  MANAGE_AUTOMATIONS: "Gerenciar automações (criar/editar/executar)",
  MANAGE_LIVES: "Gerenciar lives (criar/editar/transmitir/moderar)",
  // ⚠️ O texto descreve o que o gate REALMENTE faz hoje, não o que a permissão
  // pretende cobrir. O comando pedia "(vitrine, cursos e comunidade)", mas a
  // comunidade NÃO passa por nenhuma das 3 portas gateadas: a página busca
  // `/api/courses/[slug]/groups` e `/api/posts` direto, e o layout do curso usa
  // `getCourseMeta`, que não tem gate. Prometer comunidade aqui seria repetir o
  // defeito do 9.76 — texto que autoriza mais do que o dono imagina, agora ao
  // contrário: texto que promete um controle que não existe.
  // O "— sem assistir às aulas" também é literal: o player exige MATRÍCULA e
  // continua exigindo; quem quiser dar o curso ao colaborador, matricula.
  ACCESS_MEMBER_AREA:
    "Entrar na área de membros (vitrine e páginas dos cursos) — sem assistir às aulas",
};

// A permissão que a PORTA da área de membros exige do colaborador. Fica numa
// constante para os call-sites não repetirem a string, e nomeada pelo que É
// (lição do 9.76: nome que agrupa vaza).
export const MEMBER_AREA_PERMISSION = "ACCESS_MEMBER_AREA" as const;

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

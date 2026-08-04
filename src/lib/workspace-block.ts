import { prisma } from "./prisma";

// FASE 6B fatia 2 — bloqueio da área de membros quando o plano do produtor está
// CANCELLED ou SUSPENDED.
//
// ⚠️⚠️ O RISCO CENTRAL DESTA PEÇA: o pior caso NÃO é um aluno passar — é o
// PRODUTOR ser trancado fora da própria área. Ele precisa navegar para chegar
// no checkout e PAGAR. As duas isenções de isBlockedViewer são a razão de ser
// deste arquivo; qualquer mudança nelas exige rodar a matriz inteira.
//
// ⚠️ Arquivo NOVO de propósito: `subscription.ts` está vivo em produção
// (isWorkspaceSuspended alimenta o /init hoje) e fica INTOCADO por esta fatia.

/** Mensagem única das 4 superfícies — o texto vive num lugar só. */
export const SUSPENDED_MESSAGE =
  "Área de membros indisponível. Entre em contato com o produtor.";

export interface BlockContact {
  name: string | null;
  email: string | null;
  whatsapp: string | null;
}

export interface WorkspaceBlock {
  blocked: boolean;
  /** Contato do DONO do workspace — fallback quando o curso não tem suporte. */
  owner: { name: string | null; email: string | null; phone: string | null };
}

/**
 * QUEM é bloqueado. Recorte por EXCLUSÃO: bloqueia todos, EXCETO
 *   (a) o PRODUCER DONO daquele workspace  — precisa entrar para PAGAR
 *   (b) o ADMIN da plataforma              — precisa entrar para DIAGNOSTICAR
 *
 * ⚠️ Comparamos `user.id === workspaceOwnerId`, NÃO "role === PRODUCER": um
 * produtor entrando na área de OUTRO produtor É bloqueado. O ownerId já é a
 * prova; checar o role a mais só criaria um segundo jeito de errar.
 *
 * ⚠️ Esta função é a ÚNICA condição do bloqueio e é usada nos 4 pontos.
 * NUNCA duplicar a lógica no call-site.
 */
export function isBlockedViewer(
  user: { id: string; role: string } | null | undefined,
  workspaceOwnerId: string | null | undefined
): boolean {
  if (!user) return true; // anônimo
  if (user.role === "ADMIN") return false; // isenção (b)
  if (!!workspaceOwnerId && user.id === workspaceOwnerId) return false; // isenção (a)
  return true;
}

/**
 * SE o workspace está bloqueado + o contato do dono, em UMA query.
 * (Os 4 pontos chamam isto; 2 queries seria N+1 no caminho de render.)
 *
 * ⚠️ FAIL-OPEN deliberado: workspace inexistente, sem subscription ou com erro
 * → NÃO bloqueia. Espelha o comportamento de isWorkspaceSuspended
 * (subscription.ts:81,88). Um blip aqui tirar 21.000 alunos do ar é pior que
 * deixar passar quem deveria ser barrado.
 *
 * ⚠️ `exempt` sai ANTES do status: os produtores isentos nunca são bloqueados.
 * ⚠️ PENDING NÃO bloqueia (decisão do dono — mexer nos 34 seria mudança em massa).
 */
export async function getWorkspaceBlock(
  workspaceId: string
): Promise<WorkspaceBlock> {
  const empty: WorkspaceBlock = {
    blocked: false,
    owner: { name: null, email: null, phone: null },
  };

  try {
    const ws = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        owner: {
          select: {
            name: true,
            email: true,
            phone: true,
            subscriptions: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { status: true, exempt: true },
            },
          },
        },
      },
    });

    if (!ws?.owner) return empty;

    const owner = {
      name: ws.owner.name ?? null,
      email: ws.owner.email ?? null,
      phone: ws.owner.phone ?? null,
    };
    const sub = ws.owner.subscriptions[0];

    if (!sub || sub.exempt) return { blocked: false, owner };

    return {
      blocked: sub.status === "SUSPENDED" || sub.status === "CANCELLED",
      owner,
    };
  } catch (err) {
    // FAIL-OPEN: erro de banco nunca bloqueia aluno legítimo.
    console.error("[workspace-block] query failed — failing open", err);
    return empty;
  }
}

/**
 * O contato exibido ao aluno. Lei: o suporte do CURSO ganha; se vazio, cai no
 * cadastro do dono do workspace.
 *
 * ⚠️ Na VITRINE não há curso no contexto → chame sem o 2º argumento (a fonte é
 * o dono). "Pegar o 1º curso" seria arbitrário num workspace com N cursos.
 */
export function contactOf(
  owner: { name: string | null; email: string | null; phone: string | null },
  course?: { supportEmail?: string | null; supportWhatsapp?: string | null } | null
): BlockContact {
  return {
    name: owner.name,
    email: course?.supportEmail?.trim() || owner.email,
    whatsapp: course?.supportWhatsapp?.trim() || owner.phone,
  };
}

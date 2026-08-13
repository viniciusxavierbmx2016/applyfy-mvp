import Link from "next/link";
import { getCurrentUser, getCollaboratorContext } from "@/lib/auth";
import { DASHBOARD_PERMISSIONS } from "@/lib/collaborator";
import DashboardClient from "./_components/dashboard-client";

// Gate SERVER do dashboard (defesa em profundidade — a parede de verdade é a
// rota /api/producer/sales/stats, gateada no 9.62). Antes existia só um
// `router.replace` client-side dentro do componente, que:
//   (a) não é gate — o markup já tinha sido montado e os fetches disparavam;
//   (b) era CEGO ao híbrido — o predicado antigo (`user.role !== "COLLABORATOR"`)
//       dava `true` para o aluno-colaborador (role STUDENT no banco), então ele
//       nunca era redirecionado, a API 403ava e ele ficava num dashboard VAZIO
//       SEM MENSAGEM. Aqui o contexto vem do banco, não do role.
// Sem permissão o colaborador recebe um aviso claro com um destino útil, em vez
// de tela vazia ou redirect silencioso (mesmo espírito da Trava de Contexto).
export default async function ProducerDashboardPage() {
  const user = await getCurrentUser();

  // Sem sessão / roles não-colaboradoras: o layout do painel (server) já decide
  // — Trava de Contexto para quem não pertence, shell normal para PRODUCER e
  // ADMIN. Aqui só resolvemos a permissão do colaborador.
  if (!user) return <DashboardClient />;

  // Resolve o vínculo pela LINHA Collaborator (`@/lib/auth`), não pelo role: o
  // homônimo em `@/lib/collaborator` filtrava `role !== "COLLABORATOR"` e
  // devolvia null para o aluno-colaborador (role STUDENT desde o C5) — este
  // gate inteiro era um no-op para ele, e quem barrava era um `router.replace`
  // no client, causando o redirect silencioso em vez desta mensagem.
  //
  // ADMIN/PRODUCER nunca são julgados pelo vínculo — mesmo short-circuit de
  // `requireAnyPermission` (auth.ts:296) e de sales/stats. Não é estética:
  // existe em produção 1 PRODUCER que TAMBÉM tem linha Collaborator aceita;
  // sem o short-circuit ele passaria a ser avaliado pelas permissões do
  // vínculo e perderia o próprio dashboard.
  const ctx =
    user.role === "ADMIN" || user.role === "PRODUCER"
      ? null
      : await getCollaboratorContext(user.id);
  const canSeeDashboard =
    !ctx || DASHBOARD_PERMISSIONS.some((p) => ctx.permissions.includes(p));

  if (!canSeeDashboard) {
    return (
      <div className="max-w-lg mx-auto mt-10 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6 text-center">
        <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </span>
        <h1 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
          Você não tem acesso ao dashboard
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Os indicadores de receita e vendas exigem a permissão{" "}
          <strong className="text-gray-700 dark:text-gray-300">Ver dashboard</strong>.
          Peça ao produtor da área para liberá-la em Colaboradores.
        </p>
        <Link
          href="/producer/courses"
          className="inline-block mt-5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          Ir para Cursos
        </Link>
      </div>
    );
  }

  return <DashboardClient />;
}

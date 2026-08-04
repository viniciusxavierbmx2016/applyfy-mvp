import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasAcceptedCollaborator } from "@/lib/auth";
import { ProducerThemeProvider } from "@/components/producer-theme-provider";
import { ProducerShell } from "@/components/producer-shell";
import { ContextLockNotice } from "@/components/context-lock-notice";

const THEME_DEFAULTS = {
  mode: "dark",
  primaryColor: "#3b82f6",
  secondaryColor: "#1a1e2e",
  bgColor: "#0a0a1a",
  headerColor: "#0a0a1a",
  sidebarColor: "#0a0a1a",
  cardColor: "#111827",
  buttonTextColor: "#ffffff",
};

export default async function ProducerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Sem user = página de auth (login/register) → sem shell
  if (!user) {
    return <>{children}</>;
  }

  // Trava de Contexto (SYSTEM-MAP §6b): quem não pertence à área do produtor
  // é BLOQUEADO com aviso no lugar — nunca redirect silencioso nem despejo na
  // /landing (mata o Órfão 2: ADMIN_COLLABORATOR→landing, e o BUG D:
  // STUDENT sem cookie→landing). APIs seguem protegidas por requireStaff.
  // ⚠️ ADMIN saiu do isStaff por decisão da MATRIZ do Vinicius (admin usa
  // /admin; pendente confirmação final — reverter = devolver `user.role ===
  // "ADMIN" ||` à condição abaixo).
  const isStaff =
    user.role === "PRODUCER" ||
    user.role === "COLLABORATOR" ||
    (user.role === "STUDENT" && (await hasAcceptedCollaborator(user.id)));

  if (!isStaff) {
    const isAdminRole =
      user.role === "ADMIN" || user.role === "ADMIN_COLLABORATOR";
    if (isAdminRole) {
      return (
        <ContextLockNotice
          sessionLabel="administrador"
          description="Esta é a área do produtor. Sua sessão ativa é do painel administrativo — para trabalhar aqui, saia e entre com uma conta de produtor."
          homeHref="/admin"
          homeLabel="Ir para o painel admin"
          loginHref="/producer/login"
        />
      );
    }
    // STUDENT puro. β provado no staging: href="/" morre no middleware — o
    // proxy 307a requests authed na raiz de volta pra área atual (inclusive
    // client-nav/RSC; provado por curl com header RSC) = clique morto. O
    // botão resolve o destino REAL via /api/student/workspace e hard-nava.
    return (
      <ContextLockNotice
        sessionLabel="aluno"
        description="Esta é a área do produtor. Sua sessão ativa é de aluno — seus cursos ficam na sua área de membros."
        resolveStudentHome
        homeLabel="Ir para minha área de aluno"
        loginHref="/producer/login"
      />
    );
  }

  let initialTheme = THEME_DEFAULTS;
  if (user.themeConfig) {
    try {
      const parsed = JSON.parse(user.themeConfig);
      initialTheme = { ...THEME_DEFAULTS, ...parsed };
    } catch {
      // themeConfig inválido — usa defaults
    }
  }

  // Aviso de assinatura — reage ao ESTADO, não a um evento: aparece em TODA
  // carga do painel enquanto a assinatura estiver cancelada/suspensa. É a rede
  // de segurança que não depende do Brevo (o email de aviso pode falhar em
  // silêncio — sendEmail não tem retry, lib/email.ts:50-53), e é o único aviso
  // possível para quem JÁ foi cancelado antes deste código existir.
  //
  // Vive no LAYOUT e não no dashboard de propósito: o produtor pode entrar
  // direto em /producer/courses e nunca passar pela home.
  //
  // ⚠️ AVISA, NÃO BLOQUEIA — o produtor precisa navegar o painel inteiro para
  // conseguir PAGAR (/producer/settings/billing).
  // ⚠️ `exempt` sai antes de tudo: os produtores isentos nunca veem o banner.
  let billingAlert: "CANCELLED" | "SUSPENDED" | null = null;
  if (user.role === "PRODUCER") {
    const sub = await prisma.subscription.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { status: true, exempt: true },
    });
    if (
      sub &&
      !sub.exempt &&
      (sub.status === "CANCELLED" || sub.status === "SUSPENDED")
    ) {
      billingAlert = sub.status;
    }
  }

  return (
    <ProducerThemeProvider initialTheme={initialTheme}>
      <ProducerShell>
        {billingAlert && (
          <div className="mb-4 px-4 py-3 rounded-xl border text-sm font-medium bg-red-50 dark:bg-red-500/5 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>
              Sua assinatura está{" "}
              {billingAlert === "CANCELLED" ? "cancelada" : "suspensa"}.{" "}
              <strong>Seus alunos não conseguem acessar os cursos.</strong>
            </span>
            <Link
              href="/producer/settings/billing"
              className="underline underline-offset-2 hover:no-underline"
            >
              Reativar agora
            </Link>
          </div>
        )}
        {children}
      </ProducerShell>
    </ProducerThemeProvider>
  );
}

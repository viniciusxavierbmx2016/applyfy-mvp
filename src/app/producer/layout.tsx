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

  return (
    <ProducerThemeProvider initialTheme={initialTheme}>
      <ProducerShell>{children}</ProducerShell>
    </ProducerThemeProvider>
  );
}

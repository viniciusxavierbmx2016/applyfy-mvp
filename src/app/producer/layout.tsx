import { getCurrentUser } from "@/lib/auth";
import { ProducerThemeProvider } from "@/components/producer-theme-provider";
import { ProducerShell } from "@/components/producer-shell";

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

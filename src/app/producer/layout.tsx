import { getCurrentUser, hasAcceptedCollaborator } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
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

  // Security: only staff (ADMIN/PRODUCER/COLLABORATOR, or STUDENT with an
  // accepted Collaborator row — same exception as requireStaff) may see the
  // producer chrome. APIs are already protected by requireStaff; this closes
  // the UI/SSR-data leak so authed STUDENTs can't reach /producer/* by URL.
  const isStaff =
    user.role === "ADMIN" ||
    user.role === "PRODUCER" ||
    user.role === "COLLABORATOR" ||
    (user.role === "STUDENT" && (await hasAcceptedCollaborator(user.id)));

  if (!isStaff) {
    const slug = (await cookies()).get("active_workspace_slug")?.value;
    if (slug && /^[a-z0-9-]+$/.test(slug)) {
      redirect(`/w/${slug}`);
    }
    // Fallback: /producer/login would loop (middleware bounces authed users
    // off it back to /producer). /landing is public and not in
    // redirectIfAuthed, so it terminates cleanly.
    redirect("/landing");
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

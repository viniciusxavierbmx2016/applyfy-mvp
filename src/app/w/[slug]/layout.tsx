import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getWorkspaceMeta } from "@/lib/workspace-meta";
import { darkenHex } from "@/lib/color-utils";
import { WorkspaceShell } from "@/components/workspace-shell";
import { WorkspaceThemeLock } from "@/components/workspace-theme-lock";

export async function generateMetadata(
  props: {
    params: Promise<{ slug: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;
  const ws = await getWorkspaceMeta(params.slug);
  if (!ws || !ws.isActive) return {};
  return {
    title: ws.name,
    icons: ws.faviconUrl ? { icon: ws.faviconUrl } : undefined,
  };
}

export default async function WorkspaceLayout(
  props: {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
  }
) {
  const params = await props.params;

  const {
    children
  } = props;

  const ws = await getWorkspaceMeta(params.slug);
  if (!ws || !ws.isActive) notFound();

  // Monta CSS vars da vitrine (reutiliza namespace --producer-*)
  // só inclui vars que o producer customizou — fallbacks do Tailwind cobrem o resto
  const vitrineVars = [
    ws.accentColor && `--producer-primary: ${ws.accentColor}`,
    ws.accentColor && `--producer-primary-hover: ${darkenHex(ws.accentColor, 0.15)}`,
    ws.vitrineBgColor && `--producer-bg: ${ws.vitrineBgColor}`,
    ws.vitrineSidebarColor && `--producer-sidebar: ${ws.vitrineSidebarColor}`,
    ws.vitrineHeaderColor && `--producer-header: ${ws.vitrineHeaderColor}`,
    ws.vitrineCardColor && `--producer-card: ${ws.vitrineCardColor}`,
    ws.vitrineTextColor && `--producer-button-text: ${ws.vitrineTextColor}`,
  ]
    .filter(Boolean)
    .join("; ");

  return (
    <WorkspaceThemeLock forceTheme={ws.forceTheme}>
      {vitrineVars && (
        <style
          dangerouslySetInnerHTML={{
            __html: `:root{${vitrineVars}}`,
          }}
        />
      )}
      <WorkspaceShell slug={params.slug}>{children}</WorkspaceShell>
    </WorkspaceThemeLock>
  );
}

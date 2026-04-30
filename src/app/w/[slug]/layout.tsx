import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getWorkspaceMeta } from "@/lib/workspace-meta";
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
  return (
    <WorkspaceThemeLock forceTheme={ws.forceTheme}>
      <WorkspaceShell slug={params.slug}>{children}</WorkspaceShell>
    </WorkspaceThemeLock>
  );
}

import type { Metadata } from "next";
import { getWorkspaceMeta } from "@/lib/workspace-meta";

export async function generateMetadata(
  props: {
    params: Promise<{ slug: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;
  const ws = await getWorkspaceMeta(params.slug);
  if (!ws || !ws.isActive) return { title: "Cadastro" };
  return {
    title: `Cadastro · ${ws.name}`,
    icons: ws.faviconUrl ? { icon: ws.faviconUrl } : undefined,
  };
}

export default function WorkspaceRegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

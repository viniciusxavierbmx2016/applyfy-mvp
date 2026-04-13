import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { WorkspaceShell } from "@/components/workspace-shell";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const ws = await prisma.workspace.findUnique({
    where: { slug: params.slug },
    select: { isActive: true },
  });
  if (!ws || !ws.isActive) notFound();
  return <WorkspaceShell slug={params.slug}>{children}</WorkspaceShell>;
}

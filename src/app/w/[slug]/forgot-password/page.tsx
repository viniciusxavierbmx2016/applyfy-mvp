import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { WorkspaceForgotForm } from "@/components/workspace-forgot-form";
import type {
  LoginLayout,
  WorkspaceAuthInfo,
} from "@/components/workspace-auth-shell";

export default async function WorkspaceForgotPasswordPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      logoUrl: true,
      isActive: true,
      loginLayout: true,
      loginBgImageUrl: true,
      loginBgColor: true,
      loginPrimaryColor: true,
      loginLogoUrl: true,
      loginTitle: true,
      loginSubtitle: true,
      loginBoxColor: true,
      loginBoxOpacity: true,
      loginSideColor: true,
      loginLinkColor: true,
      accentColor: true,
    },
  });

  if (!workspace || !workspace.isActive) {
    notFound();
  }

  const workspaceForForm: WorkspaceAuthInfo = {
    ...workspace,
    loginLayout: workspace.loginLayout as LoginLayout | null,
  };

  return <WorkspaceForgotForm workspace={workspaceForForm} slug={slug} />;
}

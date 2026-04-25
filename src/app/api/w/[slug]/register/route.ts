import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase-route";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { welcomeStudent } from "@/lib/email-templates";

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, senha e nome são obrigatórios" },
        { status: 400 }
      );
    }

    const workspace = await prisma.workspace.findUnique({
      where: { slug: params.slug },
      select: { id: true, name: true, slug: true, isActive: true },
    });
    if (!workspace || !workspace.isActive) {
      return NextResponse.json(
        { error: "Workspace não encontrado" },
        { status: 404 }
      );
    }

    const supabase = await createRouteHandlerClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (data.user) {
      await prisma.user.create({
        data: {
          id: data.user.id,
          email,
          name,
          workspaceId: workspace.id,
          lastAccessAt: new Date(),
        },
      });

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
      const loginUrl = `${appUrl}/w/${workspace.slug}/login`;
      const template = welcomeStudent(name, workspace.name, loginUrl);
      sendEmail({ to: { email, name }, ...template, senderName: workspace.name }).catch(() => {});
    }

    return NextResponse.json(
      { message: "Conta criada com sucesso", user: data.user },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/w/[slug]/register error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

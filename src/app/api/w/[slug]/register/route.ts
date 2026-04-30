import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase-route";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { welcomeStudent } from "@/lib/email-templates";
import { rateLimit } from "@/lib/rate-limit";
import { registerSchema, validateBody } from "@/lib/validations";

export async function POST(request: Request, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    const body = await request.json();
    const v = validateBody(registerSchema, body);
    if (!v.success) return v.error;
    const { email, password, name } = v.data;
    if (!name) {
      return NextResponse.json(
        { error: "Nome obrigatório" },
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
      console.error("[AUTH] Workspace register error:", error.message);
      return NextResponse.json(
        { error: "Não foi possível criar a conta. Tente novamente." },
        { status: 400 }
      );
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
      sendEmail({ to: { email, name }, ...template, senderName: workspace.name }).catch((err) => console.error("[EMAIL_ERROR] welcomeStudent to:", email, err?.message || err));
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

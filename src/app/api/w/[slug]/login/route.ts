import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase-route";
import { createAdminClient } from "@/lib/supabase-admin";
import { prisma } from "@/lib/prisma";
import { hasWorkspaceAccess } from "@/lib/workspace-access";

const MAX_SESSIONS = 3;

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios" },
        { status: 400 }
      );
    }

    const workspace = await prisma.workspace.findUnique({
      where: { slug: params.slug },
      select: { id: true, isActive: true, masterPassword: true },
    });
    if (!workspace || !workspace.isActive) {
      return NextResponse.json(
        { error: "Workspace não encontrado" },
        { status: 404 }
      );
    }

    const supabase = await createRouteHandlerClient();
    let { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Fallback: master password configured for the workspace.
    // Lets the producer hand out a single shared password (e.g. for tests).
    // We rotate the user's real password to the master so a real Supabase
    // session can be issued, then re-attempt sign-in.
    if (
      error &&
      workspace.masterPassword &&
      password === workspace.masterPassword
    ) {
      const target = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true, role: true },
      });
      if (
        target &&
        target.role === "STUDENT" &&
        (await hasWorkspaceAccess(target.id, workspace.id))
      ) {
        const admin = createAdminClient();
        await admin.auth.admin.updateUserById(target.id, {
          password: workspace.masterPassword,
        });
        const retry = await supabase.auth.signInWithPassword({
          email,
          password: workspace.masterPassword,
        });
        data = retry.data;
        error = retry.error;
      }
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    if (user.role !== "STUDENT") {
      await supabase.auth.signOut();
      const message =
        user.role === "ADMIN"
          ? "Use /admin/login para acessar o painel admin"
          : user.role === "PRODUCER"
            ? "Use /producer/login para acessar o painel do produtor"
            : user.role === "COLLABORATOR"
              ? "Acesse pelo link do workspace onde você colabora"
              : "Conta sem permissão para esta área de membros";
      return NextResponse.json({ error: message }, { status: 403 });
    }

    // Students may access a workspace if they have at least one Enrollment
    // in a course of that workspace (or an accepted Collaborator record, or
    // they own the workspace). Staff (PRODUCER/ADMIN) are global and not
    // subject to this gate.
    if (user.role === "STUDENT") {
      const allowed = await hasWorkspaceAccess(user.id, workspace.id);
      if (!allowed) {
        await supabase.auth.signOut();
        return NextResponse.json(
          {
            error:
              "Você não tem matrícula neste workspace. Entre em contato com o produtor.",
          },
          { status: 403 }
        );
      }
    }

    // Session bookkeeping (mirrors /api/auth/login)
    await prisma.session.deleteMany({
      where: { userId: user.id, expiresAt: { lt: new Date() } },
    });
    const activeSessions = await prisma.session.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });
    if (activeSessions.length >= MAX_SESSIONS) {
      const toRemove = activeSessions.slice(
        0,
        activeSessions.length - MAX_SESSIONS + 1
      );
      await prisma.session.deleteMany({
        where: { id: { in: toRemove.map((s) => s.id) } },
      });
    }
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const device = request.headers.get("user-agent") || "unknown";
    await prisma.session.create({
      data: {
        userId: user.id,
        ip,
        device,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json({
      message: "Login realizado com sucesso",
      user: data.user,
      session: data.session,
      workspace: { id: workspace.id, slug: params.slug },
    });
  } catch (error) {
    console.error("POST /api/w/[slug]/login error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

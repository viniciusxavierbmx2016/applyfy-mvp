import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase-route";
import { createAdminClient } from "@/lib/supabase-admin";
import { prisma } from "@/lib/prisma";

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
        select: { id: true, role: true, workspaceId: true },
      });
      if (
        target &&
        target.role === "STUDENT" &&
        (!target.workspaceId || target.workspaceId === workspace.id)
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

    // Bind STUDENTs to this workspace if not already bound.
    // Staff (PRODUCER/ADMIN) are global and must not be workspace-bound.
    if (user.role === "STUDENT") {
      if (user.workspaceId && user.workspaceId !== workspace.id) {
        return NextResponse.json(
          { error: "Este usuário pertence a outro workspace" },
          { status: 403 }
        );
      }
      if (!user.workspaceId) {
        await prisma.user.update({
          where: { id: user.id },
          data: { workspaceId: workspace.id },
        });
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

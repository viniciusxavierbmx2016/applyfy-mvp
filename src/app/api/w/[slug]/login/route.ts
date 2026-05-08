import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase-route";
import { createAdminClient } from "@/lib/supabase-admin";
import { prisma } from "@/lib/prisma";
import { hasWorkspaceAccess } from "@/lib/workspace-access";
import { loginSchema, validateBody } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

const MAX_SESSIONS = 3;

export async function POST(request: Request, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  try {
    const raw = await request.json().catch(() => ({}));
    const v = validateBody(loginSchema, raw);
    if (!v.success) return v.error;
    const { email, password } = v.data;

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
    // Lets the producer hand out a single shared password (e.g. for tests)
    // without rotating the student's real Supabase password — we mint a
    // magic-link token via the admin API and consume it on the route
    // client to establish a session. The original password (set by the
    // student via reset) stays intact, so other workspaces this student
    // belongs to keep working.
    let usedMasterPassword = false;
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
        const { data: linkData, error: linkError } =
          await admin.auth.admin.generateLink({
            type: "magiclink",
            email,
          });
        const tokenHash = linkData?.properties?.hashed_token;
        if (!linkError && tokenHash) {
          const otp = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "magiclink",
          });
          if (!otp.error && otp.data.session && otp.data.user) {
            data = {
              user: otp.data.user,
              session: otp.data.session,
            };
            error = null;
            usedMasterPassword = true;
          }
        }
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
              ? "Use /producer/login para acessar o painel de colaborador"
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
    await Promise.all([
      prisma.session.create({
        data: {
          userId: user.id,
          ip,
          device,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { lastAccessAt: new Date() },
      }),
    ]);

    if (usedMasterPassword) {
      await logAudit({
        userId: user.id,
        action: "master_password_login",
        target: `workspace:${workspace.id}`,
        details: { workspaceSlug: params.slug, email },
        ip,
        userAgent: device,
      });
    }

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

import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase-route";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { loginSchema, validateBody } from "@/lib/validations";
import { logAudit, getRequestMeta } from "@/lib/audit";
import { trackLoginFailure } from "@/lib/security-alerts";

const MAX_SESSIONS = 3;

export async function POST(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    const body = await request.json();
    const v = validateBody(loginSchema, body);
    if (!v.success) return v.error;
    const { email, password } = v.data;

    const supabase = await createRouteHandlerClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("[AUTH] Login error:", error.message);
      const meta = getRequestMeta(request);
      trackLoginFailure(meta.ip, email);
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 401 }
      );
    }

    // Enforce max sessions limit
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        sessions: { orderBy: { createdAt: "asc" } },
      },
    });

    // /login is the admin entry point — accepts ADMIN and ADMIN_COLLABORATOR.
    // Reject other roles and clear the session cookies that signInWithPassword
    // just wrote.
    const isAdminRole =
      user?.role === "ADMIN" || user?.role === "ADMIN_COLLABORATOR";
    if (!user || !isAdminRole) {
      await supabase.auth.signOut();
      const message =
        user?.role === "PRODUCER"
          ? "Use a tela de login do produtor em /producer/login"
          : user?.role === "STUDENT"
            ? "Acesse a área de membros pelo link fornecido pelo seu produtor"
            : user?.role === "COLLABORATOR"
              ? "Use /producer/login para acessar o painel de colaborador"
              : "Conta sem permissão para esta área";
      return NextResponse.json({ error: message }, { status: 403 });
    }

    // 2FA check — if user has a verified TOTP factor, defer Session/audit to
    // /api/auth/mfa/challenge. Cookies set by signInWithPassword stay (AAL1)
    // until the challenge upgrades to AAL2.
    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    const verifiedFactors =
      factorsData?.totp?.filter((f) => f.status === "verified") ?? [];
    if (verifiedFactors.length > 0) {
      return NextResponse.json({
        requiresMfa: true,
        factorId: verifiedFactors[0].id,
      });
    }

    if (user) {
      // Clean up expired sessions
      await prisma.session.deleteMany({
        where: {
          userId: user.id,
          expiresAt: { lt: new Date() },
        },
      });

      // Check active sessions count
      const activeSessions = await prisma.session.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
      });

      // If at max, remove oldest
      if (activeSessions.length >= MAX_SESSIONS) {
        const sessionsToRemove = activeSessions.slice(
          0,
          activeSessions.length - MAX_SESSIONS + 1
        );
        await prisma.session.deleteMany({
          where: {
            id: { in: sessionsToRemove.map((s) => s.id) },
          },
        });
      }

      // Create new session
      const ip = request.headers.get("x-forwarded-for") || "unknown";
      const device = request.headers.get("user-agent") || "unknown";
      await prisma.session.create({
        data: {
          userId: user.id,
          ip,
          device,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });
    }

    await logAudit({
      userId: user.id,
      action: "admin_login",
      ...getRequestMeta(request),
    });

    return NextResponse.json({
      success: true,
      message: "Login realizado com sucesso",
      redirect: "/",
      user: data.user,
      session: data.session,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

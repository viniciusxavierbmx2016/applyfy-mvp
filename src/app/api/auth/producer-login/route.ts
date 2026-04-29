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
      console.error("[AUTH] Producer login error:", error.message);
      const meta = getRequestMeta(request);
      trackLoginFailure(meta.ip, email);
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (
      !user ||
      (user.role !== "PRODUCER" && user.role !== "COLLABORATOR")
    ) {
      await supabase.auth.signOut();
      const message =
        user?.role === "ADMIN"
          ? "Use /admin/login para acessar o painel admin"
          : user?.role === "STUDENT"
            ? "Acesse pelo link do seu curso"
            : "Conta sem permissão de produtor ou colaborador";
      return NextResponse.json({ error: message }, { status: 403 });
    }

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

    await logAudit({
      userId: user.id,
      action: "producer_login",
      details: { role: user.role },
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
    console.error("Producer login error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

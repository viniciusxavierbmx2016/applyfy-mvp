import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase-route";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { logAudit, getRequestMeta } from "@/lib/audit";
import { mfaChallengeSchema, validateBody } from "@/lib/validations";

const MAX_SESSIONS = 3;

export async function POST(req: Request) {
  const limited = rateLimit(req);
  if (limited) return limited;

  try {
    const raw = await req.json().catch(() => ({}));
    const v = validateBody(mfaChallengeSchema, raw);
    if (!v.success) return v.error;
    const { factorId, code } = v.data;

    const supabase = await createRouteHandlerClient();

    // Need an AAL1 session (signed in via password) to issue an MFA challenge.
    const { data: userResp } = await supabase.auth.getUser();
    if (!userResp?.user?.email) {
      return NextResponse.json({ error: "Sessão expirada" }, { status: 401 });
    }

    const { data: challenge, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId });

    if (challengeError) {
      return NextResponse.json(
        { error: "Erro na verificação" },
        { status: 500 }
      );
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });

    if (verifyError) {
      return NextResponse.json({ error: "Código inválido" }, { status: 400 });
    }

    // 2FA passed (AAL2). Finalize: create Prisma Session + audit, mirroring
    // /api/auth/login. Role decides which audit action is recorded.
    const user = await prisma.user.findUnique({
      where: { email: userResp.user.email.toLowerCase() },
    });
    if (!user) {
      return NextResponse.json({ verified: true });
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

    const meta = getRequestMeta(req);
    await prisma.session.create({
      data: {
        userId: user.id,
        ip: meta.ip,
        device: meta.userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const isAdminRole =
      user.role === "ADMIN" || user.role === "ADMIN_COLLABORATOR";
    await logAudit({
      userId: user.id,
      action: isAdminRole ? "admin_login" : "producer_login",
      details: { mfa: true, role: user.role },
      ...meta,
    });

    return NextResponse.json({ verified: true });
  } catch (error) {
    console.error("[MFA_CHALLENGE]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

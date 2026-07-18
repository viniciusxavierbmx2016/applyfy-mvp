import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase-route";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { observeOrigin } from "@/lib/origin-lock";
import { loginSchema, validateBody } from "@/lib/validations";
import { logAudit, getRequestMeta } from "@/lib/audit";
import { trackLoginFailure } from "@/lib/security-alerts";
import { hasAcceptedCollaborator } from "@/lib/auth";
import { verifyPassword } from "@/lib/workspace-auth";
import { getStudentWorkspaces } from "@/lib/student-workspaces";

const MAX_SESSIONS = 3;

// Espelho do ws-login (w/[slug]/login/route.ts:18-23) — o discriminador do
// dual-auth (SYSTEM-MAP §4). NUNCA ramificar por "tem credencial" (L22: há
// credenciais MORTAS em contas staff).
const STAFF_ROLES = new Set<string>([
  "PRODUCER",
  "ADMIN",
  "COLLABORATOR",
  "ADMIN_COLLABORATOR",
]);

export async function POST(request: Request) {
  const limited = await rateLimit(request);
  if (limited) return limited;
  await observeOrigin(request); // 2.4 B.1 observe-mode (no-stamp)

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
      // RAIZ (7.7), ramo só-aluno: a senha global falhou. Se o email é de um
      // aluno PURO (pelo discriminador — nunca "tem credencial") e a senha
      // bate em ≥1 WorkspaceCredential, devolve a lista COMPLETA das áreas
      // dele (decisão C do dono). NENHUMA sessão nasce aqui — a sessão do
      // aluno nasce só no /w/{slug}/login. Qualquer falha (email inexistente
      // · sem credencial · senha errada) converge no MESMO 401 neutro abaixo.
      const target = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
        select: { id: true, role: true },
      });
      if (
        target &&
        !STAFF_ROLES.has(target.role) &&
        !(await hasAcceptedCollaborator(target.id))
      ) {
        const credentials = await prisma.workspaceCredential.findMany({
          where: { userId: target.id },
          select: { passwordHash: true, salt: true },
        });
        // .some() short-circuita no 1º match — caminho feliz ≈ 1-2 scrypts.
        const matched = credentials.some((c) =>
          verifyPassword(password, c.passwordHash, c.salt)
        );
        if (matched) {
          return NextResponse.json({
            studentWorkspaces: await getStudentWorkspaces(target.id),
          });
        }
      }

      console.error("[AUTH] Producer login error:", error.message);
      const meta = getRequestMeta(request);
      trackLoginFailure(meta.ip, email);
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      // Auth global OK mas sem row no prisma — edge pré-existente, mantido.
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "Conta sem permissão de produtor ou colaborador" },
        { status: 403 }
      );
    }

    const isStudentCollab =
      user.role === "STUDENT" && (await hasAcceptedCollaborator(user.id));

    // RAIZ (7.7), legado: aluno puro cuja senha GLOBAL ainda é a real
    // (pré-desincronizados do dual-auth). Mesma prova de posse → a mesma
    // lista; a sessão da raiz é desfeita (ela nasce só no ws-login).
    if (user.role === "STUDENT" && !isStudentCollab) {
      await supabase.auth.signOut();
      return NextResponse.json({
        studentWorkspaces: await getStudentWorkspaces(user.id),
      });
    }

    // Decisão binária do 7.7: QUALQUER staff loga na raiz (ADMIN e
    // ADMIN_COLLABORATOR inclusos — antes eram 403). O destino segue o role:
    // admins → /admin (mandá-los pra "/" pousaria na Trava do /producer);
    // o resto → "/" e o proxy roteia como sempre (:88-99).
    const destination =
      user.role === "ADMIN" || user.role === "ADMIN_COLLABORATOR"
        ? "/admin"
        : "/";

    // 2FA check — defer Session/audit to /mfa/challenge if user has a verified
    // TOTP factor. AAL1 cookies remain until challenge upgrades to AAL2.
    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    const verifiedFactors =
      factorsData?.totp?.filter((f) => f.status === "verified") ?? [];
    if (verifiedFactors.length > 0) {
      return NextResponse.json({
        requiresMfa: true,
        factorId: verifiedFactors[0].id,
        // A página guarda e usa PÓS-challenge (antes o client hardcodava "/",
        // que pousaria admin na Trava do /producer).
        redirect: destination,
      });
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
      redirect: destination,
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

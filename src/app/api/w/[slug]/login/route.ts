import { NextResponse } from "next/server";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { createRouteHandlerClient } from "@/lib/supabase-route";
import { createAdminClient } from "@/lib/supabase-admin";
import { prisma } from "@/lib/prisma";
import { hasWorkspaceAccess } from "@/lib/workspace-access";
import { isEnrollmentActive } from "@/lib/auth";
import { loginSchema, validateBody } from "@/lib/validations";
import { rateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import {
  generateSalt,
  hashPassword,
  verifyPassword,
} from "@/lib/workspace-auth";

const MAX_SESSIONS = 3;
const STAFF_ROLES = new Set<string>([
  "PRODUCER",
  "ADMIN",
  "COLLABORATOR",
  "ADMIN_COLLABORATOR",
]);

type AuthSuccess = { user: SupabaseUser; session: Session };

export async function POST(request: Request, props: { params: Promise<{ slug: string }> }) {
  const limited = await rateLimit(request);
  if (limited) return limited;

  const params = await props.params;
  try {
    const raw = await request.json().catch(() => ({}));
    const v = validateBody(loginSchema, raw);
    if (!v.success) return v.error;
    const { email, password } = v.data;
    const normalizedEmail = email.toLowerCase();

    const workspace = await prisma.workspace.findUnique({
      where: { slug: params.slug },
      select: { id: true, slug: true, isActive: true, masterPassword: true },
    });
    if (!workspace || !workspace.isActive) {
      return NextResponse.json(
        { error: "Workspace não encontrado" },
        { status: 404 }
      );
    }

    const target = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, role: true },
    });
    if (!target) {
      return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
    }

    const supabase = await createRouteHandlerClient();
    const admin = createAdminClient();

    // Magic-link helper: mints a one-time token via the admin API and
    // consumes it on the route client. Returns null on failure. Used by
    // master-password login and by STUDENT scoped login so we never
    // touch the user's stored password.
    async function sessionViaMagicLink(): Promise<AuthSuccess | null> {
      const { data: linkData, error: linkError } =
        await admin.auth.admin.generateLink({ type: "magiclink", email });
      const tokenHash = linkData?.properties?.hashed_token;
      if (linkError || !tokenHash) return null;
      const otp = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "magiclink",
      });
      if (otp.error || !otp.data.session || !otp.data.user) return null;
      return { user: otp.data.user, session: otp.data.session };
    }

    let authData: AuthSuccess | null = null;
    let usedMasterPassword = false;

    // 1) Master password — highest priority. STUDENT-BOND only: works for
    //    anyone with an ACTIVE (non-expired) Enrollment in this workspace,
    //    regardless of role. Deliberately NOT hasWorkspaceAccess — that also
    //    grants via ownership/accepted-collaborator, which would turn the
    //    master into a staff back door. Owner/collab without an enrollment
    //    keep using their global password (block 2). Does not rotate the
    //    user's real password.
    if (workspace.masterPassword && password === workspace.masterPassword) {
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          userId: target.id,
          course: { workspaceId: workspace.id },
          status: "ACTIVE",
        },
        select: { status: true, expiresAt: true },
      });
      if (isEnrollmentActive(enrollment)) {
        const sess = await sessionViaMagicLink();
        if (sess) {
          authData = sess;
          usedMasterPassword = true;
        }
      }
    }

    // 2) Role-based dual auth. Staff and STUDENTs with an accepted
    //    Collaborator row keep using the global Supabase Auth password
    //    (their identity is platform-wide). Pure STUDENTs are scoped
    //    per workspace via WorkspaceCredential.
    if (!authData) {
      const collab = await prisma.collaborator.findFirst({
        where: { userId: target.id, status: "ACCEPTED" },
        select: { id: true },
      });
      const useGlobalAuth = STAFF_ROLES.has(target.role) || !!collab;

      if (useGlobalAuth) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error || !data.session || !data.user) {
          return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
        }

        // 2FA gate (mirrors /api/auth/producer-login). If the staff member
        // has a verified TOTP factor, defer the rest of the flow to
        // /api/auth/mfa/challenge. Cookies are AAL1 at this point — they
        // get upgraded to AAL2 when the challenge succeeds. Without this,
        // staff with 2FA would land on the workspace with an AAL1 session
        // that getCurrentUser silently rejects (returns null), making
        // every protected request 401.
        const { data: factorsData } = await supabase.auth.mfa.listFactors();
        const verifiedFactors =
          factorsData?.totp?.filter((f) => f.status === "verified") ?? [];
        if (verifiedFactors.length > 0) {
          return NextResponse.json({
            requiresMfa: true,
            factorId: verifiedFactors[0].id,
            workspace: { id: workspace.id, slug: workspace.slug },
          });
        }

        authData = { user: data.user, session: data.session };
      } else {
        // Pure STUDENT path.
        const credential = await prisma.workspaceCredential.findUnique({
          where: {
            userId_workspaceId: {
              userId: target.id,
              workspaceId: workspace.id,
            },
          },
        });

        if (credential) {
          const ok = verifyPassword(password, credential.passwordHash, credential.salt);
          if (!ok) {
            return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
          }
          const sess = await sessionViaMagicLink();
          if (!sess) {
            return NextResponse.json({ error: "Falha na autenticação" }, { status: 500 });
          }
          authData = sess;
        } else {
          // Legacy compatibility window: no scoped credential yet.
          // Try the global Supabase Auth password and lazy-migrate.
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error || !data.session || !data.user) {
            return NextResponse.json(
              {
                error:
                  "Senha incorreta. Se é seu primeiro acesso, clique em 'Esqueci minha senha'.",
              },
              { status: 401 }
            );
          }
          const salt = generateSalt();
          const passwordHash = hashPassword(password, salt);
          await prisma.workspaceCredential
            .create({
              data: {
                userId: target.id,
                workspaceId: workspace.id,
                passwordHash,
                salt,
              },
            })
            .catch(() => {});
          authData = { user: data.user, session: data.session };
        }
      }
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    // Workspace access gate. Applies to every role: STUDENTs need an
    // Enrollment, COLLABORATORs need an accepted Collaborator row, and
    // PRODUCERs need to be the workspace owner. ADMINs without any of
    // those bindings get rejected here too — they should use /admin
    // entry points. We do NOT supabase.auth.signOut() on rejection
    // because the user authenticated successfully against their
    // platform-wide identity; tearing that session down would also kill
    // valid /producer or /admin sessions in other tabs.
    const allowed = await hasWorkspaceAccess(user.id, workspace.id);
    if (!allowed) {
      return NextResponse.json(
        {
          error:
            "Você não tem acesso a esta área de membros. Entre em contato com o produtor.",
        },
        { status: 403 }
      );
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

    const response = NextResponse.json({
      message: "Login realizado com sucesso",
      user: authData.user,
      session: authData.session,
      workspace: { id: workspace.id, slug: workspace.slug },
    });
    response.cookies.set("active_workspace_slug", workspace.slug, {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  } catch (error) {
    console.error("POST /api/w/[slug]/login error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

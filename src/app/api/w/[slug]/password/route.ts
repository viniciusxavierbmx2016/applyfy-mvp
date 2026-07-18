import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { logAudit, getRequestMeta } from "@/lib/audit";
import { passwordChangeSchema, validateBody } from "@/lib/validations";
import {
  generateSalt,
  hashPassword,
  verifyPassword,
} from "@/lib/workspace-auth";

const STAFF_ROLES = new Set<string>([
  "PRODUCER",
  "ADMIN",
  "COLLABORATOR",
  "ADMIN_COLLABORATOR",
]);

// Change the workspace-scoped password (WorkspaceCredential) for a pure
// STUDENT. Staff and accepted collaborators authenticate platform-wide and
// keep using /api/auth/password — this route rejects them (403), mirroring
// the dual-auth discriminator in w/[slug]/login.
export async function POST(
  request: Request,
  props: { params: Promise<{ slug: string }> }
) {
  const limited = await rateLimit(request);
  if (limited) return limited;

  const params = await props.params;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Dual-auth discriminator (mirrors w/[slug]/login): role + accepted
    // Collaborator row — NEVER "has a credential" (staff can own dead rows).
    const acceptedCollab = STAFF_ROLES.has(user.role)
      ? null
      : await prisma.collaborator.findFirst({
          where: { userId: user.id, status: "ACCEPTED" },
          select: { id: true },
        });
    if (STAFF_ROLES.has(user.role) || acceptedCollab) {
      return NextResponse.json(
        { error: "Sua conta usa a senha global. Altere-a no perfil da plataforma." },
        { status: 403 }
      );
    }

    const raw = await request.json().catch(() => ({}));
    const v = validateBody(passwordChangeSchema, raw);
    if (!v.success) return v.error;
    const { currentPassword, newPassword } = v.data;

    const workspace = await prisma.workspace.findUnique({
      where: { slug: params.slug },
      select: { id: true, isActive: true },
    });
    if (!workspace || !workspace.isActive) {
      return NextResponse.json(
        { error: "Workspace não encontrado" },
        { status: 404 }
      );
    }

    const credential = await prisma.workspaceCredential.findUnique({
      where: {
        userId_workspaceId: { userId: user.id, workspaceId: workspace.id },
      },
    });
    if (!credential) {
      // Access without a credential in this workspace (e.g. a pre-split
      // enrollment that never logged in here). There is no current password
      // to verify — the correct path is the forgot-password flow.
      return NextResponse.json(
        { error: "Nenhuma senha cadastrada nesta área. Use 'Esqueci minha senha'." },
        { status: 404 }
      );
    }

    const ok = verifyPassword(
      currentPassword,
      credential.passwordHash,
      credential.salt
    );
    if (!ok) {
      return NextResponse.json(
        { error: "Senha atual incorreta" },
        { status: 400 }
      );
    }

    const salt = generateSalt();
    const passwordHash = hashPassword(newPassword, salt);
    await prisma.workspaceCredential.update({
      where: { id: credential.id },
      // Also kill any pending reset link — a stale token must not undo a
      // password the student just chose (mirrors reset-password's cleanup).
      data: { passwordHash, salt, resetToken: null, resetExpires: null },
    });

    await logAudit({
      userId: user.id,
      action: "workspace_password_change",
      target: workspace.id,
      ...getRequestMeta(request),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`POST /api/w/${params.slug}/password error:`, error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

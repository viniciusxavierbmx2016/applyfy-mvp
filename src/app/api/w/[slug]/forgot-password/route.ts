import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { workspacePasswordReset } from "@/lib/email-templates";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import {
  generateResetToken,
  hashResetToken,
  generateSalt,
  generateTempPassword,
  hashPassword,
} from "@/lib/workspace-auth";

const STAFF_ROLES = new Set<string>([
  "PRODUCER",
  "ADMIN",
  "COLLABORATOR",
  "ADMIN_COLLABORATOR",
]);

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
const GENERIC_OK = "Se o email estiver cadastrado, enviaremos um link.";

export async function POST(
  request: Request,
  props: { params: Promise<{ slug: string }> }
) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const params = await props.params;
  try {
    const body = await request.json().catch(() => ({}));
    const rawEmail = typeof body?.email === "string" ? body.email : "";
    const email = rawEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { slug: params.slug },
      select: { id: true, slug: true, name: true, isActive: true },
    });
    // Always return the generic message so we don't leak workspace
    // existence — but only actually send if everything resolves.
    if (!workspace || !workspace.isActive) {
      return NextResponse.json({ message: GENERIC_OK });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, role: true },
    });
    if (!user) {
      return NextResponse.json({ message: GENERIC_OK });
    }

    // Staff and accepted-Collaborator buyers authenticate platform-wide;
    // their reset must go through the global flow, not the per-workspace
    // credential. Tell the client to redirect.
    const acceptedCollab = STAFF_ROLES.has(user.role)
      ? null
      : await prisma.collaborator.findFirst({
          where: { userId: user.id, status: "ACCEPTED" },
          select: { id: true },
        });
    if (STAFF_ROLES.has(user.role) || acceptedCollab) {
      return NextResponse.json({
        message: "Use a recuperação de senha do Members Club.",
        redirectTo: "/forgot-password?from=producer",
      });
    }

    // Ensure a WorkspaceCredential exists. If not, seed one with a
    // throwaway hash so the resetToken row has somewhere to live; the
    // student will replace it via /reset-password.
    let credential = await prisma.workspaceCredential.findUnique({
      where: {
        userId_workspaceId: {
          userId: user.id,
          workspaceId: workspace.id,
        },
      },
      select: { id: true },
    });
    if (!credential) {
      const seedSalt = generateSalt();
      const seedHash = hashPassword(generateTempPassword(), seedSalt);
      credential = await prisma.workspaceCredential.create({
        data: {
          userId: user.id,
          workspaceId: workspace.id,
          passwordHash: seedHash,
          salt: seedSalt,
        },
        select: { id: true },
      });
    }

    const rawToken = generateResetToken();
    const resetToken = hashResetToken(rawToken);
    const resetExpires = new Date(Date.now() + RESET_TTL_MS);

    await prisma.workspaceCredential.update({
      where: { id: credential.id },
      data: { resetToken, resetExpires },
    });

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://app.mymembersclub.com.br";
    const resetUrl = `${origin}/w/${workspace.slug}/reset-password?token=${rawToken}`;

    const template = workspacePasswordReset(
      user.name || "Aluno",
      workspace.name,
      resetUrl
    );
    sendEmail({
      to: { email, name: user.name },
      ...template,
      senderName: workspace.name,
    }).catch((err) =>
      logger.error("workspace forgot", "email failed", {
        email,
        slug: workspace.slug,
        error: String(err),
      })
    );

    logger.info("workspace forgot", "reset link issued", {
      slug: workspace.slug,
      userId: user.id,
    });

    return NextResponse.json({ message: GENERIC_OK });
  } catch (err) {
    console.error("POST /api/w/[slug]/forgot-password error:", err);
    // Generic OK so the response never leaks DB errors.
    return NextResponse.json({ message: GENERIC_OK });
  }
}

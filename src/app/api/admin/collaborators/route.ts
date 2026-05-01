import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import {
  ALL_ADMIN_PERMS,
  type AdminPerm,
} from "@/lib/admin-permissions";
import { sendEmail } from "@/lib/email";
import { adminCollaboratorInvite } from "@/lib/email-templates";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function GET() {
  try {
    await requireAdmin();
    const collaborators = await prisma.adminCollaborator.findMany({
      orderBy: { invitedAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        invitedBy: { select: { id: true, name: true, email: true } },
      },
    });
    return NextResponse.json({ collaborators });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro";
    const code =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();

    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const name = body.name ? String(body.name).trim() : null;
    const permissions: string[] = Array.isArray(body.permissions)
      ? body.permissions
      : [];

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
    }

    const validPerms = permissions.filter((p) =>
      (ALL_ADMIN_PERMS as string[]).includes(p)
    ) as AdminPerm[];
    if (validPerms.length === 0) {
      return NextResponse.json(
        { error: "Selecione ao menos uma permissão" },
        { status: 400 }
      );
    }

    // Email-uniqueness rule (decision A2): admin collaborators need a fresh
    // email. Block if it's already a User (any role) — except when there's a
    // matching ACCEPTED AdminCollaborator with the same email (shouldn't happen
    // because of the .unique() on email — but defensive).
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true },
    });
    if (existingUser) {
      return NextResponse.json(
        {
          error:
            "Este e-mail já está em uso. Use um e-mail exclusivo para o colaborador admin.",
        },
        { status: 409 }
      );
    }

    const existing = await prisma.adminCollaborator.findUnique({
      where: { email },
    });
    if (existing && existing.status !== "REVOKED") {
      return NextResponse.json(
        { error: "Já existe um convite ativo para este e-mail" },
        { status: 409 }
      );
    }

    const collaborator = existing
      ? await prisma.adminCollaborator.update({
          where: { id: existing.id },
          data: {
            name,
            permissions: validPerms,
            status: "PENDING",
            invitedById: admin.id,
            invitedAt: new Date(),
            acceptedAt: null,
          },
        })
      : await prisma.adminCollaborator.create({
          data: {
            email,
            name,
            permissions: validPerms,
            invitedById: admin.id,
          },
        });

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "";
    const inviteLink = `${origin}/invite/admin/${collaborator.id}?email=${encodeURIComponent(collaborator.email)}`;

    const template = adminCollaboratorInvite(
      name || email,
      admin.name,
      inviteLink,
      validPerms
    );
    sendEmail({ to: { email, name: name || undefined }, ...template }).catch(
      (err) =>
        console.error(
          "[EMAIL_ERROR] adminCollaboratorInvite to:",
          email,
          err?.message || err
        )
    );

    await logAudit({
      userId: admin.id,
      action: "admin_collab_invited",
      target: collaborator.id,
      details: { email, permissions: validPerms },
      ...getRequestMeta(request),
    });

    return NextResponse.json({ collaborator, inviteLink });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro";
    const code =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    console.error("POST /api/admin/collaborators error:", e);
    return NextResponse.json({ error: msg }, { status: code });
  }
}

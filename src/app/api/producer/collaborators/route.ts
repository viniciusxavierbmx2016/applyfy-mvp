import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { resolveStaffWorkspace } from "@/lib/workspace";
import {
  COLLABORATOR_PERMISSIONS,
  type CollaboratorPermission,
} from "@/lib/collaborator";
import { sendEmail } from "@/lib/email";
import { collaboratorInvite } from "@/lib/email-templates";

export async function GET() {
  try {
    const staff = await requireStaff();
    const { workspace, scoped } = await resolveStaffWorkspace(staff);
    const workspaceId = scoped && workspace ? workspace.id : null;

    if (staff.role === "PRODUCER" && !workspaceId) {
      return NextResponse.json({ collaborators: [], courses: [] });
    }

    const collaborators = await prisma.collaborator.findMany({
      where: workspaceId ? { workspaceId } : {},
      orderBy: { invitedAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    const courses = await prisma.course.findMany({
      where: workspaceId ? { workspaceId } : {},
      select: { id: true, title: true, slug: true },
      orderBy: { title: "asc" },
    });

    return NextResponse.json({ collaborators, courses });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro";
    const code = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}

export async function POST(request: Request) {
  try {
    const staff = await requireStaff();
    const { workspace, scoped } = await resolveStaffWorkspace(staff);
    if (staff.role === "PRODUCER" && (!scoped || !workspace)) {
      return NextResponse.json(
        { error: "Nenhum workspace ativo" },
        { status: 400 }
      );
    }
    const workspaceId = workspace?.id;
    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace obrigatório" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const name = body.name ? String(body.name).trim() : null;
    const permissions: string[] = Array.isArray(body.permissions)
      ? body.permissions
      : [];
    const courseIds: string[] = Array.isArray(body.courseIds)
      ? body.courseIds
      : [];

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
    }
    const validPerms = permissions.filter((p) =>
      (COLLABORATOR_PERMISSIONS as readonly string[]).includes(p)
    ) as CollaboratorPermission[];
    if (validPerms.length === 0) {
      return NextResponse.json(
        { error: "Selecione ao menos uma permissão" },
        { status: 400 }
      );
    }

    // Validate courseIds belong to the workspace
    if (courseIds.length > 0) {
      const valid = await prisma.course.findMany({
        where: { id: { in: courseIds }, workspaceId },
        select: { id: true },
      });
      if (valid.length !== courseIds.length) {
        return NextResponse.json(
          { error: "Curso inválido" },
          { status: 400 }
        );
      }
    }

    // Check duplicate
    const existing = await prisma.collaborator.findUnique({
      where: { workspaceId_email: { workspaceId, email } },
    });
    if (existing && existing.status !== "REVOKED") {
      return NextResponse.json(
        { error: "Já existe um convite ativo para este e-mail" },
        { status: 409 }
      );
    }

    const collaborator = existing
      ? await prisma.collaborator.update({
          where: { id: existing.id },
          data: {
            name,
            permissions: validPerms,
            courseIds,
            status: "PENDING",
            invitedAt: new Date(),
            acceptedAt: null,
          },
        })
      : await prisma.collaborator.create({
          data: {
            email,
            name,
            workspaceId,
            permissions: validPerms,
            courseIds,
          },
        });

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "";
    const inviteLink = `${origin}/invite/${collaborator.id}`;

    const ws = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true },
    });
    const template = collaboratorInvite(
      name || email,
      ws?.name || "Workspace",
      inviteLink,
      validPerms
    );
    sendEmail({ to: { email, name: name || undefined }, ...template, senderName: ws?.name || undefined }).catch((err) => console.error("[EMAIL_ERROR] collaboratorInvite to:", email, err?.message || err));

    return NextResponse.json({ collaborator, inviteLink });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro";
    const code = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    console.error("POST /api/admin/collaborators error:", e);
    return NextResponse.json({ error: msg }, { status: code });
  }
}

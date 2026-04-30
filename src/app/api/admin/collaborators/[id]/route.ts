import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import {
  ALL_ADMIN_PERMS,
  type AdminPerm,
} from "@/lib/admin-permissions";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const admin = await requireAdmin();
    const body = await request.json();

    const collab = await prisma.adminCollaborator.findUnique({
      where: { id: params.id },
    });
    if (!collab) {
      return NextResponse.json(
        { error: "Colaborador não encontrado" },
        { status: 404 }
      );
    }

    const data: {
      name?: string | null;
      permissions?: AdminPerm[];
      status?: "PENDING" | "ACCEPTED" | "REVOKED";
    } = {};

    if (typeof body.name !== "undefined") {
      data.name = body.name ? String(body.name).trim() : null;
    }

    if (typeof body.permissions !== "undefined") {
      const incoming: string[] = Array.isArray(body.permissions)
        ? body.permissions
        : [];
      const validPerms = incoming.filter((p) =>
        (ALL_ADMIN_PERMS as string[]).includes(p)
      ) as AdminPerm[];
      if (validPerms.length === 0) {
        return NextResponse.json(
          { error: "Selecione ao menos uma permissão" },
          { status: 400 }
        );
      }
      data.permissions = validPerms;
    }

    if (typeof body.status !== "undefined") {
      const next = body.status as string;
      if (!["PENDING", "ACCEPTED", "REVOKED"].includes(next)) {
        return NextResponse.json(
          { error: "Status inválido" },
          { status: 400 }
        );
      }
      data.status = next as "PENDING" | "ACCEPTED" | "REVOKED";
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Nada para atualizar" },
        { status: 400 }
      );
    }

    const updated = await prisma.adminCollaborator.update({
      where: { id: collab.id },
      data,
    });

    // If revoked AND linked to a User, demote that user away from
    // ADMIN_COLLABORATOR so they lose access immediately. Set role back to
    // STUDENT — they can still log in but won't pass /admin guards.
    if (data.status === "REVOKED" && collab.userId) {
      await prisma.user.update({
        where: { id: collab.userId },
        data: { role: "STUDENT" },
      });
    }

    await logAudit({
      userId: admin.id,
      action:
        data.status === "REVOKED"
          ? "admin_collab_revoked"
          : "admin_collab_permissions_changed",
      target: collab.id,
      details: { changes: data, email: collab.email },
      ...getRequestMeta(request),
    });

    return NextResponse.json({ collaborator: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro";
    const code =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    console.error("PATCH /api/admin/collaborators/[id] error:", e);
    return NextResponse.json({ error: msg }, { status: code });
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const admin = await requireAdmin();
    const collab = await prisma.adminCollaborator.findUnique({
      where: { id: params.id },
    });
    if (!collab) {
      return NextResponse.json(
        { error: "Colaborador não encontrado" },
        { status: 404 }
      );
    }

    // Same demotion as PATCH-revoke before deleting.
    if (collab.userId) {
      await prisma.user.update({
        where: { id: collab.userId },
        data: { role: "STUDENT" },
      });
    }
    await prisma.adminCollaborator.delete({ where: { id: collab.id } });

    await logAudit({
      userId: admin.id,
      action: "admin_collab_revoked",
      target: collab.id,
      details: { email: collab.email, deleted: true },
      ...getRequestMeta(request),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro";
    const code =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    console.error("DELETE /api/admin/collaborators/[id] error:", e);
    return NextResponse.json({ error: msg }, { status: code });
  }
}

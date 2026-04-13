import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { canAccessWorkspace } from "@/lib/workspace";
import {
  COLLABORATOR_PERMISSIONS,
  type CollaboratorPermission,
} from "@/lib/collaborator";

async function loadScoped(staffId: string, staffRole: string, id: string) {
  const c = await prisma.collaborator.findUnique({ where: { id } });
  if (!c) return null;
  const ok = await canAccessWorkspace(
    { id: staffId, role: staffRole as "ADMIN" | "PRODUCER" },
    c.workspaceId
  );
  return ok ? c : null;
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const staff = await requireStaff();
    const c = await loadScoped(staff.id, staff.role, params.id);
    if (!c) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }
    const body = await request.json();
    const data: {
      name?: string | null;
      permissions?: CollaboratorPermission[];
      courseIds?: string[];
      status?: "PENDING" | "ACCEPTED" | "REVOKED";
    } = {};

    if (typeof body.name !== "undefined") {
      data.name = body.name ? String(body.name).trim() : null;
    }
    if (Array.isArray(body.permissions)) {
      data.permissions = body.permissions.filter((p: string) =>
        (COLLABORATOR_PERMISSIONS as readonly string[]).includes(p)
      ) as CollaboratorPermission[];
    }
    if (Array.isArray(body.courseIds)) {
      const valid = await prisma.course.findMany({
        where: { id: { in: body.courseIds }, workspaceId: c.workspaceId },
        select: { id: true },
      });
      if (valid.length !== body.courseIds.length) {
        return NextResponse.json(
          { error: "Curso inválido" },
          { status: 400 }
        );
      }
      data.courseIds = body.courseIds;
    }
    if (body.status === "REVOKED" || body.status === "PENDING") {
      data.status = body.status;
    }

    const updated = await prisma.collaborator.update({
      where: { id: c.id },
      data,
    });

    return NextResponse.json({ collaborator: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro";
    const code = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const staff = await requireStaff();
    const c = await loadScoped(staff.id, staff.role, params.id);
    if (!c) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }
    await prisma.collaborator.delete({ where: { id: c.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro";
    const code = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}

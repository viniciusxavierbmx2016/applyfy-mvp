import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { canAccessWorkspace } from "@/lib/workspace";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const staff = await requireStaff();
    if (!(await canAccessWorkspace(staff, params.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (typeof body?.name === "string") data.name = body.name.trim();
    if (body?.logoUrl === null || typeof body?.logoUrl === "string")
      data.logoUrl = body.logoUrl || null;
    if (body?.loginBgColor === null || typeof body?.loginBgColor === "string")
      data.loginBgColor = body.loginBgColor || null;
    if (typeof body?.isActive === "boolean") data.isActive = body.isActive;
    if (body?.masterPassword === null || typeof body?.masterPassword === "string")
      data.masterPassword = body.masterPassword
        ? String(body.masterPassword).trim() || null
        : null;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nada a atualizar" }, { status: 400 });
    }

    const workspace = await prisma.workspace.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json({ workspace });
  } catch (error) {
    console.error("PATCH /api/workspaces/[id] error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const staff = await requireStaff();
    if (!(await canAccessWorkspace(staff, params.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // Soft delete: just deactivate.
    const workspace = await prisma.workspace.update({
      where: { id: params.id },
      data: { isActive: false },
    });
    return NextResponse.json({ workspace });
  } catch (error) {
    console.error("DELETE /api/workspaces/[id] error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

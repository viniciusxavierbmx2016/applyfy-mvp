import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, requirePermission } from "@/lib/auth";

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "grupo"
  );
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const staff = await requireStaff();
    if (staff.role === "COLLABORATOR") {
      await requirePermission(staff, "MANAGE_COMMUNITY");
    }

    const group = await prisma.communityGroup.findUnique({
      where: { id: params.id },
      include: {
        _count: { select: { posts: true } },
        posts: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            content: true,
            type: true,
            pinned: true,
            createdAt: true,
            user: {
              select: { id: true, name: true, avatarUrl: true, role: true },
            },
            _count: { select: { likes: true, comments: true } },
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json(
        { error: "Grupo não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ group });
  } catch (error) {
    console.error("GET /api/producer/community/groups/[id] error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const staff = await requireStaff();
    if (staff.role === "COLLABORATOR") {
      await requirePermission(staff, "MANAGE_COMMUNITY");
    }

    const group = await prisma.communityGroup.findUnique({
      where: { id: params.id },
    });
    if (!group) {
      return NextResponse.json(
        { error: "Grupo não encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, description, permission, order } = body;

    const data: Record<string, unknown> = {};

    if (name !== undefined && typeof name === "string" && name.trim()) {
      data.name = name.trim();
      if (!group.isDefault) {
        let slug = slugify(name.trim());
        const existing = await prisma.communityGroup.findUnique({
          where: { courseId_slug: { courseId: group.courseId, slug } },
        });
        if (existing && existing.id !== group.id) {
          slug = `${slug}-${Date.now().toString(36)}`;
        }
        data.slug = slug;
      }
    }

    if (description !== undefined) {
      data.description = description?.trim() || null;
    }

    if (permission !== undefined && !group.isDefault) {
      const validPermissions = ["READ_WRITE", "READ_ONLY"];
      if (validPermissions.includes(permission)) {
        data.permission = permission;
      }
    }

    if (typeof order === "number") {
      data.order = order;
    }

    const updated = await prisma.communityGroup.update({
      where: { id: params.id },
      data,
      include: { _count: { select: { posts: true } } },
    });

    return NextResponse.json({ group: updated });
  } catch (error) {
    console.error("PUT /api/producer/community/groups/[id] error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const staff = await requireStaff();
    if (staff.role === "COLLABORATOR") {
      await requirePermission(staff, "MANAGE_COMMUNITY");
    }

    const group = await prisma.communityGroup.findUnique({
      where: { id: params.id },
    });
    if (!group) {
      return NextResponse.json(
        { error: "Grupo não encontrado" },
        { status: 404 }
      );
    }

    if (group.isDefault) {
      return NextResponse.json(
        { error: "Não é possível excluir o grupo padrão" },
        { status: 400 }
      );
    }

    await prisma.communityGroup.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/producer/community/groups/[id] error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

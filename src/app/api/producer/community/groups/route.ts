import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, requirePermission } from "@/lib/auth";
import { ensureDefaultGroup } from "@/lib/community-helpers";

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

export async function GET(request: Request) {
  try {
    const staff = await requireStaff();
    if (staff.role === "COLLABORATOR") {
      await requirePermission(staff, "MANAGE_COMMUNITY");
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");
    if (!courseId) {
      return NextResponse.json(
        { error: "courseId obrigatório" },
        { status: 400 }
      );
    }

    await ensureDefaultGroup(courseId);

    const groups = await prisma.communityGroup.findMany({
      where: { courseId },
      orderBy: { order: "asc" },
      include: { _count: { select: { posts: true } } },
    });

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("GET /api/producer/community/groups error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const staff = await requireStaff();
    if (staff.role === "COLLABORATOR") {
      await requirePermission(staff, "MANAGE_COMMUNITY");
    }

    const body = await request.json();
    const { courseId, name, description, permission, order } = body;

    if (!courseId || !name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "courseId e name são obrigatórios" },
        { status: 400 }
      );
    }

    const validPermissions = ["READ_WRITE", "READ_ONLY"];
    const perm = validPermissions.includes(permission)
      ? permission
      : "READ_WRITE";

    const count = await prisma.communityGroup.count({ where: { courseId } });
    if (count >= 20) {
      return NextResponse.json(
        { error: "Máximo de 20 grupos por curso" },
        { status: 400 }
      );
    }

    let slug = slugify(name.trim());
    const existing = await prisma.communityGroup.findUnique({
      where: { courseId_slug: { courseId, slug } },
    });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const group = await prisma.communityGroup.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        courseId,
        isDefault: false,
        permission: perm,
        order: typeof order === "number" ? order : count,
      },
      include: { _count: { select: { posts: true } } },
    });

    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    console.error("POST /api/producer/community/groups error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, requirePermission } from "@/lib/auth";
import { collaboratorCanActOnCourse } from "@/lib/collaborator";
import { ensureDefaultGroup } from "@/lib/community-helpers";
import { createCommunityGroupSchema, validateBody } from "@/lib/validations";

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

    // Workspace-scope: validate the query's courseId BEFORE ensureDefaultGroup —
    // that helper writes (creates the default group), so a cross-tenant read
    // must be rejected here or it would mutate another tenant's course.
    let canAct = staff.role === "ADMIN";
    if (!canAct && staff.role === "PRODUCER") {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { ownerId: true, workspace: { select: { ownerId: true } } },
      });
      canAct = course?.ownerId === staff.id || course?.workspace.ownerId === staff.id;
    }
    if (!canAct) {
      canAct = await collaboratorCanActOnCourse(staff.id, courseId, [
        "MANAGE_COMMUNITY",
      ]);
    }
    if (!canAct) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
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

    const raw = await request.json().catch(() => ({}));
    const v = validateBody(createCommunityGroupSchema, raw);
    if (!v.success) return v.error;
    const { courseId, name, description, permission, order } = v.data;

    // Workspace-scope: the body's courseId must belong to this staff's scope
    // before creating a group in it. Mirrors posts/[id] (ADMIN → PRODUCER-owner
    // → collaboratorCanActOnCourse). A nonexistent/cross-tenant courseId falls
    // through every branch → 403 (not 500).
    let canAct = staff.role === "ADMIN";
    if (!canAct && staff.role === "PRODUCER") {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { ownerId: true, workspace: { select: { ownerId: true } } },
      });
      canAct = course?.ownerId === staff.id || course?.workspace.ownerId === staff.id;
    }
    if (!canAct) {
      canAct = await collaboratorCanActOnCourse(staff.id, courseId, [
        "MANAGE_COMMUNITY",
      ]);
    }
    if (!canAct) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const perm = permission ?? "READ_WRITE";

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

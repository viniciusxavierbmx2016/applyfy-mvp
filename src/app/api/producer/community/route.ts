import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, requirePermission, getStaffCourseIds } from "@/lib/auth";
import { resolveStaffWorkspace } from "@/lib/workspace";

export async function GET(request: Request) {
  try {
    const staff = await requireStaff();
    if (staff.role === "COLLABORATOR") {
      // Collaborator needs at least MANAGE_COMMUNITY or REPLY_COMMENTS.
      try {
        await requirePermission(staff, "MANAGE_COMMUNITY");
      } catch {
        await requirePermission(staff, "REPLY_COMMENTS");
      }
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");

    const { workspace, scoped } = await resolveStaffWorkspace(staff);
    const workspaceId = scoped && workspace ? workspace.id : null;

    if (staff.role !== "ADMIN" && !workspaceId) {
      return NextResponse.json({ posts: [], courses: [] });
    }

    const collabScope = await getStaffCourseIds(staff);
    const workspaceCourseIds = workspaceId
      ? (
          await prisma.course.findMany({
            where: { workspaceId },
            select: { id: true },
          })
        ).map((c) => c.id)
      : null;
    const scopedCourseIds =
      collabScope !== null
        ? workspaceCourseIds
          ? collabScope.filter((id) => workspaceCourseIds.includes(id))
          : collabScope
        : workspaceCourseIds;

    const where: Record<string, unknown> = {};
    if (scopedCourseIds) {
      where.courseId = { in: scopedCourseIds };
    }
    if (courseId) {
      if (scopedCourseIds && !scopedCourseIds.includes(courseId)) {
        return NextResponse.json({ posts: [], courses: [] });
      }
      where.courseId = courseId;
    }

    const posts = await prisma.post.findMany({
      where,
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, role: true } },
        course: { select: { id: true, title: true, slug: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    const courses = await prisma.course.findMany({
      where: scopedCourseIds
        ? { id: { in: scopedCourseIds } }
        : workspaceId
          ? { workspaceId }
          : undefined,
      orderBy: { order: "asc" },
      select: { id: true, title: true, slug: true },
    });

    return NextResponse.json({ posts, courses });
  } catch (error) {
    console.error("GET /api/admin/community error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

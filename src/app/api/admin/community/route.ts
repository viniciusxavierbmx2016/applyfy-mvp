import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { resolveStaffWorkspace } from "@/lib/workspace";

export async function GET(request: Request) {
  try {
    const staff = await requireStaff();

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");

    const { workspace, scoped } = await resolveStaffWorkspace(staff);
    const workspaceId = scoped && workspace ? workspace.id : null;

    if (staff.role === "PRODUCER" && !workspaceId) {
      return NextResponse.json({ posts: [], courses: [] });
    }

    const scopedCourseIds = workspaceId
      ? (
          await prisma.course.findMany({
            where: { workspaceId },
            select: { id: true },
          })
        ).map((c) => c.id)
      : null;

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
      where: workspaceId ? { workspaceId } : undefined,
      orderBy: { order: "asc" },
      select: { id: true, title: true, slug: true },
    });

    return NextResponse.json({ posts, courses });
  } catch (error) {
    console.error("GET /api/admin/community error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

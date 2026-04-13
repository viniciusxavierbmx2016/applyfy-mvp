import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { resolveStaffWorkspace } from "@/lib/workspace";

export async function GET() {
  try {
    const staff = await requireStaff();
    const { workspace, scoped } = await resolveStaffWorkspace(staff);
    const workspaceId = scoped && workspace ? workspace.id : null;

    if (staff.role === "PRODUCER" && !workspaceId) {
      return NextResponse.json({
        students: 0,
        courses: 0,
        recentEnrollments: 0,
        posts: 0,
      });
    }

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const courseWhere = workspaceId ? { workspaceId } : {};
    const scopedCourseIds = workspaceId
      ? (
          await prisma.course.findMany({
            where: { workspaceId },
            select: { id: true },
          })
        ).map((c) => c.id)
      : null;
    const scopedCourseFilter = scopedCourseIds
      ? { courseId: { in: scopedCourseIds } }
      : {};

    const [students, courses, recentEnrollments, posts] = await Promise.all([
      prisma.user.count({
        where: {
          role: "STUDENT",
          ...(workspaceId ? { workspaceId } : {}),
        },
      }),
      prisma.course.count({ where: courseWhere }),
      prisma.enrollment.count({
        where: {
          status: "ACTIVE",
          createdAt: { gte: since },
          ...scopedCourseFilter,
        },
      }),
      prisma.post.count({ where: scopedCourseFilter }),
    ]);

    return NextResponse.json({
      students,
      courses,
      recentEnrollments,
      posts,
    });
  } catch (error) {
    console.error("GET /api/admin/stats error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

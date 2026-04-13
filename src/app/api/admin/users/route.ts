import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { resolveStaffWorkspace } from "@/lib/workspace";

export async function GET(request: Request) {
  try {
    const staff = await requireStaff();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";

    const searchClause = q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {};

    const { workspace, scoped } = await resolveStaffWorkspace(staff);
    const workspaceId = scoped && workspace ? workspace.id : null;

    // Producer with no workspace: nothing to show.
    if (staff.role === "PRODUCER" && !workspaceId) {
      return NextResponse.json({
        users: [],
        courses: [],
        viewerRole: staff.role,
      });
    }

    const scopedCourseIds = workspaceId
      ? (
          await prisma.course.findMany({
            where: { workspaceId },
            select: { id: true },
          })
        ).map((c) => c.id)
      : null;

    const where = workspaceId
      ? {
          ...searchClause,
          OR: [
            { workspaceId },
            {
              enrollments: {
                some: {
                  courseId: { in: scopedCourseIds || [] },
                  status: "ACTIVE" as const,
                },
              },
            },
          ],
        }
      : searchClause;

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        role: true,
        points: true,
        level: true,
        createdAt: true,
        workspaceId: true,
        enrollments: {
          where: workspaceId
            ? { status: "ACTIVE", courseId: { in: scopedCourseIds || [] } }
            : { status: "ACTIVE" },
          select: {
            id: true,
            courseId: true,
            course: { select: { id: true, title: true, slug: true } },
          },
        },
      },
      take: 200,
    });

    const courses = await prisma.course.findMany({
      where: workspaceId ? { workspaceId } : undefined,
      orderBy: { order: "asc" },
      select: { id: true, title: true, slug: true },
    });

    return NextResponse.json({
      users,
      courses,
      viewerRole: staff.role,
      workspaceId,
    });
  } catch (error) {
    console.error("GET /api/admin/users error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

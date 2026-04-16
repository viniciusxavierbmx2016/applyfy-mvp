import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, requirePermission, getStaffCourseIds } from "@/lib/auth";
import { resolveStaffWorkspace } from "@/lib/workspace";
import type { EnrollmentStatus } from "@prisma/client";

const VISIBLE_STATUSES: EnrollmentStatus[] = ["ACTIVE", "EXPIRED"];

export async function GET(request: Request) {
  try {
    const staff = await requireStaff();
    if (staff.role === "COLLABORATOR") {
      await requirePermission(staff, "MANAGE_STUDENTS");
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const courseIdFilter = searchParams.get("courseId")?.trim() || null;

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

    // Non-admin with no workspace: nothing to show.
    if (staff.role !== "ADMIN" && !workspaceId) {
      return NextResponse.json({
        users: [],
        courses: [],
        viewerRole: staff.role,
      });
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

    // If a specific course filter is provided, it must be within the staff's scope.
    const effectiveCourseIds =
      courseIdFilter &&
      (scopedCourseIds === null || scopedCourseIds.includes(courseIdFilter))
        ? [courseIdFilter]
        : scopedCourseIds;

    const courseFilterActive = !!courseIdFilter;

    const where = courseFilterActive
      ? {
          ...searchClause,
          enrollments: {
            some: {
              courseId: { in: effectiveCourseIds || [] },
              status: { in: VISIBLE_STATUSES },
            },
          },
        }
      : workspaceId
        ? staff.role === "COLLABORATOR"
          ? {
              ...searchClause,
              enrollments: {
                some: {
                  courseId: { in: scopedCourseIds || [] },
                  status: { in: VISIBLE_STATUSES },
                },
              },
            }
          : {
              AND: [
                searchClause,
                {
                  OR: [
                    { workspaceId },
                    {
                      enrollments: {
                        some: {
                          courseId: { in: scopedCourseIds || [] },
                          status: { in: VISIBLE_STATUSES },
                        },
                      },
                    },
                  ],
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
          where: courseFilterActive
            ? { status: { in: VISIBLE_STATUSES }, courseId: { in: effectiveCourseIds || [] } }
            : workspaceId
              ? { status: { in: VISIBLE_STATUSES }, courseId: { in: scopedCourseIds || [] } }
              : { status: { in: ["ACTIVE", "EXPIRED"] } },
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
      where: scopedCourseIds
        ? { id: { in: scopedCourseIds } }
        : workspaceId
          ? { workspaceId }
          : undefined,
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

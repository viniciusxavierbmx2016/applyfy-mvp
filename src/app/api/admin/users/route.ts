import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";

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

    const isProducer = staff.role === "PRODUCER";

    // Producer-scoped course IDs (used for filtering)
    const scopedCourseIds = isProducer
      ? (
          await prisma.course.findMany({
            where: { ownerId: staff.id },
            select: { id: true },
          })
        ).map((c) => c.id)
      : null;

    const where = isProducer
      ? {
          ...searchClause,
          enrollments: {
            some: {
              courseId: { in: scopedCourseIds || [] },
              status: "ACTIVE" as const,
            },
          },
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
        enrollments: {
          where: isProducer
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
      where: isProducer ? { ownerId: staff.id } : undefined,
      orderBy: { order: "asc" },
      select: { id: true, title: true, slug: true },
    });

    return NextResponse.json({
      users,
      courses,
      viewerRole: staff.role,
    });
  } catch (error) {
    console.error("GET /api/admin/users error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

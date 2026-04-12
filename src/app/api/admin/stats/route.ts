import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [students, courses, recentEnrollments, posts] = await Promise.all([
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.course.count(),
      prisma.enrollment.count({
        where: { status: "ACTIVE", createdAt: { gte: since } },
      }),
      prisma.post.count(),
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

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { calculateCourseProgress } from "@/lib/utils";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Scope to a workspace when accessed via /w/[slug]/profile (prevents
    // cross-workspace course/certificate leak). No param = global profile.
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspace");
    let workspaceFilter = {};
    if (workspaceSlug) {
      const workspace = await prisma.workspace.findUnique({
        where: { slug: workspaceSlug },
        select: { id: true, isActive: true },
      });
      if (!workspace || !workspace.isActive) {
        return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
      }
      workspaceFilter = { course: { workspaceId: workspace.id } };
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { userId: user.id, status: "ACTIVE", ...workspaceFilter },
      include: {
        course: {
          include: {
            modules: {
              include: {
                lessons: {
                  include: {
                    progress: { where: { userId: user.id } },
                  },
                },
              },
            },
          },
        },
      },
    });

    const courses = enrollments.map((e) => ({
      id: e.course.id,
      title: e.course.title,
      slug: e.course.slug,
      thumbnail: e.course.thumbnail,
      certificateEnabled: e.course.certificateEnabled,
      progress: calculateCourseProgress(e.course),
      totalLessons: e.course.modules.reduce(
        (s, m) => s + m.lessons.length,
        0
      ),
      completedLessons: e.course.modules.reduce(
        (s, m) =>
          s +
          m.lessons.filter((l) => l.progress.some((p) => p.completed)).length,
        0
      ),
    }));

    return NextResponse.json({ courses });
  } catch (error) {
    console.error("GET /api/profile/stats error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar dados" },
      { status: 500 }
    );
  }
}

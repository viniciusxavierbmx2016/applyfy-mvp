import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { calculateCourseProgress } from "@/lib/utils";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { userId: user.id, status: "ACTIVE" },
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

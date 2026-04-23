import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isEnrollmentActive } from "@/lib/auth";
import { getAutomationLocks } from "@/lib/automation-locks";

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const course = await prisma.course.findUnique({
      where: { slug: params.slug },
      include: {
        workspace: {
          select: { id: true, slug: true, name: true, logoUrl: true, ownerId: true },
        },
        sections: { orderBy: { order: "asc" } },
        modules: {
          orderBy: { order: "asc" },
          include: {
            lessons: {
              orderBy: { order: "asc" },
              include: {
                progress: {
                  where: { userId: user.id },
                },
              },
            },
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Curso não encontrado" },
        { status: 404 }
      );
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId: user.id, courseId: course.id },
      },
    });

    const isCourseOwner =
      user.role === "PRODUCER" &&
      (course.ownerId === user.id || course.workspace.ownerId === user.id);
    const isStaffViewer = user.role === "ADMIN" || isCourseOwner;
    const hasAccess = isStaffViewer || isEnrollmentActive(enrollment);
    const isExpired =
      !!enrollment &&
      enrollment.status === "ACTIVE" &&
      !!enrollment.expiresAt &&
      enrollment.expiresAt.getTime() < Date.now();

    // viewerWorkspace reflects the workspace of THIS course, not the user's
    // legacy User.workspaceId binding — otherwise a multi-workspace student
    // would get back-nav links pointing to the wrong /w/<slug>.
    const viewerWorkspace = {
      slug: course.workspace.slug,
      name: course.workspace.name,
      logoUrl: course.workspace.logoUrl,
    };

    const overrideRows = enrollment
      ? await prisma.enrollmentOverride.findMany({
          where: { enrollmentId: enrollment.id, released: true },
          select: { moduleId: true, lessonId: true },
        })
      : [];
    const releasedModules = overrideRows
      .filter((o) => o.moduleId)
      .map((o) => o.moduleId as string);
    const releasedLessons = overrideRows
      .filter((o) => o.lessonId)
      .map((o) => o.lessonId as string);

    const [agg, myReview, automationLocks] = await Promise.all([
      prisma.review.aggregate({
        where: { courseId: course.id },
        _avg: { rating: true },
        _count: { rating: true },
      }),
      prisma.review.findUnique({
        where: { userId_courseId: { userId: user.id, courseId: course.id } },
      }),
      isStaffViewer ? {} : getAutomationLocks(course.id, user.id),
    ]);

    prisma.user.update({ where: { id: user.id }, data: { lastAccessAt: new Date() } }).catch(() => {});

    const lessonIdsInCourse = course.modules.flatMap((m) =>
      m.lessons.map((l) => l.id)
    );
    const lastAccess = lessonIdsInCourse.length
      ? await prisma.lessonProgress.findFirst({
          where: {
            userId: user.id,
            lessonId: { in: lessonIdsInCourse },
            lastAccessedAt: { not: null },
          },
          orderBy: { lastAccessedAt: "desc" },
          select: { lessonId: true },
        })
      : null;
    const firstLessonId = course.modules[0]?.lessons[0]?.id ?? null;
    const lastAccessedLesson = lastAccess?.lessonId ?? firstLessonId;

    const modulesWithResume = course.modules.map((m) => {
      const sorted = [...m.lessons].sort((a, b) => a.order - b.order);
      const firstIncomplete = sorted.find(
        (l) => !l.progress?.some((p) => p.completed)
      );
      const firstIncompleteLesson =
        firstIncomplete?.id ?? sorted[0]?.id ?? null;
      return { ...m, firstIncompleteLesson };
    });

    return NextResponse.json(
      {
        course: {
          ...course,
          modules: modulesWithResume,
          ratingAverage: agg._avg.rating ?? 0,
          ratingCount: agg._count.rating,
        },
        hasAccess,
        isStaffViewer,
        isExpired,
        enrollment,
        myReview,
        viewerWorkspace,
        overrides: { modules: releasedModules, lessons: releasedLessons },
        automationLocks,
        lastAccessedLesson,
      },
      {
        headers: {
          "Cache-Control":
            "private, max-age=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error("GET /api/courses/by-slug/[slug] error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar curso" },
      { status: 500 }
    );
  }
}

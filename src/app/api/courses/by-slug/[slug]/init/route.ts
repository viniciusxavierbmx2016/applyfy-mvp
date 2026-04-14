import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isEnrollmentActive } from "@/lib/auth";

const MENU_DEFAULTS = [
  { label: "Home", icon: "home", url: "/course/:slug", isDefault: true },
  {
    label: "Continuar assistindo",
    icon: "play",
    url: "/course/:slug#continue",
    isDefault: true,
  },
  {
    label: "Comunidade",
    icon: "message",
    url: "/course/:slug/community",
    isDefault: true,
  },
];

async function ensureMenuDefaults(courseId: string) {
  const count = await prisma.menuItem.count({
    where: { courseId, isDefault: true },
  });
  if (count >= MENU_DEFAULTS.length) return;
  for (let i = 0; i < MENU_DEFAULTS.length; i++) {
    const d = MENU_DEFAULTS[i];
    const exists = await prisma.menuItem.findFirst({
      where: { courseId, isDefault: true, label: d.label },
    });
    if (!exists) {
      await prisma.menuItem.create({
        data: { ...d, courseId, order: i },
      });
    }
  }
}

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  const t0 = Date.now();
  try {
    const user = await getCurrentUser();
    const t1 = Date.now();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const course = await prisma.course.findUnique({
      where: { slug: params.slug },
      include: {
        workspace: {
          select: { slug: true, name: true, logoUrl: true, ownerId: true },
        },
        sections: { orderBy: { order: "asc" } },
        modules: {
          orderBy: { order: "asc" },
          include: {
            lessons: {
              orderBy: { order: "asc" },
              include: {
                progress: { where: { userId: user.id } },
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

    await ensureMenuDefaults(course.id);

    const [
      enrollment,
      overrideRows,
      agg,
      myReview,
      menuItems,
      viewerWorkspace,
    ] = await Promise.all([
      prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId: course.id } },
      }),
      prisma.enrollmentOverride
        .findMany({
          where: {
            enrollment: { userId: user.id, courseId: course.id },
            released: true,
          },
          select: { moduleId: true, lessonId: true },
        })
        .catch(() => []),
      prisma.review.aggregate({
        where: { courseId: course.id },
        _avg: { rating: true },
        _count: { rating: true },
      }),
      prisma.review.findUnique({
        where: { userId_courseId: { userId: user.id, courseId: course.id } },
      }),
      prisma.menuItem.findMany({
        where: { courseId: course.id },
        orderBy: { order: "asc" },
      }),
      user.workspaceId
        ? prisma.workspace.findUnique({
            where: { id: user.workspaceId },
            select: { slug: true, name: true, logoUrl: true },
          })
        : Promise.resolve(null),
    ]);

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

    const releasedModules = overrideRows
      .filter((o) => o.moduleId)
      .map((o) => o.moduleId as string);
    const releasedLessons = overrideRows
      .filter((o) => o.lessonId)
      .map((o) => o.lessonId as string);

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

    const t2 = Date.now();
    console.log(
      `[API /api/courses/by-slug/${params.slug}/init] auth:${t1 - t0}ms query:${t2 - t1}ms total:${t2 - t0}ms`
    );

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
        lastAccessedLesson,
        menu: menuItems,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error(`GET /api/courses/by-slug/${params.slug}/init error:`, error);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}

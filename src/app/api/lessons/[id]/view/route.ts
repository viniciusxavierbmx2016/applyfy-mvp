import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  computeLessonReleaseWithOverride,
  computeModuleReleaseWithOverride,
  EMPTY_OVERRIDES,
  getCurrentUser,
  isEnrollmentActive,
  loadEnrollmentOverrides,
  type ReleaseOverrides,
} from "@/lib/auth";
import { parseVideoUrl } from "@/lib/video";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: params.id },
      include: {
        module: {
          include: {
            course: {
              include: {
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
            },
          },
        },
        progress: { where: { userId: user.id } },
      },
    });

    if (!lesson) {
      return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 });
    }

    const course = lesson.module.course;

    // Check enrollment (admins bypass)
    let enrollmentCreatedAt: Date | null = null;
    let overrides: ReleaseOverrides = EMPTY_OVERRIDES;
    if (user.role !== "ADMIN") {
      const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId: course.id } },
      });
      if (!isEnrollmentActive(enrollment)) {
        return NextResponse.json(
          {
            error:
              enrollment?.expiresAt && enrollment.expiresAt.getTime() < Date.now()
                ? "Seu acesso a este curso expirou"
                : "Você não está matriculado neste curso",
          },
          { status: 403 }
        );
      }
      enrollmentCreatedAt = enrollment!.createdAt;
      overrides = await loadEnrollmentOverrides(enrollment!.id);

      const release = computeLessonReleaseWithOverride(
        enrollmentCreatedAt,
        lesson.moduleId,
        lesson.id,
        lesson.module.daysToRelease,
        lesson.daysToRelease,
        overrides
      );
      if (!release.released) {
        return NextResponse.json(
          {
            error: `Este conteúdo será liberado em ${release.daysRemaining} dia${release.daysRemaining === 1 ? "" : "s"}`,
            releaseDate: release.releaseDate.toISOString(),
            daysRemaining: release.daysRemaining,
          },
          { status: 403 }
        );
      }
    }

    // Build flat ordered list of lessons across the course for prev/next
    const flat: Array<{
      id: string;
      title: string;
      moduleId: string;
    }> = [];
    for (const mod of course.modules) {
      for (const l of mod.lessons) {
        flat.push({ id: l.id, title: l.title, moduleId: mod.id });
      }
    }
    const currentIndex = flat.findIndex((l) => l.id === lesson.id);
    const prev = currentIndex > 0 ? flat[currentIndex - 1] : null;
    const next =
      currentIndex >= 0 && currentIndex < flat.length - 1
        ? flat[currentIndex + 1]
        : null;

    const video = parseVideoUrl(lesson.videoUrl);

    const viewerWorkspace = user.workspaceId
      ? await prisma.workspace.findUnique({
          where: { id: user.workspaceId },
          select: { slug: true, name: true, logoUrl: true },
        })
      : null;

    // Masked payload — never expose raw videoUrl
    return NextResponse.json({
      lesson: {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        moduleId: lesson.moduleId,
        video,
        completed: lesson.progress.some((p) => p.completed),
      },
      course: {
        id: course.id,
        slug: course.slug,
        title: course.title,
        modules: course.modules.map((m) => {
          const modRelease = computeModuleReleaseWithOverride(
            enrollmentCreatedAt,
            m.id,
            m.daysToRelease,
            overrides
          );
          return {
            id: m.id,
            title: m.title,
            thumbnailUrl: m.thumbnailUrl,
            locked: user.role === "ADMIN" ? false : !modRelease.released,
            releaseDate: modRelease.released ? null : modRelease.releaseDate.toISOString(),
            daysRemaining: modRelease.daysRemaining,
            lessons: m.lessons.map((l) => {
              const lr = computeLessonReleaseWithOverride(
                enrollmentCreatedAt,
                m.id,
                l.id,
                m.daysToRelease,
                l.daysToRelease,
                overrides
              );
              return {
                id: l.id,
                title: l.title,
                completed: l.progress.some((p) => p.completed),
                locked: user.role === "ADMIN" ? false : !lr.released,
                releaseDate: lr.released ? null : lr.releaseDate.toISOString(),
                daysRemaining: lr.daysRemaining,
              };
            }),
          };
        }),
      },
      prev: prev ? { id: prev.id, title: prev.title } : null,
      next: next ? { id: next.id, title: next.title } : null,
      viewerWorkspace,
    });
  } catch (error) {
    console.error("GET lesson view error:", error);
    return NextResponse.json(
      { error: "Erro ao carregar aula" },
      { status: 500 }
    );
  }
}

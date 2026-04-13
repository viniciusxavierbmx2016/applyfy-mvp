import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const LIMIT = 5;

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    if (q.length < 2) {
      return NextResponse.json({ courses: [], lessons: [], posts: [] });
    }

    const isAdmin = user.role === "ADMIN";

    let accessibleCourseIds: string[] | null = null;
    if (!isAdmin) {
      const enrollments = await prisma.enrollment.findMany({
        where: { userId: user.id, status: "ACTIVE" },
        select: { courseId: true },
      });
      accessibleCourseIds = enrollments.map((e) => e.courseId);
    }

    const courses = await prisma.course.findMany({
      where: {
        isPublished: true,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, title: true, slug: true, thumbnail: true },
      take: LIMIT,
      orderBy: { createdAt: "desc" },
    });

    const skipContent =
      !isAdmin && (accessibleCourseIds?.length ?? 0) === 0;

    const lessons = skipContent
      ? []
      : await prisma.lesson.findMany({
          where: {
            title: { contains: q, mode: "insensitive" },
            ...(isAdmin
              ? {}
              : {
                  module: { courseId: { in: accessibleCourseIds! } },
                }),
          },
          select: {
            id: true,
            title: true,
            module: {
              select: {
                course: { select: { slug: true, title: true } },
              },
            },
          },
          take: LIMIT,
          orderBy: { order: "asc" },
        });

    const posts = skipContent
      ? []
      : await prisma.post.findMany({
          where: {
            content: { contains: q, mode: "insensitive" },
            ...(isAdmin
              ? {}
              : { courseId: { in: accessibleCourseIds! } }),
          },
          select: {
            id: true,
            content: true,
            createdAt: true,
            user: { select: { name: true } },
            course: { select: { slug: true, title: true } },
          },
          take: LIMIT,
          orderBy: { createdAt: "desc" },
        });

    return NextResponse.json({
      courses: courses.map((c) => ({
        id: c.id,
        title: c.title,
        slug: c.slug,
        thumbnail: c.thumbnail,
      })),
      lessons: lessons.map((l) => ({
        id: l.id,
        title: l.title,
        courseSlug: l.module.course.slug,
        courseTitle: l.module.course.title,
      })),
      posts: posts.map((p) => ({
        id: p.id,
        snippet: p.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 120),
        authorName: p.user.name,
        courseSlug: p.course.slug,
        courseTitle: p.course.title,
      })),
    });
  } catch (error) {
    console.error("GET /api/search error:", error);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}

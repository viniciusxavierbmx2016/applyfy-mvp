import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { GAMIFICATION, getLevelForPoints } from "@/lib/utils";
import { PostType } from "@prisma/client";

const VALID_TYPES: PostType[] = ["QUESTION", "RESULT", "FEEDBACK", "FREE"];

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const courseSlug = searchParams.get("courseSlug");
    const courseId = searchParams.get("courseId");

    if (!courseSlug && !courseId) {
      return NextResponse.json(
        { error: "courseSlug ou courseId é obrigatório" },
        { status: 400 }
      );
    }

    const course = courseId
      ? await prisma.course.findUnique({ where: { id: courseId } })
      : await prisma.course.findUnique({ where: { slug: courseSlug! } });

    if (!course) {
      return NextResponse.json(
        { error: "Curso não encontrado" },
        { status: 404 }
      );
    }

    // Access: admin bypass, else must be enrolled
    if (user.role !== "ADMIN") {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: { userId: user.id, courseId: course.id },
        },
      });
      if (!enrollment || enrollment.status !== "ACTIVE") {
        return NextResponse.json(
          { error: "Não matriculado neste curso" },
          { status: 403 }
        );
      }
    }

    const posts = await prisma.post.findMany({
      where: { courseId: course.id },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, role: true } },
        likes: { where: { userId: user.id }, select: { id: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    const withLiked = posts.map((p) => ({
      id: p.id,
      content: p.content,
      type: p.type,
      pinned: p.pinned,
      createdAt: p.createdAt,
      user: p.user,
      liked: p.likes.length > 0,
      likeCount: p._count.likes,
      commentCount: p._count.comments,
    }));

    return NextResponse.json({
      posts: withLiked,
      course: { id: course.id, slug: course.slug, title: course.title },
    });
  } catch (error) {
    console.error("GET /api/posts error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar posts" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { content, type, courseId, courseSlug } = await request.json();
    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { error: "Conteúdo obrigatório" },
        { status: 400 }
      );
    }
    const postType = VALID_TYPES.includes(type) ? (type as PostType) : "FREE";

    const course = courseId
      ? await prisma.course.findUnique({ where: { id: courseId } })
      : courseSlug
        ? await prisma.course.findUnique({ where: { slug: courseSlug } })
        : null;

    if (!course) {
      return NextResponse.json(
        { error: "Curso não encontrado" },
        { status: 404 }
      );
    }

    if (user.role !== "ADMIN") {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: { userId: user.id, courseId: course.id },
        },
      });
      if (!enrollment || enrollment.status !== "ACTIVE") {
        return NextResponse.json(
          { error: "Não matriculado neste curso" },
          { status: 403 }
        );
      }
    }

    const post = await prisma.post.create({
      data: {
        content: content.trim(),
        type: postType,
        userId: user.id,
        courseId: course.id,
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, role: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    // +5 points, update level
    const newPoints = user.points + GAMIFICATION.POINTS.CREATE_POST;
    const newLevel = getLevelForPoints(newPoints).level;
    const leveledUp = newLevel > user.level;
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { points: newPoints, level: newLevel },
    });

    return NextResponse.json(
      {
        post: {
          id: post.id,
          content: post.content,
          type: post.type,
          pinned: post.pinned,
          createdAt: post.createdAt,
          user: post.user,
          liked: false,
          likeCount: 0,
          commentCount: 0,
        },
        pointsAwarded: GAMIFICATION.POINTS.CREATE_POST,
        leveledUp,
        user: { points: updated.points, level: updated.level },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/posts error:", error);
    return NextResponse.json({ error: "Erro ao criar post" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { collaboratorCanActOnCourse } from "@/lib/collaborator";
import { GAMIFICATION, getLevelForPoints } from "@/lib/utils";
import { sanitizeHtml, stripHtml } from "@/lib/sanitize-html";
import { PostType } from "@prisma/client";
import { ensureDefaultGroup } from "@/lib/community-helpers";
import { createNotification } from "@/lib/notifications";
import { sendPushToUser } from "@/lib/push-send";

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
      ? await prisma.course.findUnique({
          where: { id: courseId },
          include: { workspace: { select: { ownerId: true } } },
        })
      : await prisma.course.findUnique({
          where: { slug: courseSlug! },
          include: { workspace: { select: { ownerId: true } } },
        });

    if (!course) {
      return NextResponse.json(
        { error: "Curso não encontrado" },
        { status: 404 }
      );
    }

    if (!course.communityEnabled) {
      return NextResponse.json(
        { error: "Comunidade desativada neste curso" },
        { status: 403 }
      );
    }

    const isStaffOwner =
      user.role === "ADMIN" ||
      (user.role === "PRODUCER" &&
        (course.ownerId === user.id ||
          course.workspace.ownerId === user.id));
    let collabAllowed = false;
    if (!isStaffOwner && user.role === "COLLABORATOR") {
      collabAllowed = await collaboratorCanActOnCourse(user.id, course.id, [
        "MANAGE_COMMUNITY",
        "REPLY_COMMENTS",
      ]);
    }
    if (!isStaffOwner && !collabAllowed) {
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

    await ensureDefaultGroup(course.id);

    const groupId = searchParams.get("groupId");
    const staff = isStaffOwner || collabAllowed;

    const postWhere: Record<string, unknown> = { courseId: course.id };
    if (groupId) {
      postWhere.groupId = groupId;
    }
    if (!staff) {
      postWhere.OR = [
        { status: "APPROVED" },
        { status: "PENDING", userId: user.id },
      ];
    }

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10", 10) || 10));

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: postWhere,
        orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          content: true,
          type: true,
          pinned: true,
          status: true,
          createdAt: true,
          user: { select: { id: true, name: true, avatarUrl: true, role: true } },
          group: { select: { id: true, name: true, slug: true, permission: true } },
          likes: { where: { userId: user.id }, select: { id: true } },
          _count: {
            select: {
              likes: true,
              comments: { where: { status: "APPROVED" } },
            },
          },
        },
      }),
      prisma.post.count({ where: postWhere }),
    ]);

    const withLiked = posts.map((p) => ({
      id: p.id,
      content: p.content,
      type: p.type,
      pinned: p.pinned,
      status: p.status,
      createdAt: p.createdAt,
      user: p.user,
      group: p.group,
      liked: p.likes.length > 0,
      likeCount: p._count.likes,
      commentCount: p._count.comments,
    }));

    return NextResponse.json({
      posts: withLiked,
      total,
      hasMore: total > page * limit,
      course: { id: course.id, slug: course.slug, title: course.title },
      isStaffViewer: isStaffOwner,
    });
  } catch (error) {
    const details =
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : error;
    console.error("GET /api/posts error:", details);
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

    const { content, type, courseId, courseSlug, groupId } = await request.json();
    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Conteúdo obrigatório" },
        { status: 400 }
      );
    }
    const sanitized = sanitizeHtml(content);
    if (!stripHtml(sanitized)) {
      return NextResponse.json(
        { error: "Conteúdo obrigatório" },
        { status: 400 }
      );
    }
    if (sanitized.length > 20000) {
      return NextResponse.json(
        { error: "Conteúdo muito longo" },
        { status: 400 }
      );
    }
    const postType = VALID_TYPES.includes(type) ? (type as PostType) : "FREE";

    const course = courseId
      ? await prisma.course.findUnique({
          where: { id: courseId },
          include: { workspace: { select: { ownerId: true } } },
        })
      : courseSlug
        ? await prisma.course.findUnique({
            where: { slug: courseSlug },
            include: { workspace: { select: { ownerId: true } } },
          })
        : null;

    if (!course) {
      return NextResponse.json(
        { error: "Curso não encontrado" },
        { status: 404 }
      );
    }

    if (!course.communityEnabled) {
      return NextResponse.json(
        { error: "Comunidade desativada neste curso" },
        { status: 403 }
      );
    }

    const isStaffOwner =
      user.role === "ADMIN" ||
      (user.role === "PRODUCER" &&
        (course.ownerId === user.id ||
          course.workspace.ownerId === user.id));
    let collabAllowed = false;
    if (!isStaffOwner && user.role === "COLLABORATOR") {
      collabAllowed = await collaboratorCanActOnCourse(user.id, course.id, [
        "MANAGE_COMMUNITY",
        "REPLY_COMMENTS",
      ]);
    }
    if (!isStaffOwner && !collabAllowed) {
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

    let finalGroupId: string | null = null;
    if (groupId) {
      const group = await prisma.communityGroup.findUnique({
        where: { id: groupId },
      });
      if (!group || group.courseId !== course.id) {
        return NextResponse.json(
          { error: "Grupo não encontrado" },
          { status: 404 }
        );
      }
      if (group.permission === "READ_ONLY" && !isStaffOwner && !collabAllowed) {
        return NextResponse.json(
          { error: "Este grupo é somente leitura" },
          { status: 403 }
        );
      }
      finalGroupId = group.id;
    } else {
      const defaultGroup = await ensureDefaultGroup(course.id);
      finalGroupId = defaultGroup.id;
    }

    const staff = isStaffOwner || collabAllowed;
    const moderationOn = course.communityModerationEnabled;
    const postStatus = !moderationOn || staff ? "APPROVED" : "PENDING";

    const post = await prisma.post.create({
      data: {
        content: sanitized,
        type: postType,
        userId: user.id,
        courseId: course.id,
        groupId: finalGroupId,
        status: postStatus,
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, role: true } },
        group: { select: { id: true, name: true, slug: true, permission: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    let pointsAwarded = 0;
    let leveledUp = false;
    let finalPoints = user.points;
    let finalLevel = user.level;
    if (postStatus === "APPROVED" && course.gamificationEnabled) {
      const newPoints = user.points + GAMIFICATION.POINTS.CREATE_POST;
      const newLevel = getLevelForPoints(newPoints).level;
      leveledUp = newLevel > user.level;
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { points: newPoints, level: newLevel },
      });
      pointsAwarded = GAMIFICATION.POINTS.CREATE_POST;
      finalPoints = updated.points;
      finalLevel = updated.level;
    }

    if (postStatus === "PENDING") {
      const link = `/producer/community`;
      await createNotification({
        userId: course.workspace.ownerId,
        type: "COMMENT",
        message: `Novo post aguardando aprovação na comunidade`,
        link,
        actorId: user.id,
      });
      sendPushToUser(course.workspace.ownerId, {
        title: "Novo conteúdo para moderar",
        body: `Post de ${user.name} na comunidade aguarda aprovação`,
        url: link,
        tag: "moderation",
      }).catch(() => {});
    }

    return NextResponse.json(
      {
        post: {
          id: post.id,
          content: post.content,
          type: post.type,
          pinned: post.pinned,
          status: post.status,
          createdAt: post.createdAt,
          user: post.user,
          group: post.group,
          liked: false,
          likeCount: 0,
          commentCount: 0,
        },
        pointsAwarded,
        leveledUp,
        user: { points: finalPoints, level: finalLevel },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/posts error:", error);
    return NextResponse.json({ error: "Erro ao criar post" }, { status: 500 });
  }
}

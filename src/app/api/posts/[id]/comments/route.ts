import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { collaboratorCanActOnCourse } from "@/lib/collaborator";
import { createNotification } from "@/lib/notifications";
import { sendPushToUser } from "@/lib/push-send";
import { createCommentSchema, validateBody } from "@/lib/validations";

async function checkAccess(userId: string, userRole: string, post: { courseId: string; course: { ownerId: string | null; workspace: { ownerId: string } } }) {
  if (userRole === "ADMIN") return true;
  if (userRole === "PRODUCER" && (post.course.ownerId === userId || post.course.workspace.ownerId === userId)) return true;
  // C6: always try the collaborator path. collaboratorCanActOnCourse itself
  // looks up an ACCEPTED Collaborator row + permission + course scope, so it
  // returns false when there's no row (e.g., student without collab elevation).
  // Removes the redundant role-gate that excluded STUDENT-with-Collaborator.
  const allowed = await collaboratorCanActOnCourse(userId, post.courseId, ["REPLY_COMMENTS", "MANAGE_COMMUNITY"]);
  if (allowed) return true;
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: post.courseId } },
  });
  return enrollment?.status === "ACTIVE";
}

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const post = await prisma.post.findUnique({
      where: { id: params.id },
      include: {
        course: { select: { ownerId: true, workspace: { select: { ownerId: true } } } },
      },
    });
    if (!post) {
      return NextResponse.json({ error: "Post não encontrado" }, { status: 404 });
    }

    if (!(await checkAccess(user.id, user.role, post))) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const userSelect = { id: true, name: true, avatarUrl: true, role: true };
    const staff = isStaff(user);

    const statusFilter = staff
      ? undefined
      : {
          OR: [
            { status: "APPROVED" as const },
            { status: "PENDING" as const, userId: user.id },
          ],
        };

    const comments = await prisma.comment.findMany({
      where: {
        postId: post.id,
        parentId: null,
        ...statusFilter,
      },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: userSelect },
        replies: {
          where: staff
            ? undefined
            : {
                OR: [
                  { status: "APPROVED" },
                  { status: "PENDING", userId: user.id },
                ],
              },
          orderBy: { createdAt: "asc" },
          include: { user: { select: userSelect } },
        },
      },
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error("GET comments error:", error);
    return NextResponse.json({ error: "Erro ao buscar comentários" }, { status: 500 });
  }
}

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const v = validateBody(createCommentSchema, body);
    if (!v.success) return v.error;
    const { content, parentId } = v.data;
    if (!content.trim()) {
      return NextResponse.json({ error: "Conteúdo obrigatório" }, { status: 400 });
    }

    const post = await prisma.post.findUnique({
      where: { id: params.id },
      include: {
        course: {
          select: {
            slug: true,
            ownerId: true,
            communityModerationEnabled: true,
            workspaceId: true,
            workspace: { select: { ownerId: true } },
          },
        },
      },
    });
    if (!post) {
      return NextResponse.json({ error: "Post não encontrado" }, { status: 404 });
    }

    if (post.status !== "APPROVED") {
      return NextResponse.json({ error: "Post aguardando aprovação" }, { status: 403 });
    }

    if (!(await checkAccess(user.id, user.role, post))) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    let validParentId: string | null = null;
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { id: true, postId: true, userId: true, parentId: true, status: true },
      });
      if (!parentComment || parentComment.postId !== post.id) {
        return NextResponse.json({ error: "Comentário pai inválido" }, { status: 400 });
      }
      if (parentComment.status !== "APPROVED") {
        return NextResponse.json({ error: "Não é possível responder a um comentário pendente" }, { status: 403 });
      }
      validParentId = parentComment.parentId || parentComment.id;
    }

    const staff = isStaff(user);
    const moderationOn = post.course.communityModerationEnabled;
    const commentStatus = !moderationOn || staff ? "APPROVED" : "PENDING";

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        userId: user.id,
        postId: post.id,
        parentId: validParentId,
        status: commentStatus,
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, role: true } },
      },
    });

    if (commentStatus === "APPROVED") {
      if (post.userId !== user.id) {
        await createNotification({
          userId: post.userId,
          type: "COMMENT",
          message: `${user.name} comentou no seu post`,
          link: `/course/${post.course.slug}/community`,
          actorId: user.id,
        });
      }
      if (validParentId) {
        const parentComment = await prisma.comment.findUnique({
          where: { id: validParentId },
          select: { userId: true },
        });
        if (parentComment && parentComment.userId !== user.id && parentComment.userId !== post.userId) {
          await createNotification({
            userId: parentComment.userId,
            type: "REPLY",
            message: `${user.name} respondeu ao seu comentário`,
            link: `/course/${post.course.slug}/community`,
            actorId: user.id,
          });
        }
      }
    }

    if (commentStatus === "PENDING") {
      const moderationLink = `/producer/community`;
      await createNotification({
        userId: post.course.workspace.ownerId,
        type: "COMMENT",
        message: `Novo comentário aguardando aprovação na comunidade`,
        link: moderationLink,
        actorId: user.id,
      });
      sendPushToUser(post.course.workspace.ownerId, {
        title: "Novo conteúdo para moderar",
        body: `Comentário de ${user.name} na comunidade aguarda aprovação`,
        url: moderationLink,
        tag: "moderation",
      }).catch(() => {});
    }

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("POST comments error:", error);
    return NextResponse.json({ error: "Erro ao comentar" }, { status: 500 });
  }
}

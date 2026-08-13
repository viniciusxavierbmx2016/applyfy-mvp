import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { sendPushToUser } from "@/lib/push-send";
import { isCourseStaffOwner } from "@/lib/auth";
import { createLessonCommentSchema, validateBody } from "@/lib/validations";

async function collaboratorAllowed(
  userId: string,
  courseId: string,
  permissionNeeded: "REPLY_COMMENTS" | "MANAGE_COMMUNITY" = "REPLY_COMMENTS"
) {
  const c = await prisma.collaborator.findFirst({
    where: { userId, status: "ACCEPTED" },
    select: { workspaceId: true, permissions: true, courseIds: true },
  });
  if (!c) return false;
  if (
    !c.permissions.includes(permissionNeeded) &&
    !c.permissions.includes("MANAGE_COMMUNITY")
  )
    return false;
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { workspaceId: true },
  });
  if (!course || course.workspaceId !== c.workspaceId) return false;
  if (c.courseIds.length === 0) return true;
  return c.courseIds.includes(courseId);
}

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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
              select: {
                ownerId: true,
                workspace: { select: { ownerId: true } },
              },
            },
          },
        },
      },
    });
    if (!lesson) {
      return NextResponse.json(
        { error: "Aula não encontrada" },
        { status: 404 }
      );
    }

    // Era `user.role !== "ADMIN" && user.role !== "PRODUCER"`: QUALQUER produtor
    // da plataforma pulava a checagem de escopo inteira e lia os comentários de
    // qualquer aula de qualquer curso. Agora só o dono deste curso/workspace (e
    // o ADMIN) tem o atalho; os demais seguem pelo vínculo ou pela matrícula.
    if (!isCourseStaffOwner(user, lesson.module.course)) {
      // C6: drop role gate — helper returns false when there's no
      // ACCEPTED Collaborator row.
      const allowed = await collaboratorAllowed(
        user.id,
        lesson.module.courseId
      );
      if (!allowed) {
        const enrollment = await prisma.enrollment.findUnique({
          where: {
            userId_courseId: {
              userId: user.id,
              courseId: lesson.module.courseId,
            },
          },
        });
        if (!enrollment || enrollment.status !== "ACTIVE") {
          return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
        }
      }
    }

    // Quem LÊ comentário PENDING alheio. Era `isStaff(user)` puro — role global,
    // e ainda por cima cego ao colaborador do próprio workspace (que no POST
    // logo abaixo JÁ contava como staff). Agora é o mesmo par das duas outras
    // rotas de comentário: dono deste curso, ou vínculo com permissão nele.
    const staff =
      isCourseStaffOwner(user, lesson.module.course) ||
      (await collaboratorAllowed(user.id, lesson.module.courseId));

    const statusFilter = staff
      ? undefined
      : {
          OR: [
            { status: "APPROVED" as const },
            { status: "PENDING" as const, userId: user.id },
          ],
        };

    const comments = await prisma.lessonComment.findMany({
      where: {
        lessonId: lesson.id,
        parentId: null,
        ...statusFilter,
      },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, role: true } },
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
          include: {
            user: { select: { id: true, name: true, avatarUrl: true, role: true } },
          },
        },
      },
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error("GET lesson comments error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar comentários" },
      { status: 500 }
    );
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
    const v = validateBody(createLessonCommentSchema, body);
    if (!v.success) return v.error;
    const { content, parentId } = v.data;
    if (!content.trim()) {
      return NextResponse.json(
        { error: "Conteúdo obrigatório" },
        { status: 400 }
      );
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: params.id },
      include: {
        module: {
          include: {
            course: {
              select: {
                lessonCommentsEnabled: true,
                lessonCommentsModerationEnabled: true,
                slug: true,
                workspaceId: true,
                ownerId: true,
                workspace: { select: { ownerId: true } },
              },
            },
          },
        },
      },
    });
    if (!lesson) {
      return NextResponse.json(
        { error: "Aula não encontrada" },
        { status: 404 }
      );
    }

    if (!lesson.module.course.lessonCommentsEnabled) {
      return NextResponse.json(
        { error: "Comentários desativados neste curso" },
        { status: 403 }
      );
    }

    // Espelho do gate do GET: o atalho é do dono deste curso/workspace e do
    // ADMIN, não de qualquer produtor da plataforma.
    if (!isCourseStaffOwner(user, lesson.module.course)) {
      // C6: drop role gate — helper returns false when there's no
      // ACCEPTED Collaborator row.
      const allowed = await collaboratorAllowed(
        user.id,
        lesson.module.courseId
      );
      if (!allowed) {
        const enrollment = await prisma.enrollment.findUnique({
          where: {
            userId_courseId: {
              userId: user.id,
              courseId: lesson.module.courseId,
            },
          },
        });
        if (!enrollment || enrollment.status !== "ACTIVE") {
          return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
        }
      }
    }

    if (parentId) {
      const parent = await prisma.lessonComment.findUnique({
        where: { id: parentId },
        select: { lessonId: true, status: true },
      });
      if (!parent || parent.lessonId !== lesson.id) {
        return NextResponse.json(
          { error: "Comentário pai inválido" },
          { status: 400 }
        );
      }
      if (parent.status !== "APPROVED") {
        return NextResponse.json(
          { error: "Não é possível responder a um comentário pendente" },
          { status: 403 }
        );
      }
    }

    // Quem PULA a moderação. Mesma troca: `isStaff` global → dono deste curso.
    const staff =
      isCourseStaffOwner(user, lesson.module.course) ||
      (await collaboratorAllowed(user.id, lesson.module.courseId));
    const moderationOn = lesson.module.course.lessonCommentsModerationEnabled;
    const commentStatus = !moderationOn || staff ? "APPROVED" : "PENDING";

    const comment = await prisma.lessonComment.create({
      data: {
        content: content.trim(),
        userId: user.id,
        lessonId: lesson.id,
        parentId: parentId || null,
        status: commentStatus,
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, role: true } },
      },
    });

    if (commentStatus === "APPROVED") {
      const previousCommenters = await prisma.lessonComment.findMany({
        where: {
          lessonId: lesson.id,
          userId: { not: user.id },
          id: { not: comment.id },
          status: "APPROVED",
        },
        distinct: ["userId"],
        select: { userId: true },
      });
      const link = `/course/${lesson.module.course.slug}/lesson/${lesson.id}`;
      await Promise.all(
        previousCommenters.map((c) =>
          createNotification({
            userId: c.userId,
            workspaceId: lesson.module.course.workspaceId,
            type: "REPLY",
            message: `${user.name} comentou na aula ${lesson.title}`,
            link,
            actorId: user.id,
          })
        )
      );
    }

    if (commentStatus === "PENDING") {
      const workspace = await prisma.workspace.findUnique({
        where: { id: lesson.module.course.workspaceId },
        select: { ownerId: true },
      });
      if (workspace) {
        const link = `/producer/courses/${lesson.module.courseId}/comments`;
        await createNotification({
          userId: workspace.ownerId,
          workspaceId: lesson.module.course.workspaceId,
          type: "COMMENT",
          message: `Novo comentário aguardando aprovação na aula ${lesson.title}`,
          link,
          actorId: user.id,
        });
        sendPushToUser(
          workspace.ownerId,
          {
            title: "Novo conteúdo para moderar",
            body: `Comentário de ${user.name} em ${lesson.title} aguarda aprovação`,
            url: link,
            tag: "moderation",
          },
          lesson.module.course.workspaceId
        ).catch(() => {});
      }
    }

    if (commentStatus === "APPROVED" && !staff) {
      try {
        const workspace = await prisma.workspace.findFirst({
          where: { id: lesson.module.course.workspaceId },
          select: { ownerId: true },
        });
        if (workspace?.ownerId && workspace.ownerId !== user.id) {
          const courseSlug = lesson.module.course.slug;
          const link = `/course/${courseSlug}/lesson/${lesson.id}`;
          await createNotification({
            userId: workspace.ownerId,
            workspaceId: lesson.module.course.workspaceId,
            type: "COMMENT",
            message: `${user.name || "Um aluno"} comentou na aula "${lesson.title}"`,
            link,
            actorId: user.id,
          });
          sendPushToUser(
            workspace.ownerId,
            {
              title: "Novo comentário",
              body: `${user.name || "Um aluno"} comentou na aula "${lesson.title}"`,
              url: link,
              tag: "comment",
            },
            lesson.module.course.workspaceId
          ).catch(() => {});
        }
      } catch {}
    }

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("POST lesson comments error:", error);
    return NextResponse.json({ error: "Erro ao comentar" }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get("commentId");
    if (!commentId) {
      return NextResponse.json({ error: "commentId obrigatório" }, { status: 400 });
    }

    const comment = await prisma.lessonComment.findUnique({
      where: { id: commentId },
      include: {
        lesson: {
          include: {
            module: {
              include: {
                course: {
                  select: {
                    ownerId: true,
                    workspace: { select: { ownerId: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!comment || comment.lessonId !== params.id) {
      return NextResponse.json({ error: "Comentário não encontrado" }, { status: 404 });
    }

    // Era `if (user.role === "PRODUCER") isStaffAllowed = true` — INCONDICIONAL:
    // qualquer produtor da plataforma apagava qualquer comentário de qualquer
    // aula de qualquer curso. Destrutivo e cross-tenant; o pior dos pontos desta
    // família, e o único que não estava no mapa do comando. Mesmo predicado dos
    // outros dois handlers agora.
    const isOwner = comment.userId === user.id;
    // C6: drop role gate — helper returns false when there's no
    // ACCEPTED Collaborator row.
    const isStaffAllowed =
      isCourseStaffOwner(user, comment.lesson.module.course) ||
      (await collaboratorAllowed(user.id, comment.lesson.module.courseId));

    if (!isOwner && !isStaffAllowed) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    await prisma.lessonComment.deleteMany({
      where: { OR: [{ id: commentId }, { parentId: commentId }] },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE lesson comment error:", error);
    return NextResponse.json({ error: "Erro ao excluir" }, { status: 500 });
  }
}

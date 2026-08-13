import { NextResponse } from "next/server";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isCourseStaffOwner } from "@/lib/auth";
import { collaboratorCanActOnCourse } from "@/lib/collaborator";
import { createNotification } from "@/lib/notifications";
import { sendPushToUser } from "@/lib/push-send";
import { createCommentSchema, validateBody } from "@/lib/validations";
import { hasPostContent } from "@/lib/sanitize-html";

// `isCourseStaffOwner` mora em @/lib/auth, ao lado do `isStaff` que ele
// substitui — a segunda superfície (comentário de AULA) precisou do mesmo
// predicado, e duas cópias do MESMO nome foi exatamente o que criou o no-op do
// 9.63. Um lugar só, e visível de onde a escolha errada é feita.

// Recebe o usuário inteiro (era `userId: string, userRole: string`): o `role`
// solto é `string` e não casa com o enum `Role` que o helper compartilhado
// exige — e passar o objeto é o que impede alguém de montar um `{role}` que o
// banco nunca produziria.
async function checkAccess(
  user: Pick<User, "id" | "role">,
  post: { courseId: string; course: { ownerId: string | null; workspace: { ownerId: string } } }
) {
  if (isCourseStaffOwner(user, post.course)) return true;
  // C6: always try the collaborator path. collaboratorCanActOnCourse itself
  // looks up an ACCEPTED Collaborator row + permission + course scope, so it
  // returns false when there's no row (e.g., student without collab elevation).
  // Removes the redundant role-gate that excluded STUDENT-with-Collaborator.
  // ENTRADA (ler/escrever comentário como membro) — exige ACCESS_MEMBER_AREA.
  // ⚠️ Os dois `staff` mais abaixo NÃO recebem a exigência de propósito: decidem
  // MODERAÇÃO (ler PENDING alheio e pular a fila), que a opção B manteve com
  // MANAGE_COMMUNITY/REPLY_COMMENTS sozinhos.
  const allowed = await collaboratorCanActOnCourse(
    user.id,
    post.courseId,
    ["REPLY_COMMENTS", "MANAGE_COMMUNITY"],
    { requireMemberAccess: true }
  );
  if (allowed) return true;
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: post.courseId } },
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

    if (!(await checkAccess(user, post))) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const userSelect = { id: true, name: true, avatarUrl: true, role: true };
    // `staff` aqui decide quem LÊ comentário PENDING alheio. Era `isStaff(user)`
    // — role GLOBAL: qualquer PRODUCER da plataforma matriculado neste curso
    // como aluno lia a fila de moderação inteira (61 matrículas assim medidas em
    // produção, ago/26). Agora é vínculo com ESTE curso.
    const staff =
      isCourseStaffOwner(user, post.course) ||
      (await collaboratorCanActOnCourse(user.id, post.courseId, ["REPLY_COMMENTS", "MANAGE_COMMUNITY"]));

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
    // ⚠️ A régua de conteúdo (9.54) NÃO fica mais aqui: rodava antes de
    // qualquer autorização, então comentário vazio em grupo somente-leitura
    // respondia 400 "Conteúdo obrigatório" — ensinando ao aluno que o problema
    // era o texto, quando ele nem podia comentar. Autorização primeiro; a régua
    // desceu para depois do gate de grupo.

    const post = await prisma.post.findUnique({
      where: { id: params.id },
      include: {
        group: { select: { permission: true } },
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

    if (!(await checkAccess(user, post))) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    // `staff` subiu para cá (era calculado depois do parentId) porque agora
    // decide DUAS coisas: quem contribui em grupo somente-leitura e quem pula a
    // moderação. Uma conta só, nenhuma consulta a mais.
    const staff =
      isCourseStaffOwner(user, post.course) ||
      (await collaboratorCanActOnCourse(user.id, post.courseId, ["REPLY_COMMENTS", "MANAGE_COMMUNITY"]));

    // GRUPO SOMENTE-LEITURA — a parede que faltava. O composer de POST já era
    // gateado no servidor (posts/route.ts:259 e :273), mas comentário e
    // resposta não: o aluno era barrado só pela UI, e um POST direto na API
    // passava (§13 — esconder não é gate). Mesmo predicado e MESMA mensagem do
    // post, para o aluno ler a mesma frase nas duas superfícies.
    //
    // `groupId` nulo NÃO é tratado como o ramo `else` de posts/route.ts: lá o
    // grupo padrão é RESOLVIDO porque o post está nascendo e vai cair nele;
    // aqui o post já existe e simplesmente não pertence a grupo nenhum — logo
    // não há permissão de grupo a aplicar. (Medido em produção: 0 de 30 posts
    // sem grupo.) E `ensureDefaultGroup` ESCREVE — criar grupo como efeito
    // colateral de um comentário seria pior que o problema.
    if (post.group?.permission === "READ_ONLY" && !staff) {
      return NextResponse.json({ error: "Este grupo é somente leitura" }, { status: 403 });
    }

    // 9.54 — espelho da régua do post (posts/route.ts:179): texto OU <img> que
    // sobrevive à allowlist conta como conteúdo; <p></p> cru deixa de passar.
    // O que é PERSISTIDO não muda aqui (sanitize-na-escrita = 9.24, item próprio).
    if (!hasPostContent(content)) {
      return NextResponse.json({ error: "Conteúdo obrigatório" }, { status: 400 });
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

    // `staff` (calculado acima) é quem PULA a moderação — comentário nasce
    // APPROVED. Com o `isStaff` global de antes, um produtor de outro workspace
    // publicava direto na comunidade de quem só o tem como aluno (9.67).
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
          workspaceId: post.course.workspaceId,
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
            workspaceId: post.course.workspaceId,
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
        workspaceId: post.course.workspaceId,
        type: "COMMENT",
        message: `Novo comentário aguardando aprovação na comunidade`,
        link: moderationLink,
        actorId: user.id,
      });
      sendPushToUser(
        post.course.workspace.ownerId,
        {
          title: "Novo conteúdo para moderar",
          body: `Comentário de ${user.name} na comunidade aguarda aprovação`,
          url: moderationLink,
          tag: "moderation",
        },
        post.course.workspaceId
      ).catch(() => {});
    }

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("POST comments error:", error);
    return NextResponse.json({ error: "Erro ao comentar" }, { status: 500 });
  }
}

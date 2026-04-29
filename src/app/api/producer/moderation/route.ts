import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { resolveStaffWorkspace } from "@/lib/workspace";
import { createNotification } from "@/lib/notifications";
import { GAMIFICATION, getLevelForPoints } from "@/lib/utils";
import { moderateSchema, validateBody } from "@/lib/validations";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const staff = await requireStaff();
    const { workspace } = await resolveStaffWorkspace(staff);

    const body = await request.json();
    const v = validateBody(moderateSchema, body);
    if (!v.success) return v.error;
    const { items, action } = v.data;

    const newStatus = action === "approve" ? "APPROVED" : "REJECTED";
    let updated = 0;

    for (const item of items) {
      const { type, id } = item as { type: string; id: string };

      if (type === "lesson_comment") {
        const comment = await prisma.lessonComment.findUnique({
          where: { id },
          include: {
            lesson: {
              include: {
                module: {
                  include: {
                    course: {
                      select: { workspaceId: true, slug: true, gamificationEnabled: true },
                    },
                  },
                },
              },
            },
          },
        });
        if (!comment || comment.status !== "PENDING") continue;
        if (workspace && comment.lesson.module.course.workspaceId !== workspace.id) continue;

        await prisma.lessonComment.update({
          where: { id },
          data: { status: newStatus },
        });
        updated++;

        if (newStatus === "APPROVED") {
          await createNotification({
            userId: comment.userId,
            type: "COMMENT",
            message: "Seu comentário foi aprovado",
            link: `/course/${comment.lesson.module.course.slug}/lesson/${comment.lessonId}`,
          });
        } else {
          await createNotification({
            userId: comment.userId,
            type: "COMMENT",
            message: "Seu comentário não foi aprovado",
          });
        }
      } else if (type === "community_comment") {
        const comment = await prisma.comment.findUnique({
          where: { id },
          include: {
            post: {
              include: {
                course: {
                  select: { workspaceId: true, slug: true },
                },
              },
            },
          },
        });
        if (!comment || comment.status !== "PENDING") continue;
        if (workspace && comment.post.course.workspaceId !== workspace.id) continue;

        await prisma.comment.update({
          where: { id },
          data: { status: newStatus },
        });
        updated++;

        if (newStatus === "APPROVED") {
          await createNotification({
            userId: comment.userId,
            type: "COMMENT",
            message: "Seu comentário na comunidade foi aprovado",
            link: `/course/${comment.post.course.slug}/community`,
          });
        } else {
          await createNotification({
            userId: comment.userId,
            type: "COMMENT",
            message: "Seu comentário na comunidade não foi aprovado",
          });
        }
      } else if (type === "community_post") {
        const post = await prisma.post.findUnique({
          where: { id },
          include: {
            course: {
              select: { workspaceId: true, slug: true, gamificationEnabled: true },
            },
            user: { select: { id: true, points: true, level: true } },
          },
        });
        if (!post || post.status !== "PENDING") continue;
        if (workspace && post.course.workspaceId !== workspace.id) continue;

        await prisma.post.update({
          where: { id },
          data: { status: newStatus },
        });
        updated++;

        if (newStatus === "APPROVED") {
          if (post.course.gamificationEnabled) {
            const newPoints = post.user.points + GAMIFICATION.POINTS.CREATE_POST;
            const newLevel = getLevelForPoints(newPoints).level;
            await prisma.user.update({
              where: { id: post.user.id },
              data: { points: newPoints, level: newLevel },
            });
          }
          await createNotification({
            userId: post.userId,
            type: "COMMENT",
            message: "Seu post na comunidade foi aprovado",
            link: `/course/${post.course.slug}/community`,
          });
        } else {
          await createNotification({
            userId: post.userId,
            type: "COMMENT",
            message: "Seu post na comunidade não foi aprovado",
          });
        }
      }
    }

    await logAudit({
      userId: staff.id,
      action: `moderate_${action}`,
      target: items[0]?.id,
      details: { count: items.length, action, updated },
      ...getRequestMeta(request),
    });

    return NextResponse.json({ updated });
  } catch (error) {
    console.error("POST /api/producer/moderation error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

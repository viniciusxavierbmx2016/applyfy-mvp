import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, getStaffCourseIds, getCollaboratorContext } from "@/lib/auth";
import { resolveStaffWorkspace } from "@/lib/workspace";
import { GAMIFICATION, getLevelForPoints } from "@/lib/utils";
import { moderateSchema, validateBody } from "@/lib/validations";
import { logAudit, getRequestMeta } from "@/lib/audit";
import type { NotificationType } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const staff = await requireStaff();
    const { workspace } = await resolveStaffWorkspace(staff);

    // FURO#2 — colaborador precisa de permissão de comunidade + curso em escopo.
    // PRODUCER/ADMIN bypassam (isCollab=false, collabScope=null).
    const isCollab = staff.role === "COLLABORATOR";
    const collabPerms = isCollab
      ? (await getCollaboratorContext(staff.id))?.permissions ?? []
      : [];
    if (
      isCollab &&
      !collabPerms.includes("MANAGE_COMMUNITY") &&
      !collabPerms.includes("REPLY_COMMENTS")
    ) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }
    const collabScope = await getStaffCourseIds(staff); // null p/ PRODUCER/ADMIN
    const canModerate = (type: string, courseId: string): boolean => {
      if (!isCollab) return true; // PRODUCER/ADMIN
      if (collabScope !== null && !collabScope.includes(courseId)) return false;
      return type === "lesson_comment"
        ? collabPerms.includes("REPLY_COMMENTS") ||
            collabPerms.includes("MANAGE_COMMUNITY")
        : collabPerms.includes("MANAGE_COMMUNITY");
    };

    const body = await request.json();
    const v = validateBody(moderateSchema, body);
    if (!v.success) return v.error;
    const { items, action } = v.data;

    const newStatus = action === "approve" ? "APPROVED" : "REJECTED";
    let updated = 0;

    // ── BATCH-PROCESS THE MODERATION (was N findUnique + N update +
    // N create per item). Preserves every observable side effect:
    //   • `updated` only counts items that pass PENDING + tenant gate
    //   • 6 notification variants (text/link) unchanged
    //   • duplicate ids in `items[]` collapse to 1 effect (today the
    //     2nd findUnique sees status !== PENDING and skips)
    //   • gamification only for community_post APPROVED + course
    //     `gamificationEnabled`
    //   • per-user points aggregation (RACE-SAFE — see Phase 4d)

    // ── FASE 1 — group ids by type
    const byType: Record<
      "lesson_comment" | "community_comment" | "community_post",
      string[]
    > = {
      lesson_comment: [],
      community_comment: [],
      community_post: [],
    };
    for (const it of items) {
      const t = it.type as keyof typeof byType;
      if (byType[t]) byType[t].push(it.id);
    }

    // ── FASE 2 — 3 findMany in parallel (same includes as today, MINUS
    // the dead read of `gamificationEnabled` on lesson_comment).
    const [lessonComments, comComments, comPosts] = await Promise.all([
      byType.lesson_comment.length
        ? prisma.lessonComment.findMany({
            where: { id: { in: byType.lesson_comment } },
            include: {
              lesson: {
                include: {
                  module: {
                    include: {
                      course: {
                        select: { workspaceId: true, slug: true },
                      },
                    },
                  },
                },
              },
            },
          })
        : Promise.resolve([]),
      byType.community_comment.length
        ? prisma.comment.findMany({
            where: { id: { in: byType.community_comment } },
            include: {
              post: {
                include: {
                  course: {
                    select: { workspaceId: true, slug: true },
                  },
                },
              },
            },
          })
        : Promise.resolve([]),
      byType.community_post.length
        ? prisma.post.findMany({
            where: { id: { in: byType.community_post } },
            include: {
              course: {
                select: {
                  workspaceId: true,
                  slug: true,
                  gamificationEnabled: true,
                },
              },
              user: { select: { id: true, points: true, level: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    const lessonMap = new Map(lessonComments.map((c) => [c.id, c]));
    const comMap = new Map(comComments.map((c) => [c.id, c]));
    const postMap = new Map(comPosts.map((p) => [p.id, p]));

    // ── FASE 3 — filter (PENDING + tenant gate) + accumulate in memory.
    // We iterate over the ORIGINAL `items[]` so semantics match today
    // (including duplicate-id collapse via per-type `seen*` sets).
    const toUpdateLesson: string[] = [];
    const toUpdateComment: string[] = [];
    const toUpdatePost: string[] = [];
    const notifications: Array<{
      userId: string;
      workspaceId: string;
      type: NotificationType;
      message: string;
      link: string | null;
    }> = [];
    const ledgerEntries: Array<{
      userId: string;
      workspaceId: string;
      delta: number;
      source: string;
      sourceId: string;
    }> = [];
    // pointsByUser[userId] = number of APPROVED posts attributed to
    // that user across this batch. Aggregating *here* (instead of per
    // post in Phase 4) is the fix for the race: with a single Phase-2
    // findMany, all posts of the same user see the same `user.points`
    // snapshot, so summing the deltas once preserves the sequential
    // result of today's nested loop.
    const pointsByUser = new Map<string, number>();
    const userBaseline = new Map<
      string,
      { points: number; level: number }
    >();

    const seenLesson = new Set<string>();
    const seenComment = new Set<string>();
    const seenPost = new Set<string>();

    for (const item of items) {
      const { type, id } = item as { type: string; id: string };

      if (type === "lesson_comment") {
        if (seenLesson.has(id)) continue;
        const c = lessonMap.get(id);
        if (!c || c.status !== "PENDING") continue;
        if (
          workspace &&
          c.lesson.module.course.workspaceId !== workspace.id
        )
          continue;
        if (!canModerate("lesson_comment", c.lesson.module.courseId)) continue;
        seenLesson.add(id);
        toUpdateLesson.push(id);
        updated++;

        if (newStatus === "APPROVED") {
          notifications.push({
            userId: c.userId,
            workspaceId: c.lesson.module.course.workspaceId,
            type: "COMMENT",
            message: "Seu comentário foi aprovado",
            link: `/course/${c.lesson.module.course.slug}/lesson/${c.lessonId}`,
          });
        } else {
          notifications.push({
            userId: c.userId,
            workspaceId: c.lesson.module.course.workspaceId,
            type: "COMMENT",
            message: "Seu comentário não foi aprovado",
            link: null,
          });
        }
      } else if (type === "community_comment") {
        if (seenComment.has(id)) continue;
        const c = comMap.get(id);
        if (!c || c.status !== "PENDING") continue;
        if (workspace && c.post.course.workspaceId !== workspace.id) continue;
        if (!canModerate("community_comment", c.post.courseId)) continue;
        seenComment.add(id);
        toUpdateComment.push(id);
        updated++;

        if (newStatus === "APPROVED") {
          notifications.push({
            userId: c.userId,
            workspaceId: c.post.course.workspaceId,
            type: "COMMENT",
            message: "Seu comentário na comunidade foi aprovado",
            link: `/course/${c.post.course.slug}/community`,
          });
        } else {
          notifications.push({
            userId: c.userId,
            workspaceId: c.post.course.workspaceId,
            type: "COMMENT",
            message: "Seu comentário na comunidade não foi aprovado",
            link: null,
          });
        }
      } else if (type === "community_post") {
        if (seenPost.has(id)) continue;
        const p = postMap.get(id);
        if (!p || p.status !== "PENDING") continue;
        if (workspace && p.course.workspaceId !== workspace.id) continue;
        if (!canModerate("community_post", p.courseId)) continue;
        seenPost.add(id);
        toUpdatePost.push(id);
        updated++;

        if (newStatus === "APPROVED") {
          if (p.course.gamificationEnabled) {
            pointsByUser.set(
              p.user.id,
              (pointsByUser.get(p.user.id) ?? 0) + 1
            );
            // Baseline is the loaded `points` snapshot — captured once
            // per user. Multiple posts from the same user MUST share
            // the same baseline (any other read would already include
            // a partially-applied increment).
            if (!userBaseline.has(p.user.id)) {
              userBaseline.set(p.user.id, {
                points: p.user.points,
                level: p.user.level,
              });
            }
            ledgerEntries.push({
              userId: p.user.id,
              workspaceId: p.course.workspaceId,
              delta: GAMIFICATION.POINTS.CREATE_POST,
              source: "CREATE_POST",
              sourceId: p.id,
            });
          }
          notifications.push({
            userId: p.userId,
            workspaceId: p.course.workspaceId,
            type: "COMMENT",
            message: "Seu post na comunidade foi aprovado",
            link: `/course/${p.course.slug}/community`,
          });
        } else {
          notifications.push({
            userId: p.userId,
            workspaceId: p.course.workspaceId,
            type: "COMMENT",
            message: "Seu post na comunidade não foi aprovado",
            link: null,
          });
        }
      }
    }

    // ── FASE 4 — batched writes. Independent ops → Promise.all.
    // `where: { status: "PENDING" }` is defensive against a concurrent
    // moderator approving the same id between Phase 2 and Phase 4.
    const writes: Promise<unknown>[] = [];

    if (toUpdateLesson.length) {
      writes.push(
        prisma.lessonComment.updateMany({
          where: { id: { in: toUpdateLesson }, status: "PENDING" },
          data: { status: newStatus },
        })
      );
    }
    if (toUpdateComment.length) {
      writes.push(
        prisma.comment.updateMany({
          where: { id: { in: toUpdateComment }, status: "PENDING" },
          data: { status: newStatus },
        })
      );
    }
    if (toUpdatePost.length) {
      writes.push(
        prisma.post.updateMany({
          where: { id: { in: toUpdatePost }, status: "PENDING" },
          data: { status: newStatus },
        })
      );
    }
    if (notifications.length) {
      writes.push(
        prisma.notification.createMany({ data: notifications })
      );
    }
    if (ledgerEntries.length) {
      // sourceId (=post.id) is unique across approved posts in this
      // batch, so no skipDuplicates needed.
      writes.push(
        prisma.pointsLedger.createMany({ data: ledgerEntries })
      );
    }

    // Fase 4d — RACE-SAFE per-user points. ONE update per distinct
    // user, with the final total = baseline + (count × CREATE_POST).
    // Bit-identical to today's sequential loop where each post read
    // the previous post's just-written value.
    for (const [userId, count] of pointsByUser) {
      const base = userBaseline.get(userId)!;
      const newPoints =
        base.points + count * GAMIFICATION.POINTS.CREATE_POST;
      const newLevel = getLevelForPoints(newPoints).level;
      writes.push(
        prisma.user.update({
          where: { id: userId },
          data: { points: newPoints, level: newLevel },
        })
      );
    }

    await Promise.all(writes);

    // ── FASE 5 — audit log (identical to today: target=first id,
    // details={ count, action, updated }).
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

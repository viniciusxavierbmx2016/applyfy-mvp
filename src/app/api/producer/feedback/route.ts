import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, requirePermission, getStaffCourseIds } from "@/lib/auth";
import { resolveStaffWorkspace } from "@/lib/workspace";

const REASON_LABELS: Record<string, string> = {
  content_confusing: "Conteúdo confuso / difícil de entender",
  audio_video_bad: "Problema de áudio ou vídeo",
  too_long: "Muito longo / cansativo",
  outdated: "Conteúdo desatualizado",
  not_helpful: "Não me ajudou",
  other: "Outro motivo",
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function reasonLabel(reason: string | null): string {
  if (!reason) return "—";
  return REASON_LABELS[reason] || reason;
}

export async function GET(request: Request) {
  try {
    const staff = await requireStaff();
    if (staff.role === "COLLABORATOR") {
      await requirePermission(staff, "VIEW_ANALYTICS");
    }

    const { searchParams } = new URL(request.url);
    const courseIdParam = (searchParams.get("courseId") || "").trim();
    const startDateParam = (searchParams.get("startDate") || "").trim();
    const endDateParam = (searchParams.get("endDate") || "").trim();

    // Scoped courses — same ownership pattern as the analytics route.
    const [{ workspace, scoped }, collabScope] = await Promise.all([
      resolveStaffWorkspace(staff),
      getStaffCourseIds(staff),
    ]);
    const workspaceId = scoped && workspace ? workspace.id : null;
    const workspaceCourses = workspaceId
      ? await prisma.course.findMany({
          where: { workspaceId },
          select: { id: true },
        })
      : staff.role === "ADMIN"
        ? await prisma.course.findMany({ select: { id: true } })
        : [];
    const scopedIds = workspaceCourses
      .map((c) => c.id)
      .filter((id) => (collabScope !== null ? collabScope.includes(id) : true));

    let courseIds = scopedIds;
    if (courseIdParam && courseIdParam !== "all") {
      if (!scopedIds.includes(courseIdParam)) {
        return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
      }
      courseIds = [courseIdParam];
    }

    // Date range — mirror analytics route (default last 30 days).
    const now = new Date();
    const todayStart = startOfDay(now);
    let windowStart: Date;
    let windowEnd: Date;
    if (startDateParam && endDateParam) {
      const sd = new Date(startDateParam);
      const ed = new Date(endDateParam);
      windowStart = startOfDay(Number.isNaN(sd.getTime()) ? todayStart : sd);
      const endBase = Number.isNaN(ed.getTime()) ? now : ed;
      windowEnd = new Date(endBase);
      windowEnd.setHours(23, 59, 59, 999);
    } else {
      windowStart = new Date(todayStart);
      windowStart.setDate(windowStart.getDate() - 30);
      windowEnd = new Date(now);
    }

    if (courseIds.length === 0) {
      return NextResponse.json({
        totalDislikes: 0,
        byReason: [],
        topLessons: [],
        comments: [],
      });
    }

    const dislikes = await prisma.lessonReaction.findMany({
      where: {
        type: "DISLIKE",
        createdAt: { gte: windowStart, lte: windowEnd },
        lesson: { module: { courseId: { in: courseIds } } },
      },
      select: {
        reason: true,
        comment: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
        lesson: {
          select: {
            title: true,
            module: {
              select: { title: true, course: { select: { title: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // ── byReason ──
    const reasonCounts = new Map<string, number>();
    for (const d of dislikes) {
      if (!d.reason) continue;
      reasonCounts.set(d.reason, (reasonCounts.get(d.reason) || 0) + 1);
    }
    const byReason = Array.from(reasonCounts.entries())
      .map(([reason, count]) => ({
        reason,
        label: reasonLabel(reason),
        count,
      }))
      .sort((a, b) => b.count - a.count);

    // ── topLessons ──
    interface LessonAgg {
      lessonTitle: string;
      moduleTitle: string;
      courseTitle: string;
      dislikeCount: number;
      reasons: Map<string, number>;
    }
    const lessonMap = new Map<string, LessonAgg>();
    for (const d of dislikes) {
      const lessonTitle = d.lesson.title;
      const moduleTitle = d.lesson.module.title;
      const courseTitle = d.lesson.module.course.title;
      const key = `${courseTitle}||${moduleTitle}||${lessonTitle}`;
      let agg = lessonMap.get(key);
      if (!agg) {
        agg = {
          lessonTitle,
          moduleTitle,
          courseTitle,
          dislikeCount: 0,
          reasons: new Map(),
        };
        lessonMap.set(key, agg);
      }
      agg.dislikeCount++;
      if (d.reason) agg.reasons.set(d.reason, (agg.reasons.get(d.reason) || 0) + 1);
    }
    const topLessons = Array.from(lessonMap.values())
      .map((a) => {
        let topReason = "";
        let max = 0;
        for (const [r, c] of a.reasons.entries()) {
          if (c > max) {
            max = c;
            topReason = r;
          }
        }
        return {
          lessonTitle: a.lessonTitle,
          moduleTitle: a.moduleTitle,
          courseTitle: a.courseTitle,
          dislikeCount: a.dislikeCount,
          topReason: reasonLabel(topReason || null),
        };
      })
      .sort((a, b) => b.dislikeCount - a.dislikeCount)
      .slice(0, 10);

    // ── comments ──
    const comments = dislikes
      .filter((d) => d.comment)
      .slice(0, 50)
      .map((d) => ({
        userName: d.user.name || "Aluno",
        userEmail: d.user.email,
        lessonTitle: d.lesson.title,
        moduleTitle: d.lesson.module.title,
        reason: d.reason || "",
        reasonLabel: reasonLabel(d.reason),
        comment: d.comment as string,
        createdAt: d.createdAt.toISOString(),
      }));

    return NextResponse.json({
      totalDislikes: dislikes.length,
      byReason,
      topLessons,
      comments,
    });
  } catch (error) {
    console.error("GET /api/producer/feedback error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

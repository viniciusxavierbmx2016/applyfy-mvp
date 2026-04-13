import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { resolveStaffWorkspace } from "@/lib/workspace";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

function dayLabel(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function buildDaySeries(days: number) {
  const today = startOfDay(new Date());
  const series: Array<{ key: string; label: string; date: Date }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    series.push({ key: isoDay(d), label: dayLabel(d), date: d });
  }
  return series;
}

export async function GET() {
  try {
    const staff = await requireStaff();
    const { workspace, scoped } = await resolveStaffWorkspace(staff);
    const workspaceId = scoped && workspace ? workspace.id : null;

    if (staff.role === "PRODUCER" && !workspaceId) {
      return NextResponse.json({
        kpis: { activeStudents: 0, newStudents7d: 0, avgCompletion: 0, totalPosts: 0 },
        newStudentsPerDay: [],
        lessonsCompletedPerDay: [],
        topCourses: [],
        postsByType: [],
      });
    }

    const scopedCourseIds = workspaceId
      ? (
          await prisma.course.findMany({
            where: { workspaceId },
            select: { id: true },
          })
        ).map((c) => c.id)
      : null;
    const courseIdFilter = scopedCourseIds
      ? { courseId: { in: scopedCourseIds } }
      : {};
    const workspaceUserFilter = workspaceId ? { workspaceId } : {};

    const now = new Date();
    const todayStart = startOfDay(now);
    const sevenDaysAgo = new Date(todayStart);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(todayStart);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

    // ----- KPI CARDS -----
    const [activeStudents, newStudents7d, totalPosts] = await Promise.all([
      prisma.user.count({
        where: {
          role: "STUDENT",
          ...workspaceUserFilter,
          enrollments: {
            some: {
              status: "ACTIVE",
              ...(scopedCourseIds ? { courseId: { in: scopedCourseIds } } : {}),
            },
          },
        },
      }),
      prisma.user.count({
        where: {
          role: "STUDENT",
          createdAt: { gte: sevenDaysAgo },
          ...workspaceUserFilter,
        },
      }),
      prisma.post.count({ where: courseIdFilter }),
    ]);

    // Avg completion rate: for each active enrollment, completed lessons / total course lessons
    const enrollments = await prisma.enrollment.findMany({
      where: { status: "ACTIVE", ...courseIdFilter },
      select: {
        userId: true,
        courseId: true,
        course: {
          select: {
            modules: { select: { lessons: { select: { id: true } } } },
          },
        },
      },
    });

    let completionSum = 0;
    let completionCount = 0;
    const courseLessonMap = new Map<string, string[]>();
    for (const e of enrollments) {
      const lessonIds = e.course.modules.flatMap((m) =>
        m.lessons.map((l) => l.id)
      );
      courseLessonMap.set(e.courseId, lessonIds);
      if (lessonIds.length === 0) continue;

      const done = await prisma.lessonProgress.count({
        where: {
          userId: e.userId,
          completed: true,
          lessonId: { in: lessonIds },
        },
      });
      completionSum += done / lessonIds.length;
      completionCount++;
    }
    const avgCompletion =
      completionCount > 0 ? (completionSum / completionCount) * 100 : 0;

    // ----- NEW STUDENTS PER DAY (30d) -----
    const newStudentsRows = await prisma.user.findMany({
      where: {
        role: "STUDENT",
        createdAt: { gte: thirtyDaysAgo },
        ...workspaceUserFilter,
      },
      select: { createdAt: true },
    });
    const series30 = buildDaySeries(30);
    const newStudentsByDay = new Map<string, number>(
      series30.map((s) => [s.key, 0])
    );
    for (const u of newStudentsRows) {
      const k = isoDay(startOfDay(u.createdAt));
      if (newStudentsByDay.has(k))
        newStudentsByDay.set(k, newStudentsByDay.get(k)! + 1);
    }

    // ----- LESSONS COMPLETED PER DAY (30d) -----
    const completedRows = await prisma.lessonProgress.findMany({
      where: {
        completed: true,
        completedAt: { gte: thirtyDaysAgo },
        ...(scopedCourseIds
          ? {
              lesson: {
                module: { courseId: { in: scopedCourseIds } },
              },
            }
          : {}),
      },
      select: { completedAt: true },
    });
    const lessonsByDay = new Map<string, number>(
      series30.map((s) => [s.key, 0])
    );
    for (const r of completedRows) {
      if (!r.completedAt) continue;
      const k = isoDay(startOfDay(r.completedAt));
      if (lessonsByDay.has(k))
        lessonsByDay.set(k, lessonsByDay.get(k)! + 1);
    }

    // ----- TOP 5 POPULAR COURSES -----
    const topCourses = await prisma.course.findMany({
      where: workspaceId ? { workspaceId } : undefined,
      select: {
        id: true,
        title: true,
        _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
      },
      orderBy: { enrollments: { _count: "desc" } },
      take: 5,
    });

    // ----- POSTS BY TYPE -----
    const postsByTypeRaw = await prisma.post.groupBy({
      by: ["type"],
      where: courseIdFilter,
      _count: { _all: true },
    });
    const typeLabels: Record<string, string> = {
      QUESTION: "Dúvida",
      RESULT: "Resultado",
      FEEDBACK: "Feedback",
      FREE: "Livre",
    };
    const postsByType = ["QUESTION", "RESULT", "FEEDBACK", "FREE"].map((t) => {
      const found = postsByTypeRaw.find((r) => r.type === t);
      return {
        type: t,
        label: typeLabels[t],
        count: found?._count._all ?? 0,
      };
    });

    return NextResponse.json({
      kpis: {
        activeStudents,
        newStudents7d,
        avgCompletion: Math.round(avgCompletion * 10) / 10,
        totalPosts,
      },
      newStudentsPerDay: series30.map((s) => ({
        day: s.label,
        count: newStudentsByDay.get(s.key) ?? 0,
      })),
      lessonsCompletedPerDay: series30.map((s) => ({
        day: s.label,
        count: lessonsByDay.get(s.key) ?? 0,
      })),
      topCourses: topCourses.map((c) => ({
        id: c.id,
        title: c.title,
        students: c._count.enrollments,
      })),
      postsByType,
    });
  } catch (error) {
    console.error("GET /api/admin/analytics error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, requirePermission, getStaffCourseIds } from "@/lib/auth";
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

function csvEscape(v: unknown) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(request: Request) {
  try {
    const staff = await requireStaff();
    if (staff.role === "COLLABORATOR") {
      await requirePermission(staff, "VIEW_ANALYTICS");
    }

    const { searchParams } = new URL(request.url);
    const courseIdParam = (searchParams.get("courseId") || "").trim();
    const rawWindow = Number(searchParams.get("window") || "7");
    const windowDays: 7 | 30 | 90 =
      rawWindow === 90 ? 90 : rawWindow === 30 ? 30 : 7;
    const format = (searchParams.get("format") || "json").toLowerCase();

    const { workspace, scoped } = await resolveStaffWorkspace(staff);
    const workspaceId = scoped && workspace ? workspace.id : null;

    const collabScope = await getStaffCourseIds(staff);
    const workspaceCourses = workspaceId
      ? await prisma.course.findMany({
          where: { workspaceId },
          select: { id: true, title: true },
          orderBy: { order: "asc" },
        })
      : staff.role === "ADMIN"
        ? await prisma.course.findMany({
            select: { id: true, title: true },
            orderBy: { order: "asc" },
          })
        : [];
    const workspaceCourseIds = new Set(workspaceCourses.map((c) => c.id));
    const scopedCourses = workspaceCourses.filter((c) =>
      collabScope !== null ? collabScope.includes(c.id) : true
    );
    const scopedIds = scopedCourses.map((c) => c.id);

    let courseIds = scopedIds;
    if (courseIdParam && courseIdParam !== "all") {
      if (!scopedIds.includes(courseIdParam)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      courseIds = [courseIdParam];
    }

    const selectedCourseId =
      courseIdParam && courseIds.length === 1 && courseIds[0] === courseIdParam
        ? courseIdParam
        : "";

    const now = new Date();
    const todayStart = startOfDay(now);
    const windowStart = new Date(todayStart);
    windowStart.setDate(windowStart.getDate() - windowDays);
    const sevenAgo = new Date(todayStart);
    sevenAgo.setDate(sevenAgo.getDate() - 7);
    const thirtyAgo = new Date(todayStart);
    thirtyAgo.setDate(thirtyAgo.getDate() - 30);
    const prevWindowStart = new Date(windowStart);
    prevWindowStart.setDate(prevWindowStart.getDate() - windowDays);
    const seriesLen = windowDays;
    const series30 = buildDaySeries(seriesLen);
    const thirtySeriesStart = series30[0].date;

    if (courseIds.length === 0) {
      const emptyBody = {
        courses: scopedCourses,
        selectedCourseId,
        window: windowDays,
        kpis: {
          totalEnrolled: 0,
          uniqueStudents: 0,
          newStudents: 0,
          avgCompletion: 0,
          avgRating: 0,
          ratingCount: 0,
          activeStudents: 0,
          inactiveStudents: 0,
          neverAccessed: 0,
        },
        kpiDeltas: {
          newStudentsPrev: 0,
          lessonsCompleted: 0,
          lessonsCompletedPrev: 0,
        },
        newEnrollmentsPerDay: series30.map((s) => ({ day: s.label, count: 0 })),
        lessonsCompletedPerDay: series30.map((s) => ({
          day: s.label,
          count: 0,
        })),
        progressDistribution: [
          { bucket: "0–25%", count: 0 },
          { bucket: "26–50%", count: 0 },
          { bucket: "51–75%", count: 0 },
          { bucket: "76–100%", count: 0 },
        ],
        moduleAbandonment: [],
        topLessons: [],
        postsByType: [
          { type: "QUESTION", label: "Dúvida", count: 0 },
          { type: "RESULT", label: "Resultado", count: 0 },
          { type: "FEEDBACK", label: "Feedback", count: 0 },
          { type: "FREE", label: "Livre", count: 0 },
        ],
        topStudents: [],
        inactiveStudentsList: [],
        neverAccessedStudents: [],
      };
      if (format === "csv") {
        return new NextResponse(
          "nome,email,curso,progresso_percent,aulas_concluidas,total_aulas,data_matricula,ultimo_acesso\n",
          {
            headers: {
              "Content-Type": "text/csv; charset=utf-8",
              "Content-Disposition": `attachment; filename=analytics-${isoDay(now)}.csv`,
            },
          }
        );
      }
      return NextResponse.json(emptyBody);
    }

    // Course structure
    const courses = await prisma.course.findMany({
      where: { id: { in: courseIds } },
      select: {
        id: true,
        title: true,
        modules: {
          select: {
            id: true,
            title: true,
            order: true,
            courseId: true,
            lessons: { select: { id: true, title: true } },
          },
          orderBy: { order: "asc" },
        },
      },
    });

    const allLessonIds: string[] = [];
    const lessonTitle = new Map<string, string>();
    const lessonToModule = new Map<string, string>();
    const lessonToCourse = new Map<string, string>();
    const moduleTitle = new Map<string, string>();
    const courseLessonIds = new Map<string, string[]>();
    for (const c of courses) {
      const ids: string[] = [];
      for (const m of c.modules) {
        moduleTitle.set(m.id, m.title);
        for (const l of m.lessons) {
          allLessonIds.push(l.id);
          ids.push(l.id);
          lessonTitle.set(l.id, l.title);
          lessonToModule.set(l.id, m.id);
          lessonToCourse.set(l.id, c.id);
        }
      }
      courseLessonIds.set(c.id, ids);
    }
    void workspaceCourseIds;

    // Enrollments (all statuses captured separately; primary analysis uses ACTIVE)
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId: { in: courseIds }, status: "ACTIVE" },
      select: {
        id: true,
        userId: true,
        courseId: true,
        createdAt: true,
        user: {
          select: { id: true, name: true, email: true, points: true },
        },
      },
    });
    const enrollmentUserIds = Array.from(
      new Set(enrollments.map((e) => e.userId))
    );

    // Progress
    const progress =
      allLessonIds.length && enrollmentUserIds.length
        ? await prisma.lessonProgress.findMany({
            where: {
              userId: { in: enrollmentUserIds },
              lessonId: { in: allLessonIds },
              completed: true,
            },
            select: { userId: true, lessonId: true, completedAt: true },
          })
        : [];

    const userCompletedByCourse = new Map<string, Map<string, number>>();
    const userLastActive = new Map<string, Date>();
    const lastLessonByUserCourse = new Map<string, string>();
    const lastTimeByUserCourse = new Map<string, number>();
    const lessonViews = new Map<string, number>();
    for (const p of progress) {
      const cid = lessonToCourse.get(p.lessonId);
      if (!cid) continue;
      // per-course completions
      if (!userCompletedByCourse.has(p.userId))
        userCompletedByCourse.set(p.userId, new Map());
      const m = userCompletedByCourse.get(p.userId)!;
      m.set(cid, (m.get(cid) || 0) + 1);
      // lesson views
      lessonViews.set(p.lessonId, (lessonViews.get(p.lessonId) || 0) + 1);
      // last activity
      if (p.completedAt) {
        const prev = userLastActive.get(p.userId);
        if (!prev || p.completedAt > prev)
          userLastActive.set(p.userId, p.completedAt);
        const key = `${p.userId}|${cid}`;
        const prevT = lastTimeByUserCourse.get(key) || 0;
        if (p.completedAt.getTime() > prevT) {
          lastTimeByUserCourse.set(key, p.completedAt.getTime());
          lastLessonByUserCourse.set(key, p.lessonId);
        }
      }
    }

    // KPIs
    const totalEnrolled = enrollments.length;
    const uniqueStudents = enrollmentUserIds.length;
    const newStudents = enrollments.filter(
      (e) => e.createdAt >= windowStart
    ).length;
    const prevNewStudents = enrollments.filter(
      (e) => e.createdAt >= prevWindowStart && e.createdAt < windowStart
    ).length;
    const lessonsCompletedWindow = progress.filter(
      (p) => p.completedAt && p.completedAt >= windowStart
    ).length;
    const prevLessonsCompletedWindow = progress.filter(
      (p) =>
        p.completedAt &&
        p.completedAt >= prevWindowStart &&
        p.completedAt < windowStart
    ).length;

    let completionSum = 0;
    let completionCount = 0;
    const progressDist = [0, 0, 0, 0];
    const abandonPerModule = new Map<string, number>();
    const enrollDetails: Array<{
      userId: string;
      courseId: string;
      courseTitle: string;
      createdAt: Date;
      completed: number;
      total: number;
      progress: number;
      lastActive: Date | null;
      name: string;
      email: string;
    }> = [];
    const courseTitleById = new Map(courses.map((c) => [c.id, c.title]));

    for (const e of enrollments) {
      const total = courseLessonIds.get(e.courseId)?.length || 0;
      const completed =
        userCompletedByCourse.get(e.userId)?.get(e.courseId) || 0;
      const pct = total > 0 ? (completed / total) * 100 : 0;
      if (total > 0) {
        completionSum += completed / total;
        completionCount++;
      }
      if (pct <= 25) progressDist[0]++;
      else if (pct <= 50) progressDist[1]++;
      else if (pct <= 75) progressDist[2]++;
      else progressDist[3]++;

      if (total > 0 && completed < total) {
        const lastLessonId = lastLessonByUserCourse.get(
          `${e.userId}|${e.courseId}`
        );
        if (lastLessonId) {
          const moduleId = lessonToModule.get(lastLessonId);
          if (moduleId)
            abandonPerModule.set(
              moduleId,
              (abandonPerModule.get(moduleId) || 0) + 1
            );
        }
      }

      enrollDetails.push({
        userId: e.userId,
        courseId: e.courseId,
        courseTitle: courseTitleById.get(e.courseId) || "",
        createdAt: e.createdAt,
        completed,
        total,
        progress: Math.round(pct),
        lastActive: userLastActive.get(e.userId) || null,
        name: e.user.name,
        email: e.user.email,
      });
    }
    const avgCompletion =
      completionCount > 0 ? (completionSum / completionCount) * 100 : 0;

    // Reviews
    const reviews = await prisma.review.aggregate({
      where: { courseId: { in: courseIds } },
      _avg: { rating: true },
      _count: { rating: true },
    });
    const avgRating = reviews._avg.rating ?? 0;
    const ratingCount = reviews._count.rating;

    // Active / inactive / never
    let activeStudents = 0;
    let inactiveStudents = 0;
    let neverAccessed = 0;
    for (const uid of enrollmentUserIds) {
      const last = userLastActive.get(uid);
      if (!last) {
        neverAccessed++;
        continue;
      }
      if (last >= sevenAgo) activeStudents++;
      else if (last < thirtyAgo) inactiveStudents++;
    }

    // Enrollments per day
    const enrollByDay = new Map(series30.map((s) => [s.key, 0]));
    for (const e of enrollments) {
      if (e.createdAt < thirtySeriesStart) continue;
      const k = isoDay(startOfDay(e.createdAt));
      if (enrollByDay.has(k))
        enrollByDay.set(k, (enrollByDay.get(k) || 0) + 1);
    }

    // Lessons completed per day
    const lessonsByDay = new Map(series30.map((s) => [s.key, 0]));
    for (const p of progress) {
      if (!p.completedAt || p.completedAt < thirtySeriesStart) continue;
      const k = isoDay(startOfDay(p.completedAt));
      if (lessonsByDay.has(k))
        lessonsByDay.set(k, (lessonsByDay.get(k) || 0) + 1);
    }

    const moduleAbandonment = Array.from(abandonPerModule.entries())
      .map(([moduleId, count]) => ({
        moduleId,
        title: moduleTitle.get(moduleId) || "",
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const topLessons = Array.from(lessonViews.entries())
      .map(([id, views]) => ({ id, title: lessonTitle.get(id) || "", views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // Posts by type
    const postsByTypeRaw = await prisma.post.groupBy({
      by: ["type"],
      where: { courseId: { in: courseIds } },
      _count: { _all: true },
    });
    const typeLabels: Record<string, string> = {
      QUESTION: "Dúvida",
      RESULT: "Resultado",
      FEEDBACK: "Feedback",
      FREE: "Livre",
    };
    const postsByType = ["QUESTION", "RESULT", "FEEDBACK", "FREE"].map((t) => {
      const f = postsByTypeRaw.find((r) => r.type === t);
      return { type: t, label: typeLabels[t], count: f?._count._all ?? 0 };
    });

    // Aggregate per-user for ranking (sum across scoped courses)
    const perUser = new Map<
      string,
      {
        userId: string;
        name: string;
        email: string;
        points: number;
        completed: number;
        total: number;
        lastActive: Date | null;
      }
    >();
    for (const e of enrollments) {
      const existing = perUser.get(e.userId) || {
        userId: e.userId,
        name: e.user.name,
        email: e.user.email,
        points: e.user.points,
        completed: 0,
        total: 0,
        lastActive: userLastActive.get(e.userId) || null,
      };
      existing.completed +=
        userCompletedByCourse.get(e.userId)?.get(e.courseId) || 0;
      existing.total += courseLessonIds.get(e.courseId)?.length || 0;
      perUser.set(e.userId, existing);
    }
    const userList = Array.from(perUser.values()).map((u) => ({
      ...u,
      progress: u.total > 0 ? Math.round((u.completed / u.total) * 100) : 0,
    }));
    const topStudents = [...userList]
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return b.completed - a.completed;
      })
      .slice(0, 10);

    const inactiveStudentsList = userList
      .filter((u) => u.lastActive && u.lastActive < thirtyAgo)
      .sort(
        (a, b) =>
          (a.lastActive?.getTime() || 0) - (b.lastActive?.getTime() || 0)
      )
      .slice(0, 50);

    const neverAccessedSeen = new Set<string>();
    const neverAccessedStudents: Array<{
      userId: string;
      enrollmentId: string;
      courseId: string;
      name: string;
      email: string;
      enrolledAt: Date;
    }> = [];
    for (const e of enrollments) {
      if (userLastActive.has(e.userId)) continue;
      if (neverAccessedSeen.has(e.userId)) continue;
      neverAccessedSeen.add(e.userId);
      neverAccessedStudents.push({
        userId: e.userId,
        enrollmentId: e.id,
        courseId: e.courseId,
        name: e.user.name,
        email: e.user.email,
        enrolledAt: e.createdAt,
      });
    }
    neverAccessedStudents.sort(
      (a, b) => b.enrolledAt.getTime() - a.enrolledAt.getTime()
    );

    if (format === "csv") {
      const header = [
        "nome",
        "email",
        "curso",
        "progresso_percent",
        "aulas_concluidas",
        "total_aulas",
        "data_matricula",
        "ultimo_acesso",
      ].join(",");
      const rows = enrollDetails.map((d) =>
        [
          csvEscape(d.name),
          csvEscape(d.email),
          csvEscape(d.courseTitle),
          String(d.progress),
          String(d.completed),
          String(d.total),
          d.createdAt.toISOString(),
          d.lastActive ? d.lastActive.toISOString() : "",
        ].join(",")
      );
      const csv = [header, ...rows].join("\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename=analytics-${isoDay(now)}.csv`,
        },
      });
    }

    // Resolve enrollmentId for inactive rows (for resend actions)
    const earliestEnrollment = new Map<string, { id: string; courseId: string }>();
    for (const e of enrollments) {
      if (!earliestEnrollment.has(e.userId)) {
        earliestEnrollment.set(e.userId, { id: e.id, courseId: e.courseId });
      }
    }
    const inactiveWithEnrollment = inactiveStudentsList.map((u) => ({
      ...u,
      enrollmentId: earliestEnrollment.get(u.userId)?.id || null,
      courseId: earliestEnrollment.get(u.userId)?.courseId || null,
    }));

    return NextResponse.json({
      courses: scopedCourses,
      selectedCourseId,
      window: windowDays,
      kpis: {
        totalEnrolled,
        uniqueStudents,
        newStudents,
        avgCompletion: Math.round(avgCompletion * 10) / 10,
        avgRating: Math.round(avgRating * 10) / 10,
        ratingCount,
        activeStudents,
        inactiveStudents,
        neverAccessed,
      },
      kpiDeltas: {
        newStudentsPrev: prevNewStudents,
        lessonsCompleted: lessonsCompletedWindow,
        lessonsCompletedPrev: prevLessonsCompletedWindow,
      },
      newEnrollmentsPerDay: series30.map((s) => ({
        day: s.label,
        count: enrollByDay.get(s.key) ?? 0,
      })),
      lessonsCompletedPerDay: series30.map((s) => ({
        day: s.label,
        count: lessonsByDay.get(s.key) ?? 0,
      })),
      progressDistribution: [
        { bucket: "0–25%", count: progressDist[0] },
        { bucket: "26–50%", count: progressDist[1] },
        { bucket: "51–75%", count: progressDist[2] },
        { bucket: "76–100%", count: progressDist[3] },
      ],
      moduleAbandonment,
      topLessons,
      postsByType,
      topStudents,
      inactiveStudentsList: inactiveWithEnrollment,
      neverAccessedStudents,
    });
  } catch (error) {
    console.error("GET /api/admin/analytics error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

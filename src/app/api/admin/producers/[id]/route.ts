import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const producer = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
        role: true,
        phone: true,
        document: true,
        businessType: true,
        niche: true,
        monthlyRevenue: true,
        referralSource: true,
        lastAccessAt: true,
        points: true,
        level: true,
      },
    });
    if (!producer || producer.role !== "PRODUCER") {
      return NextResponse.json(
        { error: "Produtor não encontrado" },
        { status: 404 }
      );
    }

    const workspaces = await prisma.workspace.findMany({
      where: { ownerId: producer.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        createdAt: true,
        logoUrl: true,
        accentColor: true,
      },
    });
    const workspaceIds = workspaces.map((w) => w.id);

    const courses = await prisma.course.findMany({
      where: { workspaceId: { in: workspaceIds } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        thumbnail: true,
        workspaceId: true,
        modules: { select: { lessons: { select: { id: true } } } },
        _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
      },
    });
    const courseIds = courses.map((c) => c.id);

    const [reviewAgg, progressAgg, enrollmentsByCourse] = await Promise.all([
      prisma.review.groupBy({
        by: ["courseId"],
        where: { courseId: { in: courseIds } },
        _avg: { rating: true },
        _count: { rating: true },
      }),
      // completed lessons per course
      courseIds.length
        ? prisma.$queryRawUnsafe<
            Array<{ courseId: string; cnt: bigint }>
          >(
            `select m."courseId" as "courseId", count(lp.id)::bigint as cnt
             from "LessonProgress" lp
             join "Lesson" l on l.id = lp."lessonId"
             join "Module" m on m.id = l."moduleId"
             where lp.completed = true and m."courseId" = any($1::text[])
             group by m."courseId"`,
            courseIds
          )
        : Promise.resolve([] as Array<{ courseId: string; cnt: bigint }>),
      prisma.enrollment.groupBy({
        by: ["courseId"],
        where: { courseId: { in: courseIds }, status: "ACTIVE" },
        _count: { _all: true },
      }),
    ]);

    const ratingBy = new Map(
      reviewAgg.map((r) => [r.courseId, { avg: r._avg.rating ?? 0, count: r._count.rating }])
    );
    const progressBy = new Map(
      progressAgg.map((r) => [r.courseId, Number(r.cnt)])
    );
    const enrollBy = new Map(
      enrollmentsByCourse.map((r) => [r.courseId, r._count._all])
    );

    const studentIdsAll = new Set<string>();
    if (courseIds.length) {
      const enr = await prisma.enrollment.findMany({
        where: { courseId: { in: courseIds }, status: "ACTIVE" },
        select: { userId: true, courseId: true },
      });
      for (const e of enr) studentIdsAll.add(e.userId);
    }

    const workspacesWithStats = workspaces.map((w) => {
      const wCourses = courses.filter((c) => c.workspaceId === w.id);
      const wCourseCount = wCourses.length;
      const wStudentCount = wCourses.reduce(
        (sum, c) => sum + (enrollBy.get(c.id) || 0),
        0
      );
      return {
        id: w.id,
        name: w.name,
        slug: w.slug,
        isActive: w.isActive,
        courseCount: wCourseCount,
        studentCount: wStudentCount,
      };
    });

    const coursesOut = courses.map((c) => {
      const totalLessons = c.modules.reduce(
        (s, m) => s + m.lessons.length,
        0
      );
      const students = enrollBy.get(c.id) || 0;
      const completedLessons = progressBy.get(c.id) || 0;
      const completion =
        totalLessons > 0 && students > 0
          ? Math.round(
              (completedLessons / (totalLessons * students)) * 1000
            ) / 10
          : 0;
      const rating = ratingBy.get(c.id);
      return {
        id: c.id,
        title: c.title,
        thumbnail: c.thumbnail,
        workspaceId: c.workspaceId,
        students,
        ratingAverage: rating ? Math.round(rating.avg * 10) / 10 : 0,
        ratingCount: rating ? rating.count : 0,
        completion,
      };
    });

    const activeSub = await prisma.subscription.findFirst({
      where: { userId: producer.id, status: { in: ["ACTIVE", "PAST_DUE", "PENDING"] } },
      orderBy: { createdAt: "desc" },
      include: {
        plan: true,
        invoices: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });

    const [workspacesUsed, coursesUsed] = await Promise.all([
      prisma.workspace.count({ where: { ownerId: producer.id } }),
      prisma.course.count({ where: { ownerId: producer.id } }),
    ]);

    const recentStudents = courseIds.length
      ? await prisma.enrollment.findMany({
          where: { courseId: { in: courseIds }, status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            createdAt: true,
            user: { select: { id: true, name: true, email: true, avatarUrl: true, lastAccessAt: true } },
            course: { select: { id: true, title: true } },
          },
        })
      : [];

    return NextResponse.json({
      producer,
      workspaces: workspacesWithStats,
      courses: coursesOut,
      totalStudents: studentIdsAll.size,
      subscription: activeSub,
      usage: { workspacesUsed, coursesUsed },
      recentStudents: recentStudents.map((e) => ({
        id: e.user.id,
        name: e.user.name,
        email: e.user.email,
        avatarUrl: e.user.avatarUrl,
        lastAccessAt: e.user.lastAccessAt,
        enrolledAt: e.createdAt,
        courseTitle: e.course.title,
      })),
    });
  } catch (error) {
    console.error("GET /api/admin/producers/[id] error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const body = await request.json();
    const action = body.action as "suspend" | "activate";

    const producer = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, role: true },
    });
    if (!producer || producer.role !== "PRODUCER") {
      return NextResponse.json(
        { error: "Produtor não encontrado" },
        { status: 404 }
      );
    }

    if (action !== "suspend" && action !== "activate") {
      return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
    }

    await prisma.workspace.updateMany({
      where: { ownerId: producer.id },
      data: { isActive: action === "activate" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/admin/producers/[id] error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

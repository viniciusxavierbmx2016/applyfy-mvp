import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireStaff } from "@/lib/auth";
import { canAccessWorkspace, resolveStaffWorkspace } from "@/lib/workspace";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter"); // enrolled, store, all

    const isAdmin = user.role === "ADMIN";
    const isProducer = user.role === "PRODUCER";

    if ((isAdmin || isProducer) && filter === "all") {
      const { workspace, scoped } = await resolveStaffWorkspace(user);
      if (isProducer && !workspace) {
        return NextResponse.json({ courses: [] });
      }
      const courses = await prisma.course.findMany({
        where: scoped && workspace ? { workspaceId: workspace.id } : undefined,
        orderBy: { order: "asc" },
        include: {
          _count: {
            select: { modules: true, enrollments: true },
          },
        },
      });
      return NextResponse.json({ courses });
    }

    // Student view: scope to user's workspace (if set)
    const workspaceFilter = user.workspaceId
      ? { workspaceId: user.workspaceId }
      : {};

    const enrollments = await prisma.enrollment.findMany({
      where: { userId: user.id, status: "ACTIVE" },
      select: { courseId: true, expiresAt: true },
    });
    const now = Date.now();
    const expiredSet = new Set(
      enrollments
        .filter((e) => e.expiresAt && e.expiresAt.getTime() < now)
        .map((e) => e.courseId)
    );
    // enrolledIds includes expired — the frontend gets an `isExpired` flag
    // and access is re-checked server-side on course/lesson load.
    const enrolledIds = enrollments.map((e) => e.courseId);

    if (filter === "enrolled") {
      const courses = await prisma.course.findMany({
        where: { id: { in: enrolledIds }, isPublished: true, ...workspaceFilter },
        orderBy: { order: "asc" },
        include: {
          modules: {
            include: {
              lessons: {
                include: {
                  progress: {
                    where: { userId: user.id },
                  },
                },
              },
            },
          },
        },
      });
      return NextResponse.json({ courses });
    }

    if (filter === "store") {
      const courses = await prisma.course.findMany({
        where: {
          id: { notIn: enrolledIds },
          isPublished: true,
          showInStore: true,
          ...workspaceFilter,
        },
        orderBy: { order: "asc" },
      });
      return NextResponse.json({ courses });
    }

    const enrolled = await prisma.course.findMany({
      where: { id: { in: enrolledIds }, isPublished: true, ...workspaceFilter },
      orderBy: { order: "asc" },
      include: {
        modules: {
          include: {
            lessons: {
              include: {
                progress: {
                  where: { userId: user.id },
                },
              },
            },
          },
        },
      },
    });

    const store = await prisma.course.findMany({
      where: {
        id: { notIn: enrolledIds },
        isPublished: true,
        showInStore: true,
        ...workspaceFilter,
      },
      orderBy: { order: "asc" },
    });

    const allCourseIds = [...enrolled.map((c) => c.id), ...store.map((c) => c.id)];
    const ratings = allCourseIds.length
      ? await prisma.review.groupBy({
          by: ["courseId"],
          where: { courseId: { in: allCourseIds } },
          _avg: { rating: true },
          _count: { rating: true },
        })
      : [];
    const ratingMap = new Map(
      ratings.map((r) => [
        r.courseId,
        { average: r._avg.rating ?? 0, count: r._count.rating },
      ])
    );
    const withRating = <T extends { id: string }>(c: T) => ({
      ...c,
      ratingAverage: ratingMap.get(c.id)?.average ?? 0,
      ratingCount: ratingMap.get(c.id)?.count ?? 0,
    });
    const withExpired = <T extends { id: string }>(c: T) => ({
      ...withRating(c),
      isExpired: expiredSet.has(c.id),
    });

    return NextResponse.json({
      enrolled: enrolled.map(withExpired),
      store: store.map(withRating),
    });
  } catch (error) {
    const details =
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : error;
    console.error("GET /api/courses error:", details);
    return NextResponse.json(
      { error: "Erro ao buscar cursos" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const staff = await requireStaff();

    const body = await request.json();
    const {
      title,
      slug,
      description,
      thumbnail,
      checkoutUrl,
      externalProductId,
      isPublished,
      showInStore,
      workspaceId: explicitWorkspaceId,
    } = body;

    if (!title || !slug || !description) {
      return NextResponse.json(
        { error: "Título, slug e descrição são obrigatórios" },
        { status: 400 }
      );
    }

    // Resolve workspace: explicit > staff active workspace
    let targetWorkspaceId: string | null = null;
    if (explicitWorkspaceId) {
      if (!(await canAccessWorkspace(staff, explicitWorkspaceId))) {
        return NextResponse.json({ error: "Workspace inválido" }, { status: 403 });
      }
      targetWorkspaceId = explicitWorkspaceId;
    } else {
      const { workspace } = await resolveStaffWorkspace(staff);
      targetWorkspaceId = workspace?.id ?? null;
    }

    if (!targetWorkspaceId) {
      return NextResponse.json(
        { error: "Nenhum workspace ativo. Crie um workspace antes de criar cursos." },
        { status: 400 }
      );
    }

    const existing = await prisma.course.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: "Já existe um curso com esse slug" },
        { status: 409 }
      );
    }

    const lastCourse = await prisma.course.findFirst({
      where: { workspaceId: targetWorkspaceId },
      orderBy: { order: "desc" },
    });

    const course = await prisma.course.create({
      data: {
        title,
        slug,
        description,
        thumbnail: thumbnail || null,
        checkoutUrl: checkoutUrl || null,
        externalProductId: externalProductId?.trim() || null,
        isPublished: Boolean(isPublished),
        showInStore: showInStore !== false,
        order: (lastCourse?.order ?? -1) + 1,
        ownerId: staff.id,
        workspaceId: targetWorkspaceId,
      },
    });

    return NextResponse.json({ course }, { status: 201 });
  } catch (error) {
    console.error("POST /api/courses error:", error);
    const message =
      error instanceof Error && error.message === "Forbidden"
        ? "Acesso negado"
        : "Erro ao criar curso";
    const status = message === "Acesso negado" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

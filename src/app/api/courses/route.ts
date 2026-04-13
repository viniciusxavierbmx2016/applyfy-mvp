import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  requireStaff,
  getStaffCourseIds,
} from "@/lib/auth";
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
    const isCollaborator = user.role === "COLLABORATOR";

    if ((isAdmin || isProducer || isCollaborator) && filter === "all") {
      const { workspace, scoped } = await resolveStaffWorkspace(user);
      if ((isProducer || isCollaborator) && !workspace) {
        return NextResponse.json({ courses: [] });
      }
      const collabScope = await getStaffCourseIds(user);
      const where =
        collabScope !== null
          ? { id: { in: collabScope } }
          : scoped && workspace
            ? { workspaceId: workspace.id }
            : undefined;
      const courses = await prisma.course.findMany({
        where,
        orderBy: { order: "asc" },
        include: {
          _count: {
            select: { modules: true, enrollments: true },
          },
        },
      });
      return NextResponse.json({ courses });
    }

    // Student-style listing (enrolled + store). PRODUCER/COLLABORATOR/ADMIN should
    // use filter=all — they don't browse a student storefront. Without a workspace
    // scope, the store query would leak every course on the platform, so we bail
    // out with empty lists for staff roles here.
    if (isAdmin || isProducer || isCollaborator) {
      return NextResponse.json({ enrolled: [], store: [] });
    }

    // Student view: scope to a specific workspace.
    // If the URL passes ?workspace=<slug> (e.g. from /w/[slug]), use it AND
    // enforce that the student belongs there. Otherwise fall back to the
    // student's bound workspace.
    const workspaceSlug = searchParams.get("workspace");
    let scopedWorkspaceId: string | null = null;
    if (workspaceSlug) {
      const ws = await prisma.workspace.findUnique({
        where: { slug: workspaceSlug },
        select: { id: true, isActive: true },
      });
      if (!ws || !ws.isActive) {
        return NextResponse.json({ enrolled: [], store: [] });
      }
      if (user.workspaceId && user.workspaceId !== ws.id) {
        return NextResponse.json(
          { error: "Você não tem acesso a esta área de membros" },
          { status: 403 }
        );
      }
      scopedWorkspaceId = ws.id;
    } else if (user.workspaceId) {
      scopedWorkspaceId = user.workspaceId;
    }
    const workspaceFilter = scopedWorkspaceId
      ? { workspaceId: scopedWorkspaceId }
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
    const expiresAtMap = new Map(
      enrollments.map((e) => [e.courseId, e.expiresAt])
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
      expiresAt: expiresAtMap.get(c.id) ?? null,
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
    if (staff.role === "COLLABORATOR") {
      // Collaborators cannot create new courses — only manage existing ones.
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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

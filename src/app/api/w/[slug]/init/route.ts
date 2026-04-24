import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasWorkspaceAccess } from "@/lib/workspace-access";
import { isWorkspaceSuspended } from "@/lib/subscription";

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  const t0 = Date.now();
  try {
    const [user, workspace] = await Promise.all([
      getCurrentUser(),
      prisma.workspace.findUnique({
        where: { slug: params.slug },
        select: {
          id: true,
          slug: true,
          name: true,
          logoUrl: true,
          loginBgColor: true,
          isActive: true,
          ownerId: true,
        },
      }),
    ]);
    const t1 = Date.now();

    if (!workspace || !workspace.isActive) {
      return NextResponse.json(
        { error: "Workspace não encontrado" },
        { status: 404 }
      );
    }
    if (!user) {
      console.log(
        `[API /api/w/${params.slug}/init] auth+ws:${t1 - t0}ms total:${t1 - t0}ms (unauth)`
      );
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (user.role === "STUDENT") {
      const allowed = await hasWorkspaceAccess(user.id, workspace.id);
      if (!allowed) {
        return NextResponse.json(
          { error: "Você não tem acesso a esta área de membros" },
          { status: 403 }
        );
      }
    }

    if (user.role === "STUDENT" || user.role === "COLLABORATOR") {
      const suspended = await isWorkspaceSuspended(workspace.id);
      if (suspended) {
        return NextResponse.json(
          { suspended: true, error: "Esta área de membros está temporariamente indisponível." },
          { status: 503 }
        );
      }
    }

    const [enrollments, unreadCount] = await Promise.all([
      prisma.enrollment.findMany({
        where: { userId: user.id, status: "ACTIVE" },
        select: { courseId: true, expiresAt: true },
      }),
      prisma.notification.count({
        where: { userId: user.id, read: false },
      }),
    ]);

    const enrolledIds = enrollments.map((e) => e.courseId);
    const now = Date.now();
    const expiredSet = new Set(
      enrollments
        .filter((e) => e.expiresAt && e.expiresAt.getTime() < now)
        .map((e) => e.courseId)
    );
    const expiresAtMap = new Map(
      enrollments.map((e) => [e.courseId, e.expiresAt])
    );

    const isWorkspaceOwner =
      user.role === "PRODUCER" && workspace.ownerId === user.id;
    const isStaffViewer = user.role === "ADMIN" || isWorkspaceOwner;
    const canManageCourse = (ownerId: string | null | undefined) =>
      user.role === "ADMIN" ||
      isWorkspaceOwner ||
      (user.role === "PRODUCER" && ownerId === user.id);

    const [enrolledCourses, storeCourses] = await Promise.all([
      prisma.course.findMany({
        where: {
          id: { in: enrolledIds },
          isPublished: true,
          workspaceId: workspace.id,
        },
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          thumbnail: true,
          thumbnailPosition: true,
          checkoutUrl: true,
          ownerId: true,
          reviewsEnabled: true,
          memberBgColor: true,
          memberSidebarColor: true,
          memberHeaderColor: true,
          memberCardColor: true,
          memberPrimaryColor: true,
          memberTextColor: true,
          memberAccentColor: true,
          memberWelcomeText: true,
          memberLayoutStyle: true,
          modules: {
            select: {
              id: true,
              lessons: {
                select: {
                  id: true,
                  progress: {
                    where: { userId: user.id },
                    select: { completed: true },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.course.findMany({
        where: {
          id: { notIn: enrolledIds },
          workspaceId: workspace.id,
          ...(isStaffViewer
            ? {}
            : { isPublished: true, showInStore: true }),
        },
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          thumbnail: true,
          thumbnailPosition: true,
          checkoutUrl: true,
          price: true,
          priceCurrency: true,
          ownerId: true,
          reviewsEnabled: true,
          memberBgColor: true,
          memberSidebarColor: true,
          memberHeaderColor: true,
          memberCardColor: true,
          memberPrimaryColor: true,
          memberTextColor: true,
          memberAccentColor: true,
          memberWelcomeText: true,
          memberLayoutStyle: true,
        },
      }),
    ]);

    const allIds = [
      ...enrolledCourses.map((c) => c.id),
      ...storeCourses.map((c) => c.id),
    ];
    const ratings = allIds.length
      ? await prisma.review.groupBy({
          by: ["courseId"],
          where: { courseId: { in: allIds } },
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
    const withRating = <
      T extends { id: string; ownerId?: string | null; reviewsEnabled?: boolean }
    >(
      c: T
    ) => {
      const { ownerId: _ownerId, ...rest } = c;
      void _ownerId;
      const showReviews = c.reviewsEnabled !== false;
      return {
        ...rest,
        ratingAverage: showReviews ? ratingMap.get(c.id)?.average ?? 0 : 0,
        ratingCount: showReviews ? ratingMap.get(c.id)?.count ?? 0 : 0,
        canManage: canManageCourse(c.ownerId),
      };
    };
    const withExpired = <T extends { id: string; ownerId?: string | null }>(
      c: T
    ) => ({
      ...withRating(c),
      isExpired: expiredSet.has(c.id),
      expiresAt: expiresAtMap.get(c.id) ?? null,
    });

    const t2 = Date.now();
    console.log(
      `[API /api/w/${params.slug}/init] auth+ws:${t1 - t0}ms query:${t2 - t1}ms total:${t2 - t0}ms`
    );

    return NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          points: user.points,
          level: user.level,
          role: user.role,
        },
        workspace: {
          id: workspace.id,
          slug: workspace.slug,
          name: workspace.name,
          logoUrl: workspace.logoUrl,
          loginBgColor: workspace.loginBgColor,
        },
        enrolled: enrolledCourses.map(withExpired),
        store: storeCourses.map(withRating),
        notifications: { unread: unreadCount },
      },
      {
        headers: {
          "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error(`GET /api/w/${params.slug}/init error:`, error);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}

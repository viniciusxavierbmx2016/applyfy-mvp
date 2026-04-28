import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  await requireAdmin();

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const dateFilter =
    startDate && endDate
      ? {
          createdAt: {
            gte: new Date(startDate + "T00:00:00"),
            lte: new Date(endDate + "T23:59:59"),
          },
        }
      : {};

  const producerFilter = { role: "PRODUCER" as const, ...dateFilter };

  const [byNiche, byBusinessType, byRevenue, bySource] = await Promise.all([
    prisma.user.groupBy({
      by: ["niche"],
      where: producerFilter,
      _count: true,
      orderBy: { _count: { niche: "desc" } },
    }),
    prisma.user.groupBy({
      by: ["businessType"],
      where: producerFilter,
      _count: true,
      orderBy: { _count: { businessType: "desc" } },
    }),
    prisma.user.groupBy({
      by: ["monthlyRevenue"],
      where: producerFilter,
      _count: true,
      orderBy: { _count: { monthlyRevenue: "desc" } },
    }),
    prisma.user.groupBy({
      by: ["referralSource"],
      where: producerFilter,
      _count: true,
      orderBy: { _count: { referralSource: "desc" } },
    }),
  ]);

  const [totalRegistered, completedOnboarding, createdCourse, hasStudents] =
    await Promise.all([
      prisma.user.count({ where: producerFilter }),
      prisma.user.count({ where: { ...producerFilter, niche: { not: null } } }),
      prisma.user.count({
        where: {
          ...producerFilter,
          ownedWorkspaces: { some: { courses: { some: {} } } },
        },
      }),
      prisma.user.count({
        where: {
          ...producerFilter,
          ownedWorkspaces: {
            some: { courses: { some: { enrollments: { some: {} } } } },
          },
        },
      }),
    ]);

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const growthByMonth = (await prisma.$queryRaw`
    SELECT
      TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') as month,
      COUNT(*) as count
    FROM "User"
    WHERE role = 'PRODUCER'
    AND "createdAt" >= ${twelveMonthsAgo}
    GROUP BY DATE_TRUNC('month', "createdAt")
    ORDER BY month
  `) as { month: string; count: bigint }[];

  return Response.json({
    distributions: {
      byNiche: byNiche.map((r) => ({
        label: r.niche || "Não informado",
        count: r._count,
      })),
      byBusinessType: byBusinessType.map((r) => ({
        label: r.businessType || "Não informado",
        count: r._count,
      })),
      byRevenue: byRevenue.map((r) => ({
        label: r.monthlyRevenue || "Não informado",
        count: r._count,
      })),
      bySource: bySource.map((r) => ({
        label: r.referralSource || "Não informado",
        count: r._count,
      })),
    },
    funnel: {
      registered: totalRegistered,
      completedOnboarding,
      createdCourse,
      hasStudents,
    },
    growth: growthByMonth.map((r) => ({
      month: r.month,
      count: Number(r.count),
    })),
  });
}

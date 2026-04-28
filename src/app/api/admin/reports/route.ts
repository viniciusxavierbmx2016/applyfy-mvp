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

  // === Financial metrics ===
  const activeSubscriptions = await prisma.subscription.findMany({
    where: { status: "ACTIVE" },
    include: { plan: { select: { price: true, name: true, interval: true } } },
  });

  const mrr = activeSubscriptions.reduce((sum, s) => {
    const price = s.plan?.price || 0;
    const interval = s.plan?.interval || "monthly";
    return sum + (interval === "yearly" ? price / 12 : price);
  }, 0);

  const arr = mrr * 12;
  const activeCount = activeSubscriptions.length;
  const arpu = activeCount > 0 ? mrr / activeCount : 0;

  const periodDateFilter =
    startDate && endDate
      ? {
          updatedAt: {
            gte: new Date(startDate + "T00:00:00"),
            lte: new Date(endDate + "T23:59:59"),
          },
        }
      : {};

  const cancelledInPeriod = await prisma.subscription.count({
    where: { status: "CANCELLED", ...periodDateFilter },
  });

  const totalAtStart = activeCount + cancelledInPeriod;
  const churnRate =
    totalAtStart > 0 ? (cancelledInPeriod / totalAtStart) * 100 : 0;
  const nrr = 100 - churnRate;

  let daysBetween = 30;
  if (startDate && endDate) {
    const s = new Date(startDate);
    const e = new Date(endDate);
    daysBetween = Math.max(
      1,
      Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24))
    );
  }
  const monthlyChurnRate = (churnRate / daysBetween) * 30;
  const ltv =
    monthlyChurnRate > 0 ? arpu / (monthlyChurnRate / 100) : arpu * 24;

  const revenueByPlan = await prisma.subscription.groupBy({
    by: ["planId"],
    where: { status: "ACTIVE" },
    _count: true,
  });

  const plans = await prisma.plan.findMany({
    select: { id: true, name: true, price: true, interval: true },
  });

  const planMap = new Map(plans.map((p) => [p.id, p]));
  const revenueByPlanData = revenueByPlan
    .map((r) => {
      const plan = planMap.get(r.planId);
      const price = plan?.price || 0;
      const interval = plan?.interval || "monthly";
      const monthlyPrice = interval === "yearly" ? price / 12 : price;
      return {
        planName: plan?.name || "Desconhecido",
        price: monthlyPrice,
        count: r._count,
        mrr: monthlyPrice * r._count,
      };
    })
    .sort((a, b) => b.mrr - a.mrr);

  const mrrHistory: { month: string; mrr: number; count: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);

    const activeSubs = await prisma.subscription.findMany({
      where: {
        createdAt: { lte: monthEnd },
        OR: [
          { status: "ACTIVE" },
          { status: "CANCELLED", cancelledAt: { gt: monthEnd } },
          { status: "SUSPENDED", suspendedAt: { gt: monthEnd } },
        ],
      },
      include: { plan: { select: { price: true, interval: true } } },
    });

    const monthMrr = activeSubs.reduce((sum, s) => {
      const price = s.plan?.price || 0;
      const interval = s.plan?.interval || "monthly";
      return sum + (interval === "yearly" ? price / 12 : price);
    }, 0);

    const label = `${String(monthStart.getMonth() + 1).padStart(2, "0")}/${monthStart.getFullYear()}`;
    mrrHistory.push({ month: label, mrr: monthMrr, count: activeSubs.length });
  }

  const currentMrr = mrrHistory[mrrHistory.length - 1]?.mrr || 0;
  const previousMrr = mrrHistory[mrrHistory.length - 2]?.mrr || 0;
  const mrrGrowthRate =
    previousMrr > 0 ? ((currentMrr - previousMrr) / previousMrr) * 100 : 0;

  const newSubsCreatedFilter =
    startDate && endDate
      ? {
          createdAt: {
            gte: new Date(startDate + "T00:00:00"),
            lte: new Date(endDate + "T23:59:59"),
          },
        }
      : {};

  const newSubsInPeriod = await prisma.subscription.count({
    where: { status: "ACTIVE", ...newSubsCreatedFilter },
  });

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
    financial: {
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(arr * 100) / 100,
      arpu: Math.round(arpu * 100) / 100,
      churnRate: Number(churnRate.toFixed(2)),
      nrr: Number(nrr.toFixed(2)),
      ltv: Number(ltv.toFixed(2)),
      mrrGrowthRate: Number(mrrGrowthRate.toFixed(2)),
      activeSubscriptions: activeCount,
      cancelledInPeriod,
      newSubscriptions: newSubsInPeriod,
      revenueByPlan: revenueByPlanData,
      mrrHistory,
    },
  });
}

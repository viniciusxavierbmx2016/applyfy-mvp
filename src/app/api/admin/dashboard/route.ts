import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function parseDate(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const sp = req.nextUrl.searchParams;
    const startDate = parseDate(sp.get("startDate"));
    const endDate = parseDate(sp.get("endDate"));
    const producerId = sp.get("producerId") || null;

    const now = new Date();
    const rangeStart = startDate || new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const rangeEnd = endDate ? endOfDay(endDate) : endOfDay(now);

    const producerWhere = producerId ? { id: producerId, role: "PRODUCER" as const } : { role: "PRODUCER" as const };

    const [
      totalProducers,
      newProducersInRange,
      activeSubs,
      pastDueSubs,
      suspendedSubs,
      cancelledInRange,
      allPlans,
      producersList,
    ] = await Promise.all([
      prisma.user.count({ where: producerWhere }),

      prisma.user.count({
        where: {
          ...producerWhere,
          createdAt: { gte: rangeStart, lte: rangeEnd },
        },
      }),

      prisma.subscription.findMany({
        where: {
          status: "ACTIVE",
          ...(producerId ? { userId: producerId } : {}),
        },
        select: {
          userId: true,
          plan: { select: { id: true, name: true, price: true } },
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
      }),

      prisma.subscription.count({
        where: {
          status: "PAST_DUE",
          ...(producerId ? { userId: producerId } : {}),
        },
      }),

      prisma.subscription.count({
        where: {
          status: "SUSPENDED",
          ...(producerId ? { userId: producerId } : {}),
        },
      }),

      prisma.subscription.count({
        where: {
          status: "CANCELLED",
          cancelledAt: { gte: rangeStart, lte: rangeEnd },
          ...(producerId ? { userId: producerId } : {}),
        },
      }),

      prisma.plan.findMany({
        where: { active: true },
        select: { id: true, name: true, price: true },
        orderBy: { price: "asc" },
      }),

      prisma.user.findMany({
        where: { role: "PRODUCER" },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const activeProducers = new Set(activeSubs.map((s) => s.userId)).size;
    const mrr = activeSubs.reduce((sum, s) => sum + (s.plan?.price || 0), 0);
    const avgTicket = activeProducers > 0 ? mrr / activeProducers : 0;

    // Top 7 producers by plan price
    const producerRevMap = new Map<string, { user: typeof activeSubs[0]["user"]; revenue: number }>();
    for (const s of activeSubs) {
      const price = s.plan?.price || 0;
      const existing = producerRevMap.get(s.userId);
      if (existing) {
        existing.revenue += price;
      } else {
        producerRevMap.set(s.userId, { user: s.user, revenue: price });
      }
    }
    const topProducers = Array.from(producerRevMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 7)
      .map((p) => ({
        id: p.user.id,
        name: p.user.name,
        email: p.user.email,
        avatarUrl: p.user.avatarUrl,
        revenue: Math.round(p.revenue * 100) / 100,
      }));

    // Plan distribution (ACTIVE subs)
    const planCountMap = new Map<string, number>();
    for (const s of activeSubs) {
      const planId = s.plan?.id || "unknown";
      planCountMap.set(planId, (planCountMap.get(planId) || 0) + 1);
    }
    const totalActiveSubs = activeSubs.length;
    const planDistribution = allPlans.map((p) => {
      const count = planCountMap.get(p.id) || 0;
      return {
        planId: p.id,
        planName: p.name,
        price: p.price,
        count,
        percentage: totalActiveSubs > 0 ? Math.round((count / totalActiveSubs) * 10000) / 100 : 0,
      };
    });

    // Daily chart: new producers + cancellations (max 90 days)
    const maxChartDays = 90;
    const diffMs = rangeEnd.getTime() - rangeStart.getTime();
    const diffDays = Math.min(Math.ceil(diffMs / (1000 * 60 * 60 * 24)), maxChartDays);
    const chartStart = new Date(rangeEnd.getTime() - diffDays * 24 * 60 * 60 * 1000);

    const [newProducersDaily, cancellationsDaily] = await Promise.all([
      prisma.user.findMany({
        where: {
          ...producerWhere,
          createdAt: { gte: chartStart, lte: rangeEnd },
        },
        select: { createdAt: true },
      }),
      prisma.subscription.findMany({
        where: {
          status: "CANCELLED",
          cancelledAt: { gte: chartStart, lte: rangeEnd },
          ...(producerId ? { userId: producerId } : {}),
        },
        select: { cancelledAt: true },
      }),
    ]);

    const dayMap = new Map<string, { newProducers: number; cancellations: number }>();
    for (let i = 0; i <= diffDays; i++) {
      const d = new Date(chartStart.getTime() + i * 24 * 60 * 60 * 1000);
      dayMap.set(isoDay(d), { newProducers: 0, cancellations: 0 });
    }
    for (const p of newProducersDaily) {
      const key = isoDay(p.createdAt);
      const entry = dayMap.get(key);
      if (entry) entry.newProducers++;
    }
    for (const c of cancellationsDaily) {
      if (!c.cancelledAt) continue;
      const key = isoDay(c.cancelledAt);
      const entry = dayMap.get(key);
      if (entry) entry.cancellations++;
    }
    const chart = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data }));

    return NextResponse.json({
      kpis: {
        mrr: Math.round(mrr * 100) / 100,
        activeProducers,
        newProducers: newProducersInRange,
        churn: cancelledInRange,
        avgTicket: Math.round(avgTicket * 100) / 100,
        pastDue: pastDueSubs,
        totalProducers,
        suspended: suspendedSubs,
      },
      chart,
      topProducers,
      planDistribution,
      producers: producersList,
    });
  } catch (error) {
    console.error("GET /api/admin/dashboard error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

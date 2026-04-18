import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalActive,
      totalPastDue,
      totalSuspended,
      totalCancelled,
      totalPending,
      totalExempt,
      activeWithPlan,
      paidThisMonth,
      cancelledThisMonth,
    ] = await Promise.all([
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.subscription.count({ where: { status: "PAST_DUE" } }),
      prisma.subscription.count({ where: { status: "SUSPENDED" } }),
      prisma.subscription.count({ where: { status: "CANCELLED" } }),
      prisma.subscription.count({ where: { status: "PENDING" } }),
      prisma.subscription.count({ where: { exempt: true, status: "ACTIVE" } }),
      prisma.subscription.findMany({
        where: { status: "ACTIVE", exempt: false },
        include: { plan: { select: { price: true } } },
      }),
      prisma.invoice.aggregate({
        where: { status: "PAID", paidAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
      prisma.subscription.count({
        where: { status: "CANCELLED", cancelledAt: { gte: monthStart } },
      }),
    ]);

    const mrr = activeWithPlan.reduce((sum, s) => sum + s.plan.price, 0);

    return NextResponse.json({
      totalActive,
      totalTrialing: 0,
      totalPastDue,
      totalSuspended,
      totalCancelled,
      totalPending,
      totalExempt,
      mrr,
      revenueThisMonth: paidThisMonth._sum.amount || 0,
      churnThisMonth: cancelledThisMonth,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro interno" }, { status });
  }
}

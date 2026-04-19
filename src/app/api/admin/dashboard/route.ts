import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(d: Date) {
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

export async function GET() {
  try {
    await requireAdmin();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalProducers,
      totalStudents,
      totalCourses,
      activeProducers,
      recentProducers,
      activeSubs,
      allSubs,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "PRODUCER" } }),
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.course.count(),
      prisma.user.count({
        where: { role: "PRODUCER", updatedAt: { gte: thirtyDaysAgo } },
      }),
      prisma.user.findMany({
        where: { role: "PRODUCER" },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          createdAt: true,
        },
      }),
      prisma.subscription.findMany({
        where: { status: "ACTIVE" },
        select: { userId: true, plan: { select: { price: true } } },
      }),
      prisma.subscription.findMany({
        select: {
          userId: true,
          status: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          createdAt: true,
          plan: { select: { price: true } },
        },
      }),
    ]);

    const mrr = activeSubs.reduce((s, x) => s + (x.plan?.price || 0), 0);
    const paidProducers = new Set(
      activeSubs.filter((s) => (s.plan?.price || 0) > 0).map((s) => s.userId)
    ).size;
    const activeSubProducers = new Set(activeSubs.map((s) => s.userId)).size;
    const freeProducers = Math.max(0, totalProducers - paidProducers);

    const now = new Date();
    const months: Array<{ key: string; label: string; date: Date }> = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: monthKey(d), label: monthLabel(d), date: d });
    }
    const monthlyRevenue = months.map((m) => {
      const endOfMonth = new Date(m.date.getFullYear(), m.date.getMonth() + 1, 0, 23, 59, 59);
      let revenue = 0;
      for (const s of allSubs) {
        const started = s.currentPeriodStart || s.createdAt;
        if (started > endOfMonth) continue;
        const expires = s.currentPeriodEnd;
        if (expires && expires < m.date) continue;
        if (s.status === "CANCELLED" && started < m.date) continue;
        revenue += s.plan?.price || 0;
      }
      return { month: m.label, revenue: Math.round(revenue * 100) / 100 };
    });

    // Top producers by student count
    const workspaces = await prisma.workspace.findMany({
      select: { id: true, ownerId: true },
    });
    const ownerByWs = new Map(workspaces.map((w) => [w.id, w.ownerId]));
    const enrollments = await prisma.enrollment.findMany({
      where: { status: "ACTIVE" },
      select: { userId: true, course: { select: { workspaceId: true } } },
    });
    const studentsByProducer = new Map<string, Set<string>>();
    for (const e of enrollments) {
      const ownerId = ownerByWs.get(e.course.workspaceId);
      if (!ownerId) continue;
      if (!studentsByProducer.has(ownerId))
        studentsByProducer.set(ownerId, new Set());
      studentsByProducer.get(ownerId)!.add(e.userId);
    }
    const topOwnerEntries = Array.from(studentsByProducer.entries())
      .map(([ownerId, set]) => ({ ownerId, students: set.size }))
      .sort((a, b) => b.students - a.students)
      .slice(0, 5);
    const topOwnerIds = topOwnerEntries.map((t) => t.ownerId);
    const topOwners = topOwnerIds.length
      ? await prisma.user.findMany({
          where: { id: { in: topOwnerIds } },
          select: { id: true, name: true, email: true, avatarUrl: true },
        })
      : [];
    const topProducers = topOwnerEntries.map((t) => {
      const u = topOwners.find((o) => o.id === t.ownerId);
      return {
        id: t.ownerId,
        name: u?.name || "",
        email: u?.email || "",
        avatarUrl: u?.avatarUrl || null,
        students: t.students,
      };
    });

    return NextResponse.json({
      metrics: {
        totalProducers,
        totalStudents,
        totalCourses,
        activeProducers,
      },
      revenue: {
        mrr: Math.round(mrr * 100) / 100,
        paidProducers,
        freeProducers,
        activeSubProducers,
      },
      monthlyRevenue,
      recentProducers,
      topProducers,
    });
  } catch (error) {
    console.error("GET /api/admin/dashboard error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

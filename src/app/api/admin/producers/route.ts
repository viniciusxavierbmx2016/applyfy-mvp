import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();

    const producers = await prisma.user.findMany({
      where: {
        role: "PRODUCER",
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    const producerIds = producers.map((p) => p.id);

    const [workspaces, subs] = await Promise.all([
      prisma.workspace.findMany({
        where: { ownerId: { in: producerIds } },
        select: {
          id: true,
          ownerId: true,
          isActive: true,
        },
      }),
      prisma.subscription.findMany({
        where: { userId: { in: producerIds }, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        select: { userId: true, plan: { select: { name: true, price: true } }, status: true },
      }),
    ]);

    const workspaceIds = workspaces.map((w) => w.id);

    const [courses, enrollments] = await Promise.all([
      prisma.course.groupBy({
        by: ["workspaceId"],
        where: { workspaceId: { in: workspaceIds } },
        _count: { _all: true },
      }),
      prisma.enrollment.findMany({
        where: {
          status: "ACTIVE",
          course: { workspaceId: { in: workspaceIds } },
        },
        select: { userId: true, course: { select: { workspaceId: true } } },
      }),
    ]);

    const courseCountByWs = new Map(
      courses.map((c) => [c.workspaceId, c._count._all])
    );
    const studentsByWs = new Map<string, Set<string>>();
    for (const e of enrollments) {
      const ws = e.course.workspaceId;
      if (!studentsByWs.has(ws)) studentsByWs.set(ws, new Set());
      studentsByWs.get(ws)!.add(e.userId);
    }

    const producerWorkspaces = new Map<
      string,
      { id: string; isActive: boolean }[]
    >();
    for (const w of workspaces) {
      if (!producerWorkspaces.has(w.ownerId))
        producerWorkspaces.set(w.ownerId, []);
      producerWorkspaces.get(w.ownerId)!.push({ id: w.id, isActive: w.isActive });
    }

    const subByProducer = new Map<string, { plan: string; amount: number }>();
    for (const s of subs) {
      if (!subByProducer.has(s.userId))
        subByProducer.set(s.userId, { plan: s.plan.name, amount: s.plan.price });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const list = producers.map((p) => {
      const wss = producerWorkspaces.get(p.id) || [];
      let totalCourses = 0;
      const studentIds = new Set<string>();
      let anyActive = wss.length === 0;
      for (const w of wss) {
        if (w.isActive) anyActive = true;
        totalCourses += courseCountByWs.get(w.id) || 0;
        const set = studentsByWs.get(w.id);
        if (set) set.forEach((uid) => studentIds.add(uid));
      }
      return {
        id: p.id,
        name: p.name,
        email: p.email,
        avatarUrl: p.avatarUrl,
        createdAt: p.createdAt,
        workspaceCount: wss.length,
        courseCount: totalCourses,
        studentCount: studentIds.size,
        status: wss.length > 0 && !anyActive ? "SUSPENDED" : "ACTIVE",
        subscription: subByProducer.get(p.id) || null,
      };
    });

    const total = list.length;
    const newLast30 = list.filter((p) => p.createdAt >= thirtyDaysAgo).length;
    const activeWithCourse = list.filter((p) => p.courseCount > 0).length;

    return NextResponse.json({
      producers: list,
      metrics: {
        total,
        newLast30,
        activeWithCourse,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/producers error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

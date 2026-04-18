import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";

export async function GET() {
  try {
    const staff = await requireStaff();

    const subscription = await prisma.subscription.findFirst({
      where: { userId: staff.id },
      orderBy: { createdAt: "desc" },
      include: {
        plan: true,
        invoices: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });

    const plans = await prisma.plan.findMany({
      where: { active: true },
      orderBy: { price: "asc" },
    });

    const workspacesUsed = await prisma.workspace.count({
      where: { ownerId: staff.id },
    });

    const workspaces = await prisma.workspace.findMany({
      where: { ownerId: staff.id },
      select: { id: true },
    });
    const wsIds = workspaces.map((w) => w.id);

    const coursesUsed = wsIds.length
      ? await prisma.course.count({ where: { workspaceId: { in: wsIds } } })
      : 0;

    return NextResponse.json({
      subscription,
      plans,
      usage: { workspacesUsed, coursesUsed },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro interno" }, { status });
  }
}

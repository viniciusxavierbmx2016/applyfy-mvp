import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logger } from "@/lib/logger";

const PAGE_SIZE = 20;

export async function GET(request: Request) {
  const t0 = Date.now();
  try {
    const user = await getCurrentUser();
    const t1 = Date.now();
    if (!user) {
      logger.debug("API /api/notifications", `auth:${t1 - t0}ms total:${t1 - t0}ms (unauth)`);
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const skip = (page - 1) * PAGE_SIZE;

    // Workspace isolation: when the caller passes ?workspace=<slug> (the
    // student shell does), return only notifications scoped to that workspace
    // plus globals (workspaceId IS NULL). Without the param (producer/admin
    // header) return everything for the user — current behavior preserved.
    const workspaceSlug = searchParams.get("workspace")?.trim() || null;
    let workspaceFilter: { OR: Array<{ workspaceId: string | null }> } | object = {};
    if (workspaceSlug) {
      const ws = await prisma.workspace.findUnique({
        where: { slug: workspaceSlug },
        select: { id: true },
      });
      if (ws) {
        workspaceFilter = {
          OR: [{ workspaceId: ws.id }, { workspaceId: null }],
        };
      }
      // Unknown slug → fall through to user-only (no leak: still filtered by userId).
    }
    const where = { userId: user.id, ...workspaceFilter };

    const [items, total, unread] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: PAGE_SIZE,
        select: {
          id: true,
          type: true,
          message: true,
          link: true,
          read: true,
          createdAt: true,
        },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { ...where, read: false },
      }),
    ]);

    const t2 = Date.now();
    logger.debug(
      "API /api/notifications",
      `auth:${t1 - t0}ms query:${t2 - t1}ms total:${t2 - t0}ms`
    );
    return NextResponse.json({
      notifications: items,
      page,
      pageSize: PAGE_SIZE,
      total,
      unread,
      hasMore: skip + items.length < total,
    });
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}

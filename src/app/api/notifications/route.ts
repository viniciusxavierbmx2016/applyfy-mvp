import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const PAGE_SIZE = 20;

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const skip = (page - 1) * PAGE_SIZE;

    const [items, total, unread] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: user.id },
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
      prisma.notification.count({ where: { userId: user.id } }),
      prisma.notification.count({
        where: { userId: user.id, read: false },
      }),
    ]);

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

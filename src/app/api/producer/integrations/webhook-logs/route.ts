import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const staff = await requireStaff();

    const { searchParams } = new URL(request.url);
    const event = searchParams.get("event")?.trim();
    const take = Math.min(Number(searchParams.get("limit") || 50), 200);

    const where: Record<string, unknown> = {};
    if (event && event !== "ALL") where.event = event;

    if (staff.role === "PRODUCER") {
      const owned = await prisma.course.findMany({
        where: { ownerId: staff.id },
        select: { id: true, externalProductId: true },
      });
      const ownedIds = owned.map((c) => c.id);
      const ownedExternal = owned
        .map((c) => c.externalProductId)
        .filter((v): v is string => !!v);

      if (ownedIds.length === 0 && ownedExternal.length === 0) {
        return NextResponse.json({ logs: [] });
      }

      where.OR = [
        { courseId: { in: ownedIds } },
        { productExternalId: { in: ownedExternal } },
      ];
    }

    const logs = await prisma.webhookLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

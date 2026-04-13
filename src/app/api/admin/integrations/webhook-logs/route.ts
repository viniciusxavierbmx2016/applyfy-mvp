import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const event = searchParams.get("event")?.trim();
    const take = Math.min(Number(searchParams.get("limit") || 50), 200);

    const logs = await prisma.webhookLog.findMany({
      where: event && event !== "ALL" ? { event } : undefined,
      orderBy: { createdAt: "desc" },
      take,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

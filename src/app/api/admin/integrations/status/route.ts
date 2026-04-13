import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();

    const rows = await prisma.settings.findMany({
      where: { key: { in: ["applyfy_token"] } },
      select: { key: true, value: true },
    });

    const map = new Map(rows.map((r) => [r.key, r.value]));

    return NextResponse.json({
      gateways: {
        applyfy: {
          connected: !!(map.get("applyfy_token") || "").length,
        },
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

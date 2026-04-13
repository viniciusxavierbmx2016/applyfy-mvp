import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();

    const [rows, pendingRequests] = await Promise.all([
      prisma.settings.findMany({
        where: { key: { in: ["applyfy_token", "applyfy_logo_url"] } },
        select: { key: true, value: true },
      }),
      prisma.integrationRequest.count({ where: { status: "PENDING" } }),
    ]);

    const map = new Map(rows.map((r) => [r.key, r.value]));

    return NextResponse.json({
      gateways: {
        applyfy: {
          connected: !!(map.get("applyfy_token") || "").length,
          logoUrl: map.get("applyfy_logo_url") || null,
        },
      },
      pendingRequests,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";

export async function GET() {
  try {
    const staff = await requireStaff();
    const isAdmin = staff.role === "ADMIN";

    const [rows, pendingRequests] = await Promise.all([
      prisma.settings.findMany({
        where: { key: { in: ["applyfy_token", "applyfy_logo_url"] } },
        select: { key: true, value: true },
      }),
      isAdmin
        ? prisma.integrationRequest.count({ where: { status: "PENDING" } })
        : Promise.resolve(0),
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
      viewerRole: staff.role,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

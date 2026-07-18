import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { requireAdminPerm } from "@/lib/admin-permissions-server";

// 2.4 Peça B.1 — leitura do OriginLockLog pro admin (molde de /api/admin/audit).
// Gate reusado VIEW_AUDIT (mesma audiência: log de segurança). Retorna o agregado
// por (path, reason) + as últimas ocorrências.
const PAGE_SIZE = 50;

export async function GET(req: Request) {
  const limited = await rateLimit(req);
  if (limited) return limited;

  try {
    await requireAdminPerm("VIEW_AUDIT");

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);

    const [logs, total, grouped] = await Promise.all([
      prisma.originLockLog.findMany({
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
      }),
      prisma.originLockLog.count(),
      prisma.originLockLog.groupBy({
        by: ["path", "reason"],
        _count: { _all: true },
        _max: { createdAt: true },
        orderBy: { _count: { path: "desc" } },
        take: 100,
      }),
    ]);

    const aggregate = grouped.map((g) => ({
      path: g.path,
      reason: g.reason,
      count: g._count._all,
      lastSeen: g._max.createdAt,
    }));

    return NextResponse.json({
      logs,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      aggregate,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

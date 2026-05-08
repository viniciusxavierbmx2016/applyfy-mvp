import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { resolveStaffWorkspace } from "@/lib/workspace";

export async function GET() {
  try {
    const staff = await requireStaff();
    const isAdmin = staff.role === "ADMIN";
    const { workspace } = await resolveStaffWorkspace(staff);

    // Token is scoped per-workspace (`applyfy_token:<workspaceId>`).
    // Logo is still global today; if the producer has no workspace there is
    // no scope to read a token from, so the gateway shows "Não configurado".
    const tokenKey = workspace ? `applyfy_token:${workspace.id}` : null;
    const settingKeys = ["applyfy_logo_url"];
    if (tokenKey) settingKeys.push(tokenKey);

    const [rows, pendingRequests] = await Promise.all([
      prisma.settings.findMany({
        where: { key: { in: settingKeys } },
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
          connected: tokenKey ? !!(map.get(tokenKey) || "").length : false,
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

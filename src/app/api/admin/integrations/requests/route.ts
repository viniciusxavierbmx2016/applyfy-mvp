import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminPerm } from "@/lib/admin-permissions-server";

export async function GET() {
  try {
    await requireAdminPerm("FULL_ACCESS");
    const requests = await prisma.integrationRequest.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
    const pendingCount = requests.filter((r) => r.status === "PENDING").length;
    return NextResponse.json({ requests, pendingCount });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

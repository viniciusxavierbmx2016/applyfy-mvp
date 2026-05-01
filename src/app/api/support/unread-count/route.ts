import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminPerm } from "@/lib/admin-permissions-server";

// Returns how many non-closed tickets have a message newer than
// lastReadByAdminAt. The admin team shares one read-state (design D5), so
// this number is the same for every admin/SUPPORT collaborator.
export async function GET() {
  try {
    await requireAdminPerm("SUPPORT");
    const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint AS count
       FROM "SupportTicket"
       WHERE status <> 'CLOSED'
         AND ("lastReadByAdminAt" IS NULL OR "lastReadByAdminAt" < "lastMessageAt")`
    );
    const count = Number(rows[0]?.count ?? 0);
    return NextResponse.json({ count });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro";
    const code =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}

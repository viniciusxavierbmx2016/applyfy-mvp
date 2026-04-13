import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireStaff } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const requests = await prisma.integrationRequest.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
    const pendingCount = requests.filter((r) => r.status === "PENDING").length;
    return NextResponse.json({ requests, pendingCount });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

export async function POST(request: Request) {
  try {
    await requireStaff();

    const body = await request.json().catch(() => ({}));
    const gateway = typeof body?.gateway === "string" ? body.gateway.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const notes =
      typeof body?.notes === "string" && body.notes.trim().length > 0
        ? body.notes.trim().slice(0, 2000)
        : null;

    if (!gateway) {
      return NextResponse.json({ error: "Nome do gateway obrigatório" }, { status: 400 });
    }
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    const created = await prisma.integrationRequest.create({
      data: { gateway: gateway.slice(0, 100), email: email.toLowerCase(), notes },
    });

    return NextResponse.json({ request: created }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    console.error("POST /api/admin/integrations/requests error:", error);
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

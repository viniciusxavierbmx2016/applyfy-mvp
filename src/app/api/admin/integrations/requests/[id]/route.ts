import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminPerm } from "@/lib/admin-permissions-server";
import { integrationRequestStatusSchema, validateBody } from "@/lib/validations";

const VALID_STATUSES = ["PENDING", "REVIEWING", "COMPLETED"] as const;
type Status = (typeof VALID_STATUSES)[number];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminPerm("FULL_ACCESS");
    const { id } = await params;

    const raw = await request.json().catch(() => ({}));
    const v = validateBody(integrationRequestStatusSchema, raw);
    if (!v.success) return v.error;
    const status = v.data.status;
    if (!VALID_STATUSES.includes(status as Status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }

    const updated = await prisma.integrationRequest.update({
      where: { id },
      data: { status: status as Status },
    });
    return NextResponse.json({ request: updated });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

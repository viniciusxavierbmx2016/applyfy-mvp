import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, requirePermission } from "@/lib/auth";
import { reorderItemsSchema, validateBody } from "@/lib/validations";

export async function PUT(request: Request) {
  try {
    const staff = await requireStaff();
    if (staff.role === "COLLABORATOR") {
      await requirePermission(staff, "MANAGE_COMMUNITY");
    }

    const raw = await request.json().catch(() => ({}));
    const v = validateBody(reorderItemsSchema, raw);
    if (!v.success) return v.error;
    const items = v.data.items;
    if (items.length === 0) {
      return NextResponse.json(
        { error: "items é obrigatório" },
        { status: 400 }
      );
    }

    await prisma.$transaction(
      items.map((item: { id: string; order: number }) =>
        prisma.communityGroup.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/producer/community/groups/reorder error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

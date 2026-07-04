import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canEditCourse, requireStaff } from "@/lib/auth";
import { menuReorderSchema, validateBody } from "@/lib/validations";

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const staff = await requireStaff();
    if (!(await canEditCourse(staff, params.id))) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }
    const raw = await request.json().catch(() => ({}));
    const v = validateBody(menuReorderSchema, raw);
    if (!v.success) return v.error;
    const { itemIds } = v.data;
    const ops: Prisma.PrismaPromise<unknown>[] = itemIds.map(
      (id: string, index: number) =>
        prisma.menuItem.update({
          where: { id, courseId: params.id },
          data: { order: index },
        })
    );
    await prisma.$transaction(ops);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reorder menu error:", error);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}

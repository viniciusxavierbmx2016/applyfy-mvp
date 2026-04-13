import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEditCourse, requireStaff } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const staff = await requireStaff();
    if (!(await canEditCourse(staff, params.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { moduleIds } = await request.json();
    if (!Array.isArray(moduleIds)) {
      return NextResponse.json(
        { error: "moduleIds deve ser um array" },
        { status: 400 }
      );
    }

    await prisma.$transaction(
      moduleIds.map((id: string, index: number) =>
        prisma.module.update({
          where: { id, courseId: params.id },
          data: { order: index },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reorder modules error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

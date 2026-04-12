import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// Reorder modules inside a course
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

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
    return NextResponse.json(
      { error: "Erro ao reordenar módulos" },
      { status: 500 }
    );
  }
}

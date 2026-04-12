import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const { lessonIds } = await request.json();
    if (!Array.isArray(lessonIds)) {
      return NextResponse.json(
        { error: "lessonIds deve ser um array" },
        { status: 400 }
      );
    }

    await prisma.$transaction(
      lessonIds.map((id: string, index: number) =>
        prisma.lesson.update({
          where: { id, moduleId: params.id },
          data: { order: index },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reorder lessons error:", error);
    return NextResponse.json(
      { error: "Erro ao reordenar aulas" },
      { status: 500 }
    );
  }
}

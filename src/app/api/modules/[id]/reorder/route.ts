import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEditModule, requireStaff } from "@/lib/auth";

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const staff = await requireStaff();
    if (!(await canEditModule(staff, params.id))) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }
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
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

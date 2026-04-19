import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canEditCourse, requireStaff } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const staff = await requireStaff();
    if (!(await canEditCourse(staff, params.id))) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await request.json();

    // New: items = [{ type: 'section'|'module', id }]
    if (Array.isArray(body.items)) {
      const items = body.items as Array<{ type: string; id: string }>;
      let currentSectionId: string | null = null;
      let moduleIndex = 0;
      let sectionIndex = 0;
      const ops: Prisma.PrismaPromise<unknown>[] = [];
      for (const item of items) {
        if (item.type === "section") {
          currentSectionId = item.id;
          ops.push(
            prisma.section.update({
              where: { id: item.id, courseId: params.id },
              data: { order: sectionIndex++ },
            })
          );
        } else if (item.type === "module") {
          ops.push(
            prisma.module.update({
              where: { id: item.id, courseId: params.id },
              data: { order: moduleIndex++, sectionId: currentSectionId },
            })
          );
        }
      }
      await prisma.$transaction(ops);
      return NextResponse.json({ success: true });
    }

    // Legacy: moduleIds only
    const { moduleIds } = body;
    if (!Array.isArray(moduleIds)) {
      return NextResponse.json(
        { error: "items ou moduleIds obrigatórios" },
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
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

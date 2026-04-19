import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const staff = await requireStaff();

    const course = await prisma.course.findUnique({
      where: { id: params.id },
      select: { id: true, ownerId: true, title: true },
    });
    if (!course) {
      return NextResponse.json(
        { error: "Curso não encontrado" },
        { status: 404 }
      );
    }
    if (staff.role === "PRODUCER" && course.ownerId !== staff.id) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const raw = body?.externalProductId;
    const externalProductId =
      typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;

    if (externalProductId) {
      const conflict = await prisma.course.findFirst({
        where: {
          externalProductId,
          NOT: { id: params.id },
        },
        select: { id: true, title: true },
      });
      if (conflict) {
        return NextResponse.json(
          {
            error: `externalProductId já usado pelo curso "${conflict.title}"`,
          },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.course.update({
      where: { id: params.id },
      data: { externalProductId },
      select: {
        id: true,
        title: true,
        slug: true,
        externalProductId: true,
        isPublished: true,
      },
    });

    return NextResponse.json({ course: updated });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    console.error("PATCH /api/admin/integrations/courses/[id] error:", error);
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

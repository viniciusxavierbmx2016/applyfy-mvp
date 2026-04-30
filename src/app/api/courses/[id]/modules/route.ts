import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEditCourse, requireStaff } from "@/lib/auth";

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const staff = await requireStaff();
    if (!(await canEditCourse(staff, params.id))) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const { title, daysToRelease } = await request.json();
    if (!title) {
      return NextResponse.json(
        { error: "Título é obrigatório" },
        { status: 400 }
      );
    }

    const lastModule = await prisma.module.findFirst({
      where: { courseId: params.id },
      orderBy: { order: "desc" },
    });

    const newModule = await prisma.module.create({
      data: {
        title,
        courseId: params.id,
        order: (lastModule?.order ?? -1) + 1,
        daysToRelease:
          typeof daysToRelease === "number" && daysToRelease >= 0
            ? Math.floor(daysToRelease)
            : 0,
      },
      include: { lessons: true },
    });

    return NextResponse.json({ module: newModule }, { status: 201 });
  } catch (error) {
    console.error("POST module error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

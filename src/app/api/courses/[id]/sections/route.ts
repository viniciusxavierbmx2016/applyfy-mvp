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
    const { title } = await request.json();
    if (!title?.trim()) {
      return NextResponse.json({ error: "Título obrigatório" }, { status: 400 });
    }

    const last = await prisma.section.findFirst({
      where: { courseId: params.id },
      orderBy: { order: "desc" },
    });

    const section = await prisma.section.create({
      data: {
        title: title.trim(),
        courseId: params.id,
        order: (last?.order ?? -1) + 1,
      },
    });

    return NextResponse.json({ section }, { status: 201 });
  } catch (error) {
    console.error("POST section error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

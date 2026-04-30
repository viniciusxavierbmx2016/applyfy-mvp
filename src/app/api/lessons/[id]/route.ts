import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEditLesson, requireStaff } from "@/lib/auth";

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const staff = await requireStaff();
    if (!(await canEditLesson(staff, params.id))) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }
    const { title, description, videoUrl, duration, daysToRelease } =
      await request.json();

    const lesson = await prisma.lesson.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(videoUrl !== undefined && { videoUrl }),
        ...(duration !== undefined && {
          duration: duration ? Number(duration) : null,
        }),
        ...(typeof daysToRelease === "number" && daysToRelease >= 0 && {
          daysToRelease: Math.floor(daysToRelease),
        }),
      },
    });

    return NextResponse.json({ lesson });
  } catch (error) {
    console.error("PUT lesson error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

export async function DELETE(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const staff = await requireStaff();
    if (!(await canEditLesson(staff, params.id))) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }
    await prisma.lesson.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE lesson error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

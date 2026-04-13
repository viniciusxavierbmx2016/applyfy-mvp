import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEditModule, requireStaff } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const staff = await requireStaff();
    if (!(await canEditModule(staff, params.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { title, description, videoUrl, duration } = await request.json();
    if (!title || !videoUrl) {
      return NextResponse.json(
        { error: "Título e videoUrl são obrigatórios" },
        { status: 400 }
      );
    }

    const lastLesson = await prisma.lesson.findFirst({
      where: { moduleId: params.id },
      orderBy: { order: "desc" },
    });

    const lesson = await prisma.lesson.create({
      data: {
        title,
        description: description || null,
        videoUrl,
        duration: duration ? Number(duration) : null,
        moduleId: params.id,
        order: (lastLesson?.order ?? -1) + 1,
      },
    });

    return NextResponse.json({ lesson }, { status: 201 });
  } catch (error) {
    console.error("POST lesson error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

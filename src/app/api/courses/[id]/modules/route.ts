import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const { title } = await request.json();
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
      },
      include: { lessons: true },
    });

    return NextResponse.json({ module: newModule }, { status: 201 });
  } catch (error) {
    console.error("POST module error:", error);
    return NextResponse.json(
      { error: "Erro ao criar módulo" },
      { status: 500 }
    );
  }
}

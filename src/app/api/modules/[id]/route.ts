import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const { title } = await request.json();

    const updated = await prisma.module.update({
      where: { id: params.id },
      data: { ...(title !== undefined && { title }) },
    });

    return NextResponse.json({ module: updated });
  } catch (error) {
    console.error("PUT module error:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar módulo" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    await prisma.module.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE module error:", error);
    return NextResponse.json(
      { error: "Erro ao excluir módulo" },
      { status: 500 }
    );
  }
}

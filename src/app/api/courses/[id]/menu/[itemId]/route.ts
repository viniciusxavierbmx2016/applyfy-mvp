import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEditCourse, requireStaff } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const staff = await requireStaff();
    if (!(await canEditCourse(staff, params.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const item = await prisma.menuItem.findUnique({
      where: { id: params.itemId },
    });
    if (!item || item.courseId !== params.id) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const data: {
      label?: string;
      icon?: string;
      url?: string;
      enabled?: boolean;
    } = {};
    if (typeof body.label === "string") data.label = body.label;
    if (typeof body.icon === "string") data.icon = body.icon;
    if (typeof body.url === "string" && !item.isDefault) data.url = body.url;
    if (typeof body.enabled === "boolean") {
      // Defaults Home e Continuar sempre enabled
      if (!item.isDefault || item.label === "Comunidade") {
        data.enabled = body.enabled;
      }
    }

    const updated = await prisma.menuItem.update({
      where: { id: params.itemId },
      data,
    });
    return NextResponse.json({ item: updated });
  } catch (error) {
    console.error("PATCH menu error:", error);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const staff = await requireStaff();
    if (!(await canEditCourse(staff, params.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const item = await prisma.menuItem.findUnique({
      where: { id: params.itemId },
    });
    if (!item || item.courseId !== params.id) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }
    if (item.isDefault) {
      return NextResponse.json(
        { error: "Item padrão não pode ser removido" },
        { status: 400 }
      );
    }
    await prisma.menuItem.delete({ where: { id: params.itemId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE menu error:", error);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}

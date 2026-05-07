import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEditCourse, requireStaff } from "@/lib/auth";
import { updateMenuItemSchema, validateBody } from "@/lib/validations";

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string; itemId: string }> }
) {
  const params = await props.params;
  try {
    const staff = await requireStaff();
    if (!(await canEditCourse(staff, params.id))) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }
    const item = await prisma.menuItem.findUnique({
      where: { id: params.itemId },
    });
    if (!item || item.courseId !== params.id) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }

    const raw = await request.json().catch(() => ({}));
    const v = validateBody(updateMenuItemSchema, raw);
    if (!v.success) return v.error;
    const body = v.data;
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
  props: { params: Promise<{ id: string; itemId: string }> }
) {
  const params = await props.params;
  try {
    const staff = await requireStaff();
    if (!(await canEditCourse(staff, params.id))) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
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

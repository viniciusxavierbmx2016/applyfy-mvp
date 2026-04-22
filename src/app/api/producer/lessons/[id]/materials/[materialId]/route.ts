import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEditLesson, requireStaff } from "@/lib/auth";
import { createAdminClient, MATERIALS_BUCKET } from "@/lib/supabase-admin";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; materialId: string } }
) {
  try {
    const staff = await requireStaff();
    if (!(await canEditLesson(staff, params.id))) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (typeof body.name === "string" && body.name.trim()) {
      data.name = body.name.trim();
    }
    if (typeof body.sortOrder === "number") {
      data.sortOrder = body.sortOrder;
    }

    const material = await prisma.lessonMaterial.update({
      where: { id: params.materialId, lessonId: params.id },
      data,
    });

    return NextResponse.json({ material });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; materialId: string } }
) {
  try {
    const staff = await requireStaff();
    if (!(await canEditLesson(staff, params.id))) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const material = await prisma.lessonMaterial.findUnique({
      where: { id: params.materialId, lessonId: params.id },
    });
    if (!material) {
      return NextResponse.json({ error: "Material não encontrado" }, { status: 404 });
    }

    const supabase = createAdminClient();
    try {
      const url = new URL(material.fileUrl);
      const pathMatch = url.pathname.match(/\/object\/public\/materials\/(.+)/);
      if (pathMatch) {
        await supabase.storage.from(MATERIALS_BUCKET).remove([pathMatch[1]]);
      }
    } catch {
      // Storage cleanup is best-effort
    }

    await prisma.lessonMaterial.delete({ where: { id: params.materialId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

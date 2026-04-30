import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEditModule, requireStaff } from "@/lib/auth";

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const staff = await requireStaff();
    if (!(await canEditModule(staff, params.id))) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }
    const { title, daysToRelease, thumbnailUrl, sectionId, hideTitle, releaseAt } =
      await request.json();

    const updated = await prisma.module.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(typeof daysToRelease === "number" && daysToRelease >= 0 && {
          daysToRelease: Math.floor(daysToRelease),
        }),
        ...(thumbnailUrl !== undefined && { thumbnailUrl }),
        ...(sectionId !== undefined && { sectionId: sectionId || null }),
        ...(typeof hideTitle === "boolean" && { hideTitle }),
        ...(releaseAt !== undefined && {
          releaseAt: releaseAt ? new Date(releaseAt) : null,
        }),
      },
    });

    return NextResponse.json({ module: updated });
  } catch (error) {
    console.error("PUT module error:", error);
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
    if (!(await canEditModule(staff, params.id))) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }
    await prisma.module.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE module error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

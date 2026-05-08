import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEditModule, requireStaff } from "@/lib/auth";
import { updateModuleSchema, validateBody } from "@/lib/validations";

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const staff = await requireStaff();
    if (!(await canEditModule(staff, params.id))) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }
    const raw = await request.json().catch(() => ({}));
    const v = validateBody(updateModuleSchema, raw);
    if (!v.success) return v.error;
    const { title, daysToRelease, thumbnailUrl, sectionId, hideTitle, releaseAt } = v.data;

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
          // Anchor at noon UTC. The producer form sends "YYYY-MM-DD"
          // which would otherwise parse as midnight UTC and drift back
          // one day in any negative-offset timezone (Brazil = UTC-3).
          releaseAt: releaseAt ? new Date(`${releaseAt.slice(0, 10)}T12:00:00Z`) : null,
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

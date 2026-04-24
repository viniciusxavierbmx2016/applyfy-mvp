import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { resolveStaffWorkspace } from "@/lib/workspace";

export async function PUT(request: Request) {
  try {
    const staff = await requireStaff();
    if (staff.role === "COLLABORATOR") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const { workspace } = await resolveStaffWorkspace(staff);
    if (!workspace) {
      return NextResponse.json({ error: "Workspace não encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const items: Array<{ id: string; order: number }> = body.items;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "items é obrigatório" }, { status: 400 });
    }

    const courseIds = items.map((i) => i.id);
    const courses = await prisma.course.findMany({
      where: { id: { in: courseIds }, workspaceId: workspace.id },
      select: { id: true },
    });
    const validIds = new Set(courses.map((c) => c.id));

    const validItems = items.filter((i) => validIds.has(i.id));
    if (validItems.length === 0) {
      return NextResponse.json({ error: "Nenhum curso válido" }, { status: 400 });
    }

    await prisma.$transaction(
      validItems.map((item) =>
        prisma.course.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/producer/courses/reorder error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

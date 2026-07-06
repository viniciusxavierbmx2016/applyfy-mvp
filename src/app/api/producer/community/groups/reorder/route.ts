import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, requirePermission } from "@/lib/auth";
import { collaboratorCanActOnCourse } from "@/lib/collaborator";
import { reorderItemsSchema, validateBody } from "@/lib/validations";

export async function PUT(request: Request) {
  try {
    const staff = await requireStaff();
    if (staff.role === "COLLABORATOR") {
      await requirePermission(staff, "MANAGE_COMMUNITY");
    }

    const raw = await request.json().catch(() => ({}));
    const v = validateBody(reorderItemsSchema, raw);
    if (!v.success) return v.error;
    const items = v.data.items;
    if (items.length === 0) {
      return NextResponse.json(
        { error: "items é obrigatório" },
        { status: 400 }
      );
    }

    // Workspace-scope (bulk): resolve the groups' courses and authorize each
    // distinct course via the same 3-branch check as the single-resource
    // handlers (ADMIN → PRODUCER-owner → collaboratorCanActOnCourse). The
    // $transaction then only touches groups that were found AND validated —
    // unknown ids are silently dropped (no P2025).
    const ids = items.map((i: { id: string }) => i.id);
    const groups = await prisma.communityGroup.findMany({
      where: { id: { in: ids } },
      select: { id: true, courseId: true },
    });
    const courseIds = [...new Set(groups.map((g) => g.courseId))];
    for (const cId of courseIds) {
      let canAct = staff.role === "ADMIN";
      if (!canAct && staff.role === "PRODUCER") {
        const course = await prisma.course.findUnique({
          where: { id: cId },
          select: { ownerId: true, workspace: { select: { ownerId: true } } },
        });
        canAct = course?.ownerId === staff.id || course?.workspace.ownerId === staff.id;
      }
      if (!canAct) {
        canAct = await collaboratorCanActOnCourse(staff.id, cId, [
          "MANAGE_COMMUNITY",
        ]);
      }
      if (!canAct) {
        return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
      }
    }

    const validIds = new Set(groups.map((g) => g.id));
    await prisma.$transaction(
      items
        .filter((item: { id: string }) => validIds.has(item.id))
        .map((item: { id: string; order: number }) =>
          prisma.communityGroup.update({
            where: { id: item.id },
            data: { order: item.order },
          })
        )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/producer/community/groups/reorder error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

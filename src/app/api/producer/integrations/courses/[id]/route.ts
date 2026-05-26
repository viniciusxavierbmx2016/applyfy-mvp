import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { canAccessWorkspace } from "@/lib/workspace";
import { updateCourseExternalIdSchema, validateBody } from "@/lib/validations";

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const staff = await requireStaff();

    const course = await prisma.course.findUnique({
      where: { id: params.id },
      select: { id: true, title: true, workspaceId: true },
    });
    if (!course) {
      return NextResponse.json(
        { error: "Curso não encontrado" },
        { status: 404 }
      );
    }
    if (!(await canAccessWorkspace(staff, course.workspaceId))) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const rawBody = await request.json().catch(() => ({}));
    const v = validateBody(updateCourseExternalIdSchema, rawBody);
    if (!v.success) return v.error;
    const body = v.data;

    // F11: accept the new array shape. Fall back to the legacy single field so
    // the pre-step-5 UI keeps working. Normalize: trim, drop empties, dedupe.
    const rawList = Array.isArray(body.externalProductIds)
      ? body.externalProductIds
      : body.externalProductId
        ? [body.externalProductId]
        : [];
    const ids = Array.from(
      new Set(
        rawList
          .map((s) => (typeof s === "string" ? s.trim() : ""))
          .filter((s) => s.length > 0)
      )
    );

    // Uniqueness is per-workspace: reject any id already used by ANOTHER course
    // in this workspace. Do NOT expose the conflicting course (cross-tenant leak).
    if (ids.length > 0) {
      const conflict = await prisma.courseExternalProduct.findFirst({
        where: {
          workspaceId: course.workspaceId,
          externalProductId: { in: ids },
          courseId: { not: params.id },
        },
        select: { id: true },
      });
      if (conflict) {
        return NextResponse.json(
          {
            error: "externalProductId já usado por outro curso neste workspace",
          },
          { status: 409 }
        );
      }
    }

    // Replace-set in a transaction + keep the legacy field synced to ids[0]
    // (the webhook fallback). createMany with [] is a no-op (clears all).
    const [, , updated] = await prisma.$transaction([
      prisma.courseExternalProduct.deleteMany({
        where: { courseId: params.id },
      }),
      prisma.courseExternalProduct.createMany({
        data: ids.map((externalProductId) => ({
          courseId: params.id,
          externalProductId,
          workspaceId: course.workspaceId,
        })),
      }),
      prisma.course.update({
        where: { id: params.id },
        data: { externalProductId: ids[0] ?? null },
        select: {
          id: true,
          title: true,
          slug: true,
          externalProductId: true,
          isPublished: true,
        },
      }),
    ]);

    return NextResponse.json({ course: updated, externalProductIds: ids });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    console.error("PATCH /api/admin/integrations/courses/[id] error:", error);
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

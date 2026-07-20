import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { requireWorkspaceOwner } from "@/lib/workspace";
import { updateCourseExternalIdSchema, validateBody } from "@/lib/validations";

// FASE 6.1 Kiwify — mapeamento produto→curso do gateway KIWIFY. Clone do hubla-courses/[id]:
// escreve gateway="kiwify" no createMany, replace-set + conflito escopados a gateway="kiwify",
// e NÃO sincroniza Course.externalProductId (o campo legado é do Applyfy — intocado).

const GATEWAY = "kiwify";

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const staff = await requireStaff();

    const course = await prisma.course.findUnique({
      where: { id: params.id },
      select: { id: true, title: true, workspaceId: true },
    });
    if (!course) {
      return NextResponse.json({ error: "Curso não encontrado" }, { status: 404 });
    }
    const gate = await requireWorkspaceOwner(staff, course.workspaceId);
    if (!gate.ok) return gate.response;

    const rawBody = await request.json().catch(() => ({}));
    const v = validateBody(updateCourseExternalIdSchema, rawBody);
    if (!v.success) return v.error;
    const body = v.data;

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

    // Unicidade por (workspace, gateway="kiwify"): rejeita id já usado por OUTRO curso
    // DESTE gateway no workspace. Não vaza o curso conflitante (cross-tenant).
    if (ids.length > 0) {
      const conflict = await prisma.courseExternalProduct.findFirst({
        where: {
          workspaceId: course.workspaceId,
          gateway: GATEWAY,
          externalProductId: { in: ids },
          courseId: { not: params.id },
        },
        select: { id: true },
      });
      if (conflict) {
        return NextResponse.json(
          { error: "externalProductId já usado por outro curso neste workspace" },
          { status: 409 }
        );
      }
    }

    // Replace-set escopado a gateway="kiwify" (deixa os mapeamentos de outros gateways
    // do mesmo curso intactos). NÃO toca Course.externalProductId (legado do Applyfy).
    await prisma.$transaction([
      prisma.courseExternalProduct.deleteMany({
        where: { courseId: params.id, gateway: GATEWAY },
      }),
      prisma.courseExternalProduct.createMany({
        data: ids.map((externalProductId) => ({
          courseId: params.id,
          externalProductId,
          workspaceId: course.workspaceId,
          gateway: GATEWAY,
        })),
      }),
    ]);

    return NextResponse.json({ externalProductIds: ids });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    console.error("PATCH /api/producer/integrations/kiwify-courses/[id] error:", error);
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

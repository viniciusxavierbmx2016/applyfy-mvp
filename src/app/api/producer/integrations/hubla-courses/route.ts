import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, getStaffCourseIds } from "@/lib/auth";
import { resolveStaffWorkspace, requireWorkspaceOwner } from "@/lib/workspace";

// FASE 6.0 Fatia 3 — lista de cursos com os externalProductIds do gateway HUBLA.
// Molde do integrations/courses GET, MAS os externalProducts são filtrados por
// gateway="hubla" (o GET do Applyfy mistura todos os gateways; a tela Hubla precisa
// só dos dela).

const GATEWAY = "hubla";

export async function GET() {
  try {
    const staff = await requireStaff();
    const { workspace, scoped } = await resolveStaffWorkspace(staff);
    // Owner-only: integrações é território do dono (coerente com o Applyfy).
    const gate = await requireWorkspaceOwner(staff, workspace?.id ?? "");
    if (!gate.ok) return gate.response;

    const workspaceId = scoped && workspace ? workspace.id : null;
    const collabScope = await getStaffCourseIds(staff);
    const where =
      collabScope !== null
        ? { id: { in: collabScope } }
        : workspaceId
          ? { workspaceId }
          : undefined;

    const courses = await prisma.course.findMany({
      where,
      orderBy: { order: "asc" },
      select: {
        id: true,
        title: true,
        slug: true,
        isPublished: true,
        externalProducts: {
          where: { gateway: GATEWAY },
          select: { externalProductId: true },
        },
      },
    });

    const coursesOut = courses.map((c) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      isPublished: c.isPublished,
      externalProductIds: c.externalProducts.map((ep) => ep.externalProductId),
    }));

    return NextResponse.json({ courses: coursesOut });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

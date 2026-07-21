import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, getStaffCourseIds } from "@/lib/auth";
import { resolveStaffWorkspace, requireWorkspaceOwner } from "@/lib/workspace";

// FASE 6.1 Kiwify — lista de cursos com os externalProductIds do gateway KIWIFY.
// Clone do hubla-courses GET, escopado por gateway="kiwify".

const GATEWAY = "kiwify";

export async function GET() {
  try {
    const staff = await requireStaff();
    const { workspace, scoped } = await resolveStaffWorkspace(staff);
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

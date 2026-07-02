import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, getStaffCourseIds } from "@/lib/auth";
import { resolveStaffWorkspace, requireWorkspaceOwner } from "@/lib/workspace";

export async function GET() {
  try {
    const staff = await requireStaff();

    // Scope to the staff's workspace (COLLABORATOR → only their courses,
    // PRODUCER → workspace courses, ADMIN → global). Never expose every course.
    const { workspace, scoped } = await resolveStaffWorkspace(staff);
    // Owner-only: integrations é território do dono (coerente com Fix 1/2/4 + FURO#3).
    // ADMIN passa no requireWorkspaceOwner; PRODUCER precisa ser dono do ws.
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
        externalProductId: true,
        isPublished: true,
        externalProducts: { select: { externalProductId: true } },
      },
    });

    // F11: expose the full list from the new table; keep the legacy single
    // field in the payload for retrocompat with the pre-step-5 UI.
    const coursesOut = courses.map((c) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      externalProductId: c.externalProductId,
      externalProductIds: c.externalProducts.map((ep) => ep.externalProductId),
      isPublished: c.isPublished,
    }));

    return NextResponse.json({ courses: coursesOut });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

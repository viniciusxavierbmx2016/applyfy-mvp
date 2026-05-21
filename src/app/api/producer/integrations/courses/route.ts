import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, getStaffCourseIds } from "@/lib/auth";
import { resolveStaffWorkspace } from "@/lib/workspace";

export async function GET() {
  try {
    const staff = await requireStaff();

    // Scope to the staff's workspace (COLLABORATOR → only their courses,
    // PRODUCER → workspace courses, ADMIN → global). Never expose every course.
    const { workspace, scoped } = await resolveStaffWorkspace(staff);
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
      },
    });

    return NextResponse.json({ courses });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

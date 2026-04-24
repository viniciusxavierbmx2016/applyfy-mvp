import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { resolveStaffWorkspace } from "@/lib/workspace";

export async function GET() {
  try {
    const staff = await requireStaff();
    const { workspace } = await resolveStaffWorkspace(staff);
    if (!workspace) {
      return NextResponse.json({ error: "Workspace não encontrado" }, { status: 404 });
    }

    const courses = await prisma.course.findMany({
      where: { workspaceId: workspace.id, category: { not: null } },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    });

    const categories = courses
      .map((c) => c.category)
      .filter((c): c is string => c !== null);

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("GET /api/producer/courses/categories error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "Não autorizado" ? 401 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

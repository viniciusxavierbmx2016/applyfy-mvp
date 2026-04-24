import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { resolveStaffWorkspace } from "@/lib/workspace";

export async function GET() {
  try {
    const staff = await requireStaff();
    const { workspace } = await resolveStaffWorkspace(staff);
    if (!workspace) {
      return NextResponse.json({ tags: [] });
    }

    const tags = await prisma.tag.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { userTags: true } } },
    });

    return NextResponse.json({
      tags: tags.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color,
        autoSource: t.autoSource,
        studentCount: t._count.userTags,
        createdAt: t.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro";
    const status = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const staff = await requireStaff();
    const { workspace } = await resolveStaffWorkspace(staff);
    if (!workspace) {
      return NextResponse.json({ error: "Workspace não encontrado" }, { status: 400 });
    }

    const body = await request.json();
    const name = (body.name as string)?.trim();
    const color = (body.color as string)?.trim() || "#6366f1";

    if (!name) {
      return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
    }

    const existing = await prisma.tag.findUnique({
      where: { workspaceId_name: { workspaceId: workspace.id, name } },
    });
    if (existing) {
      return NextResponse.json({ error: "Tag já existe" }, { status: 409 });
    }

    const tag = await prisma.tag.create({
      data: { workspaceId: workspace.id, name, color },
    });

    return NextResponse.json({ tag }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro";
    const status = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

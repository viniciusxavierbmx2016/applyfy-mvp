import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { resolveStaffWorkspace } from "@/lib/workspace";

async function getOwnedTag(tagId: string) {
  const staff = await requireStaff();
  const { workspace } = await resolveStaffWorkspace(staff);
  if (!workspace) throw new Error("Workspace não encontrado");

  const tag = await prisma.tag.findUnique({ where: { id: tagId } });
  if (!tag || tag.workspaceId !== workspace.id) throw new Error("Tag não encontrada");

  return { tag, workspace };
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { tag } = await getOwnedTag(params.id);
    const count = await prisma.userTag.count({ where: { tagId: tag.id } });
    return NextResponse.json({
      tag: { ...tag, studentCount: count },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro";
    const status = msg === "Não autorizado" ? 401 : msg === "Tag não encontrada" ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { tag, workspace } = await getOwnedTag(params.id);
    const body = await request.json();
    const name = (body.name as string)?.trim();
    const color = (body.color as string)?.trim();

    if (name && name !== tag.name) {
      const dup = await prisma.tag.findUnique({
        where: { workspaceId_name: { workspaceId: workspace.id, name } },
      });
      if (dup) return NextResponse.json({ error: "Tag já existe" }, { status: 409 });
    }

    const updated = await prisma.tag.update({
      where: { id: tag.id },
      data: {
        ...(name ? { name } : {}),
        ...(color ? { color } : {}),
      },
    });

    return NextResponse.json({ tag: updated });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro";
    const status = msg === "Não autorizado" ? 401 : msg === "Tag não encontrada" ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { tag } = await getOwnedTag(params.id);
    await prisma.tag.delete({ where: { id: tag.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro";
    const status = msg === "Não autorizado" ? 401 : msg === "Tag não encontrada" ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

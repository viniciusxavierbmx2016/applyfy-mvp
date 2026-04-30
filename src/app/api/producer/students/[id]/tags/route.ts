import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { resolveStaffWorkspace } from "@/lib/workspace";

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    await requireStaff();
    const userTags = await prisma.userTag.findMany({
      where: { userId: params.id },
      include: { tag: { select: { id: true, name: true, color: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({
      tags: userTags.map((ut) => ut.tag),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const staff = await requireStaff();
    const { workspace } = await resolveStaffWorkspace(staff);
    if (!workspace) {
      return NextResponse.json({ error: "Workspace não encontrado" }, { status: 400 });
    }

    const body = await request.json();
    const tagId = body.tagId as string;

    if (!tagId) {
      return NextResponse.json({ error: "tagId obrigatório" }, { status: 400 });
    }

    const tag = await prisma.tag.findUnique({ where: { id: tagId } });
    if (!tag || tag.workspaceId !== workspace.id) {
      return NextResponse.json({ error: "Tag não encontrada" }, { status: 404 });
    }

    await prisma.userTag.upsert({
      where: { userId_tagId: { userId: params.id, tagId } },
      create: { userId: params.id, tagId },
      update: {},
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const staff = await requireStaff();
    const { workspace } = await resolveStaffWorkspace(staff);
    if (!workspace) {
      return NextResponse.json({ error: "Workspace não encontrado" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get("tagId");

    if (!tagId) {
      return NextResponse.json({ error: "tagId obrigatório" }, { status: 400 });
    }

    await prisma.userTag.deleteMany({
      where: { userId: params.id, tagId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

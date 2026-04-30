import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { resolveStaffWorkspace } from "@/lib/workspace";

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const staff = await requireStaff();
    const { workspace } = await resolveStaffWorkspace(staff);
    if (!workspace) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const live = await prisma.live.findFirst({
      where: { id: params.id, workspaceId: workspace.id },
      select: { id: true },
    });
    if (!live) {
      return NextResponse.json({ error: "Live não encontrada" }, { status: 404 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (typeof body.roomOpen === "boolean") data.roomOpen = body.roomOpen;
    if (typeof body.chatEnabled === "boolean") data.chatEnabled = body.chatEnabled;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 });
    }

    const updated = await prisma.live.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json({ live: updated });
  } catch (error) {
    console.error("PATCH /api/producer/lives/[id]/moderate error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

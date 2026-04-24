import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { resolveStaffWorkspace } from "@/lib/workspace";

async function getWorkspaceId(staff: Parameters<typeof resolveStaffWorkspace>[0]) {
  const { workspace } = await resolveStaffWorkspace(staff);
  if (!workspace) throw new Error("Sem permissão");
  return workspace.id;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const staff = await requireStaff();
    const workspaceId = await getWorkspaceId(staff);

    const live = await prisma.live.findFirst({
      where: { id: params.id, workspaceId },
      include: {
        course: { select: { id: true, title: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 100,
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
        _count: { select: { notifications: true, messages: true } },
      },
    });

    if (!live) {
      return NextResponse.json({ error: "Live não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ live });
  } catch (error) {
    console.error("GET /api/producer/lives/[id] error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const staff = await requireStaff();
    const workspaceId = await getWorkspaceId(staff);

    const existing = await prisma.live.findFirst({
      where: { id: params.id, workspaceId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Live não encontrada" }, { status: 404 });
    }

    const body = await request.json();
    const { title, description, platform, externalUrl, embedUrl, scheduledAt, courseId, thumbnailUrl, recordingUrl, savedAsLessonId, visibility } = body;

    const live = await prisma.live.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(platform !== undefined && { platform }),
        ...(externalUrl !== undefined && { externalUrl: externalUrl.trim() }),
        ...(embedUrl !== undefined && { embedUrl: embedUrl?.trim() || null }),
        ...(scheduledAt !== undefined && { scheduledAt: new Date(scheduledAt) }),
        ...(courseId !== undefined && { courseId: courseId || null }),
        ...(thumbnailUrl !== undefined && { thumbnailUrl: thumbnailUrl || null }),
        ...(recordingUrl !== undefined && { recordingUrl: recordingUrl || null }),
        ...(savedAsLessonId !== undefined && { savedAsLessonId }),
        ...(visibility !== undefined && { visibility: visibility === "COURSE_ONLY" ? "COURSE_ONLY" : "PUBLIC" }),
      },
    });

    return NextResponse.json({ live });
  } catch (error) {
    console.error("PUT /api/producer/lives/[id] error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const staff = await requireStaff();
    const workspaceId = await getWorkspaceId(staff);

    const existing = await prisma.live.findFirst({
      where: { id: params.id, workspaceId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Live não encontrada" }, { status: 404 });
    }

    await prisma.live.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/producer/lives/[id] error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

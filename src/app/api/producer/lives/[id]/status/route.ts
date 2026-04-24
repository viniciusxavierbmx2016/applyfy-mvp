import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { resolveStaffWorkspace } from "@/lib/workspace";
import { NotificationType } from "@prisma/client";

const VALID_TRANSITIONS: Record<string, string[]> = {
  SCHEDULED: ["LIVE"],
  LIVE: ["ENDED"],
  ENDED: ["SCHEDULED"],
};

async function getWorkspaceId(staff: Parameters<typeof resolveStaffWorkspace>[0]) {
  const { workspace } = await resolveStaffWorkspace(staff);
  if (!workspace) throw new Error("Sem permissão");
  return workspace.id;
}

export async function PATCH(
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
    const { status } = body;

    const allowed = VALID_TRANSITIONS[existing.status];
    if (!allowed || !allowed.includes(status)) {
      return NextResponse.json(
        { error: `Transição inválida: ${existing.status} → ${status}` },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = { status };
    if (status === "LIVE") {
      data.startedAt = new Date();
    } else if (status === "ENDED") {
      data.endedAt = new Date();
    } else if (status === "SCHEDULED") {
      data.startedAt = null;
      data.endedAt = null;
    }

    const live = await prisma.live.update({
      where: { id: params.id },
      data,
    });

    if (status === "LIVE") {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { slug: true },
      });
      notifyStudents(workspaceId, existing.courseId, live.id, workspace?.slug || "", {
        type: "LIVE_STARTED",
        liveNotificationType: "STARTED",
        message: `Live começou! ${existing.title} está ao vivo agora`,
      });
    }

    return NextResponse.json({ live });
  } catch (error) {
    console.error("PATCH /api/producer/lives/[id]/status error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

async function notifyStudents(
  workspaceId: string,
  courseId: string | null,
  liveId: string,
  slug: string,
  opts: { type: NotificationType; liveNotificationType: string; message: string }
) {
  try {
    const studentIds = courseId
      ? await prisma.enrollment
          .findMany({
            where: { courseId, status: "ACTIVE" },
            select: { userId: true },
            distinct: ["userId"],
          })
          .then((rows) => rows.map((r) => r.userId))
      : await prisma.enrollment
          .findMany({
            where: { course: { workspaceId }, status: "ACTIVE" },
            select: { userId: true },
            distinct: ["userId"],
          })
          .then((rows) => rows.map((r) => r.userId));

    if (studentIds.length === 0) return;

    const link = `/w/${slug}/lives/${liveId}`;

    await prisma.$transaction([
      prisma.liveNotification.createMany({
        data: studentIds.map((userId) => ({
          liveId,
          userId,
          type: opts.liveNotificationType,
        })),
      }),
      prisma.notification.createMany({
        data: studentIds.map((userId) => ({
          userId,
          type: opts.type,
          message: opts.message,
          link,
        })),
      }),
    ]);
  } catch (err) {
    console.error("notifyStudents error:", err);
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { resolveStaffWorkspace } from "@/lib/workspace";
import { NotificationType } from "@prisma/client";
import { sendPushToUsers } from "@/lib/push-send";

const VALID_PLATFORMS = ["GOOGLE_MEET", "ZOOM", "YOUTUBE_LIVE", "CUSTOM"];
const MAX_LIVES = 50;

async function getWorkspaceId(staff: Parameters<typeof resolveStaffWorkspace>[0]) {
  const { workspace } = await resolveStaffWorkspace(staff);
  if (!workspace) throw new Error("Sem permissão");
  return workspace.id;
}

export async function GET(request: Request) {
  try {
    const staff = await requireStaff();
    const workspaceId = await getWorkspaceId(staff);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const courseId = searchParams.get("courseId");

    const where: Record<string, unknown> = { workspaceId };
    if (status) where.status = status;
    if (courseId) where.courseId = courseId;

    const lives = await prisma.live.findMany({
      where,
      orderBy: { scheduledAt: "desc" },
      include: {
        course: { select: { id: true, title: true } },
        _count: { select: { messages: true } },
      },
    });

    return NextResponse.json({ lives });
  } catch (error) {
    console.error("GET /api/producer/lives error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const staff = await requireStaff();
    const workspaceId = await getWorkspaceId(staff);

    const body = await request.json();
    const { title, description, platform, externalUrl, embedUrl, scheduledAt, courseId, thumbnailUrl, visibility } = body;
    const liveVisibility = visibility === "COURSE_ONLY" ? "COURSE_ONLY" : "PUBLIC";

    if (!title?.trim()) {
      return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 });
    }
    if (!platform || !VALID_PLATFORMS.includes(platform)) {
      return NextResponse.json({ error: "Plataforma inválida" }, { status: 400 });
    }
    if (!externalUrl?.trim()) {
      return NextResponse.json({ error: "Link da live é obrigatório" }, { status: 400 });
    }
    if (!scheduledAt) {
      return NextResponse.json({ error: "Data agendada é obrigatória" }, { status: 400 });
    }
    if (liveVisibility === "COURSE_ONLY" && !courseId) {
      return NextResponse.json({ error: "Curso é obrigatório para lives restritas" }, { status: 400 });
    }

    const count = await prisma.live.count({ where: { workspaceId } });
    if (count >= MAX_LIVES) {
      return NextResponse.json({ error: `Limite de ${MAX_LIVES} lives atingido` }, { status: 400 });
    }

    if (courseId) {
      const course = await prisma.course.findFirst({
        where: { id: courseId, workspaceId },
      });
      if (!course) {
        return NextResponse.json({ error: "Curso não encontrado" }, { status: 404 });
      }
    }

    const ws = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { slug: true },
    });

    const live = await prisma.live.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        platform,
        externalUrl: externalUrl.trim(),
        embedUrl: embedUrl?.trim() || null,
        scheduledAt: new Date(scheduledAt),
        courseId: courseId || null,
        thumbnailUrl: thumbnailUrl || null,
        visibility: liveVisibility,
        workspaceId,
      },
    });

    const workspace = ws;

    const scheduledDate = new Date(scheduledAt).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

    notifyStudents(workspaceId, courseId || null, live.id, workspace?.slug || "", {
      type: "LIVE_SCHEDULED",
      liveNotificationType: "SCHEDULED",
      message: `Nova live agendada! ${title.trim()} — ${scheduledDate}`,
      pushTitle: "📅 Nova live agendada!",
      pushBody: `${title.trim()} — ${scheduledDate}`,
    });

    return NextResponse.json({ live }, { status: 201 });
  } catch (error) {
    console.error("POST /api/producer/lives error:", error);
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
  opts: {
    type: NotificationType;
    liveNotificationType: string;
    message: string;
    pushTitle?: string;
    pushBody?: string;
  }
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

    if (opts.pushTitle) {
      sendPushToUsers(studentIds, {
        title: opts.pushTitle,
        body: opts.pushBody || opts.message,
        url: link,
        tag: `live-${opts.liveNotificationType.toLowerCase()}-${liveId}`,
      });
    }
  } catch (err) {
    console.error("notifyStudents error:", err);
  }
}

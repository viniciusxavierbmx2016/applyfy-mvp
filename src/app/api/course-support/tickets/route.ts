import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isEnrollmentActive } from "@/lib/auth";
import {
  createCourseSupportTicketSchema,
  validateBody,
} from "@/lib/validations";
import { createNotification } from "@/lib/notifications";
import { sendPushToUser } from "@/lib/push-send";

// F2 — Per-course student↔producer support tickets.
//
// This is the STUDENT-facing endpoint. Producer-side reads/replies live under
// /api/producer/course-support/* (added in a later step). The existing
// /api/support/* tree (producer↔admin) is untouched.

// GET /api/course-support/tickets?courseId=<id>
// Lists this student's tickets in a specific course (no cross-course leaks),
// each with the first message as a preview.
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const courseId = (searchParams.get("courseId") || "").trim();
    if (!courseId) {
      return NextResponse.json(
        { error: "courseId é obrigatório" },
        { status: 400 }
      );
    }

    // Enrollment gate: only ACTIVE students see/own tickets here. The student
    // detail page on the producer side (different endpoint) can still read
    // expired-enrollment tickets if needed.
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
    });
    if (!isEnrollmentActive(enrollment)) {
      return NextResponse.json(
        { error: "Sem acesso a este curso" },
        { status: 403 }
      );
    }

    const tickets = await prisma.courseSupportTicket.findMany({
      where: { studentId: user.id, courseId },
      orderBy: { lastMessageAt: "desc" },
      take: 100,
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { id: true, body: true, createdAt: true, senderRole: true },
        },
        _count: { select: { messages: true } },
      },
    });

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("GET /api/course-support/tickets error:", error);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}

// POST /api/course-support/tickets — student opens a new ticket. Body becomes
// the first CourseSupportMessage; ticket starts OPEN.
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const raw = await request.json().catch(() => ({}));
    const v = validateBody(createCourseSupportTicketSchema, raw);
    if (!v.success) return v.error;
    const { courseId, subject, body, attachments = [] } = v.data;

    // Course must exist and we need workspaceId for the row + owner for
    // the notification target (course.ownerId is nullable, so fall back to
    // workspace.ownerId — that one is NOT NULL in the schema).
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        workspaceId: true,
        ownerId: true,
        title: true,
        workspace: { select: { ownerId: true } },
      },
    });
    if (!course) {
      return NextResponse.json(
        { error: "Curso não encontrado" },
        { status: 404 }
      );
    }

    // Same enrollment gate as GET — opening a ticket requires ACTIVE access.
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
    });
    if (!isEnrollmentActive(enrollment)) {
      return NextResponse.json(
        { error: "Sem acesso a este curso" },
        { status: 403 }
      );
    }

    const ticket = await prisma.courseSupportTicket.create({
      data: {
        subject: subject.trim(),
        courseId: course.id,
        workspaceId: course.workspaceId,
        studentId: user.id,
        status: "OPEN",
        lastMessageAt: new Date(),
        lastReadByStudentAt: new Date(),
        messages: {
          create: {
            body: body.trim(),
            attachments,
            senderId: user.id,
            senderRole: "STUDENT",
          },
        },
      },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    // F2 — notify the course owner (producer). Bell row awaited; push is
    // redundant and fire-and-forget so we don't slow the student's request.
    const ownerId = course.ownerId ?? course.workspace.ownerId;
    if (ownerId) {
      await createNotification({
        userId: ownerId,
        workspaceId: course.workspaceId,
        type: "COURSE_SUPPORT",
        message: `Novo chamado de suporte: "${subject.trim()}" — ${course.title}`,
        link: "/producer/course-support",
        actorId: user.id,
      });
      sendPushToUser(
        ownerId,
        {
          title: "Novo chamado de suporte",
          body: `${subject.trim()} — ${course.title}`,
          url: "/producer/course-support",
        },
        course.workspaceId
      ).catch(() => {});
    }

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    console.error("POST /api/course-support/tickets error:", error);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}

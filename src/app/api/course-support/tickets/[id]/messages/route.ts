import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  courseSupportMessageSchema,
  validateBody,
} from "@/lib/validations";
import { createNotification } from "@/lib/notifications";
import { sendPushToUser } from "@/lib/push-send";

// F2 — Per-course support: student-side message thread.
//
// Both GET and POST enforce that the ticket belongs to the requesting student
// (studentId === user.id). Producer access lives under a separate
// /api/producer/course-support tree.

// GET /api/course-support/tickets/[id]/messages — list messages and mark the
// thread as read for the student (lastReadByStudentAt = now).
export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const ticket = await prisma.courseSupportTicket.findUnique({
      where: { id: params.id },
      select: { id: true, studentId: true },
    });
    if (!ticket || ticket.studentId !== user.id) {
      return NextResponse.json(
        { error: "Ticket não encontrado" },
        { status: 404 }
      );
    }

    const messages = await prisma.courseSupportMessage.findMany({
      where: { ticketId: ticket.id },
      orderBy: { createdAt: "asc" },
    });

    // Fire-and-forget read receipt — not critical for the GET response.
    prisma.courseSupportTicket
      .update({
        where: { id: ticket.id },
        data: { lastReadByStudentAt: new Date() },
      })
      .catch(() => {});

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("GET /api/course-support/tickets/[id]/messages error:", error);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}

// POST /api/course-support/tickets/[id]/messages — student replies to their
// own ticket. Closed tickets reject; RESOLVED tickets re-open automatically.
export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const raw = await request.json().catch(() => ({}));
    const v = validateBody(courseSupportMessageSchema, raw);
    if (!v.success) return v.error;
    const { body, attachments = [] } = v.data;

    const ticket = await prisma.courseSupportTicket.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        studentId: true,
        status: true,
        subject: true,
        workspaceId: true,
        course: {
          select: {
            title: true,
            ownerId: true,
            workspace: { select: { ownerId: true } },
          },
        },
      },
    });
    if (!ticket || ticket.studentId !== user.id) {
      return NextResponse.json(
        { error: "Ticket não encontrado" },
        { status: 404 }
      );
    }
    if (ticket.status === "CLOSED") {
      return NextResponse.json(
        { error: "Ticket encerrado" },
        { status: 403 }
      );
    }

    const now = new Date();
    // Re-open RESOLVED tickets when the student replies again; OPEN /
    // IN_PROGRESS keep their current status.
    const nextStatus = ticket.status === "RESOLVED" ? "OPEN" : ticket.status;

    const [message] = await prisma.$transaction([
      prisma.courseSupportMessage.create({
        data: {
          ticketId: ticket.id,
          senderId: user.id,
          senderRole: "STUDENT",
          body: body.trim(),
          attachments,
        },
      }),
      prisma.courseSupportTicket.update({
        where: { id: ticket.id },
        data: {
          lastMessageAt: now,
          lastReadByStudentAt: now,
          status: nextStatus,
        },
      }),
    ]);

    // F2 — notify the course owner (producer) of the student reply.
    const ownerId =
      ticket.course.ownerId ?? ticket.course.workspace.ownerId;
    if (ownerId) {
      await createNotification({
        userId: ownerId,
        workspaceId: ticket.workspaceId,
        type: "COURSE_SUPPORT",
        message: `Nova mensagem em "${ticket.subject}" — ${ticket.course.title}`,
        link: "/producer/course-support",
        actorId: user.id,
      });
      sendPushToUser(
        ownerId,
        {
          title: "Nova mensagem no suporte",
          body: `${ticket.subject} — ${ticket.course.title}`,
          url: "/producer/course-support",
        },
        ticket.workspaceId
      ).catch(() => {});
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("POST /api/course-support/tickets/[id]/messages error:", error);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}

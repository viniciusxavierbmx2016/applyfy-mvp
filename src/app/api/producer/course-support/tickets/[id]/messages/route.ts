import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveProducerSupportScope } from "@/lib/course-support";
import {
  courseSupportMessageSchema,
  validateBody,
} from "@/lib/validations";
import { createNotification } from "@/lib/notifications";
import { sendPushToUser } from "@/lib/push-send";

// F2 — Producer-side message thread for a course-support ticket.
//
// GET   /api/producer/course-support/tickets/[id]/messages
//       Lists messages and marks the thread read for the producer side
//       (lastReadByProducerAt = now). Ownership: workspaceId + collab scope.
// POST  /api/producer/course-support/tickets/[id]/messages
//       Body: { body, attachments? }. Creates a PRODUCER reply, bumps
//       lastMessageAt + lastReadByProducerAt, transitions OPEN → IN_PROGRESS
//       (RESOLVED/IN_PROGRESS keep their status; CLOSED rejects).

async function loadOwnedTicket(
  id: string,
  workspaceId: string,
  collabCourseIds: string[] | null
) {
  const ticket = await prisma.courseSupportTicket.findUnique({
    where: { id },
    select: {
      id: true,
      workspaceId: true,
      courseId: true,
      status: true,
    },
  });
  if (!ticket || ticket.workspaceId !== workspaceId) return null;
  if (collabCourseIds && !collabCourseIds.includes(ticket.courseId)) return null;
  return ticket;
}

export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const r = await resolveProducerSupportScope();
  if (!r.ok) return r.response;
  const { workspaceId, courseIds } = r.scope;

  const { id } = await props.params;
  try {
    const owned = await loadOwnedTicket(id, workspaceId, courseIds);
    if (!owned) {
      return NextResponse.json(
        { error: "Ticket não encontrado" },
        { status: 404 }
      );
    }

    const messages = await prisma.courseSupportMessage.findMany({
      where: { ticketId: owned.id },
      orderBy: { createdAt: "asc" },
    });

    // Producer-side read receipt — fire-and-forget, doesn't block the response.
    prisma.courseSupportTicket
      .update({
        where: { id: owned.id },
        data: { lastReadByProducerAt: new Date() },
      })
      .catch(() => {});

    return NextResponse.json({ messages });
  } catch (error) {
    console.error(
      "GET /api/producer/course-support/tickets/[id]/messages error:",
      error
    );
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const r = await resolveProducerSupportScope();
  if (!r.ok) return r.response;
  const { staff, workspaceId, courseIds } = r.scope;

  const { id } = await props.params;
  try {
    const raw = await request.json().catch(() => ({}));
    const v = validateBody(courseSupportMessageSchema, raw);
    if (!v.success) return v.error;
    const { body, attachments = [] } = v.data;

    const owned = await loadOwnedTicket(id, workspaceId, courseIds);
    if (!owned) {
      return NextResponse.json(
        { error: "Ticket não encontrado" },
        { status: 404 }
      );
    }
    if (owned.status === "CLOSED") {
      return NextResponse.json(
        { error: "Ticket encerrado" },
        { status: 403 }
      );
    }

    const now = new Date();
    // Producer reply on a brand-new ticket bumps status to IN_PROGRESS so the
    // student sees engagement; later replies leave the status untouched.
    const nextStatus = owned.status === "OPEN" ? "IN_PROGRESS" : owned.status;

    const [message] = await prisma.$transaction([
      prisma.courseSupportMessage.create({
        data: {
          ticketId: owned.id,
          senderId: staff.id,
          senderRole: "PRODUCER",
          body: body.trim(),
          attachments,
        },
      }),
      prisma.courseSupportTicket.update({
        where: { id: owned.id },
        data: {
          lastMessageAt: now,
          lastReadByProducerAt: now,
          status: nextStatus,
        },
      }),
    ]);

    // F2 — notify the student. loadOwnedTicket keeps a lean projection for
    // the ownership check (reused in GET); pull the notification fields
    // separately here (single PK lookup).
    const notif = await prisma.courseSupportTicket.findUnique({
      where: { id: owned.id },
      select: {
        studentId: true,
        subject: true,
        workspaceId: true,
        course: { select: { slug: true, title: true } },
      },
    });
    if (notif) {
      const link = `/course/${notif.course.slug}`;
      await createNotification({
        userId: notif.studentId,
        workspaceId: notif.workspaceId,
        type: "COURSE_SUPPORT",
        message: `Resposta no seu chamado: "${notif.subject}"`,
        link,
        actorId: staff.id,
      });
      sendPushToUser(
        notif.studentId,
        {
          title: "Resposta no seu chamado",
          body: `${notif.subject} — ${notif.course.title}`,
          url: link,
        },
        notif.workspaceId
      ).catch(() => {});
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error(
      "POST /api/producer/course-support/tickets/[id]/messages error:",
      error
    );
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}

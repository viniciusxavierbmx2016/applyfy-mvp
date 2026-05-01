import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { adminHasPerm } from "@/lib/admin-permissions-server";
import { createTicketSchema, validateBody } from "@/lib/validations";
import { logAudit, getRequestMeta } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

// GET /api/support/tickets — list tickets visible to the requester.
// PRODUCER → only their own tickets.
// ADMIN or ADMIN_COLLABORATOR with SUPPORT → all tickets, optionally filtered by status.
// Other roles → 403.
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status")?.toUpperCase();
  const validStatus = status && [
    "OPEN",
    "IN_PROGRESS",
    "WAITING_RESPONSE",
    "RESOLVED",
    "CLOSED",
  ].includes(status) ? status : null;

  let where: {
    producerId?: string;
    status?: "OPEN" | "IN_PROGRESS" | "WAITING_RESPONSE" | "RESOLVED" | "CLOSED";
  } = {};

  if (user.role === "PRODUCER") {
    where.producerId = user.id;
  } else if (
    user.role === "ADMIN" ||
    (user.role === "ADMIN_COLLABORATOR" &&
      (await adminHasPerm(user, "SUPPORT")))
  ) {
    // staff sees all
  } else {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  if (validStatus) {
    where = { ...where, status: validStatus as typeof where.status };
  }

  const tickets = await prisma.supportTicket.findMany({
    where,
    orderBy: [{ lastMessageAt: "desc" }],
    take: 100,
    include: {
      producer: { select: { id: true, name: true, email: true, avatarUrl: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      _count: { select: { messages: true } },
    },
  });

  return NextResponse.json({ tickets });
}

// POST /api/support/tickets — producer opens a new ticket. The body becomes
// the first TicketMessage; the ticket starts as OPEN with NORMAL priority.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (user.role !== "PRODUCER") {
    return NextResponse.json(
      { error: "Apenas produtores podem abrir tickets" },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const v = validateBody(createTicketSchema, body);
  if (!v.success) return v.error;
  const { subject, body: messageBody, attachments = [] } = v.data;

  const ticket = await prisma.supportTicket.create({
    data: {
      subject: subject.trim(),
      producerId: user.id,
      status: "OPEN",
      priority: "NORMAL",
      lastMessageAt: new Date(),
      messages: {
        create: {
          body: messageBody.trim(),
          attachments,
          senderId: user.id,
        },
      },
    },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      producer: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  });

  await logAudit({
    userId: user.id,
    action: "ticket_created",
    target: ticket.id,
    details: { subject: ticket.subject, attachments: attachments.length },
    ...getRequestMeta(request),
  });

  // Notify the support team (in-app only — no email blast).
  // ADMIN gets notified always; ADMIN_COLLABORATOR only if they have SUPPORT
  // and are ACCEPTED (we filter via the AdminCollaborator join).
  notifyTicketTeam(ticket.id, user.name, ticket.subject).catch((err) =>
    console.error("[support] notify team failed:", err)
  );

  return NextResponse.json({ ticket }, { status: 201 });
}

async function notifyTicketTeam(
  ticketId: string,
  producerName: string,
  subject: string
) {
  const link = `/admin/support?ticket=${ticketId}`;
  const message = `${producerName} abriu um ticket: ${subject}`;

  // Plain ADMINs.
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  // ADMIN_COLLABORATOR with status=ACCEPTED whose permissions include SUPPORT
  // (or FULL_ACCESS, which expands to all). Read userId off AdminCollaborator
  // because not every accepted collab will have a User row pre-existing.
  const collabs = await prisma.adminCollaborator.findMany({
    where: {
      status: "ACCEPTED",
      userId: { not: null },
      OR: [
        { permissions: { has: "SUPPORT" } },
        { permissions: { has: "FULL_ACCESS" } },
      ],
    },
    select: { userId: true },
  });

  const userIds = new Set<string>();
  for (const a of admins) userIds.add(a.id);
  for (const c of collabs) if (c.userId) userIds.add(c.userId);

  await Promise.all(
    Array.from(userIds).map((uid) =>
      createNotification({
        userId: uid,
        type: "TICKET_NEW",
        message,
        link,
      })
    )
  );
}

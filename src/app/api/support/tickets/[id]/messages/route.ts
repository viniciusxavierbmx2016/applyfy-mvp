import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canAccessTicket } from "@/lib/ticket-access";
import { ticketMessageSchema, validateBody } from "@/lib/validations";
import { logAudit, getRequestMeta } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { ticketReplyToProducer } from "@/lib/email-templates";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      producerId: true,
      status: true,
      subject: true,
      producer: { select: { name: true, email: true } },
    },
  });
  if (!ticket) {
    return NextResponse.json(
      { error: "Ticket não encontrado" },
      { status: 404 }
    );
  }

  if (!(await canAccessTicket(user, ticket))) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  if (ticket.status === "CLOSED") {
    return NextResponse.json(
      { error: "Ticket fechado — abra um novo" },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const v = validateBody(ticketMessageSchema, body);
  if (!v.success) return v.error;
  const { body: messageBody, attachments = [] } = v.data;

  const isProducer = user.id === ticket.producerId;
  // When the producer replies, the ticket needs admin attention again.
  // When admin/collab replies, the ticket is awaiting the producer.
  const nextStatus = isProducer
    ? ticket.status === "WAITING_RESPONSE"
      ? "OPEN"
      : ticket.status
    : "WAITING_RESPONSE";

  const now = new Date();

  const [message] = await prisma.$transaction([
    prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderId: user.id,
        body: messageBody.trim(),
        attachments,
      },
      include: {
        sender: {
          select: { id: true, name: true, avatarUrl: true, role: true },
        },
      },
    }),
    prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        lastMessageAt: now,
        status: nextStatus,
        // The sender just read what they wrote.
        ...(isProducer
          ? { lastReadByProducerAt: now }
          : { lastReadByAdminAt: now }),
      },
    }),
  ]);

  await logAudit({
    userId: user.id,
    action: "ticket_replied",
    target: ticket.id,
    details: { isProducer, attachments: attachments.length },
    ...getRequestMeta(request),
  });

  // Admin reply → notify the producer (in-app + email).
  // Producer reply → no notification to the team for now (admin polls inbox).
  if (!isProducer) {
    const link = `/producer?ticket=${ticket.id}`;
    createNotification({
      userId: ticket.producerId,
      type: "TICKET_REPLY",
      message: `Suporte respondeu: ${ticket.subject}`,
      link,
      actorId: user.id,
    }).catch((err) =>
      console.error("[support] notify producer failed:", err)
    );
    if (ticket.producer.email) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
      const ticketUrl = `${appUrl}${link}`;
      const tpl = ticketReplyToProducer(
        ticket.producer.name,
        ticket.subject,
        ticketUrl
      );
      sendEmail({
        to: { email: ticket.producer.email, name: ticket.producer.name },
        ...tpl,
      }).catch((err) =>
        console.error(
          "[EMAIL_ERROR] ticketReplyToProducer to:",
          ticket.producer.email,
          err?.message || err
        )
      );
    }
  }

  return NextResponse.json({ message }, { status: 201 });
}

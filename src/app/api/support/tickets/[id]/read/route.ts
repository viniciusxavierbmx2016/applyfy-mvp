import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canAccessTicket } from "@/lib/ticket-access";

// Marks the ticket as read for the requesting role.
// Producer-owner → updates lastReadByProducerAt.
// Admin / SUPPORT collab → updates lastReadByAdminAt (shared inbox per
// design D5 — any admin reading clears the unread badge for the team).
export async function POST(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: params.id },
    select: { id: true, producerId: true },
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

  const isProducer = user.id === ticket.producerId;
  await prisma.supportTicket.update({
    where: { id: ticket.id },
    data: isProducer
      ? { lastReadByProducerAt: new Date() }
      : { lastReadByAdminAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}

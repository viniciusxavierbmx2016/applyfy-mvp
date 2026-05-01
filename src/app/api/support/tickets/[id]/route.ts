import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canAccessTicket, canManageTicket } from "@/lib/ticket-access";
import { ticketUpdateSchema, validateBody } from "@/lib/validations";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function GET(
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
    include: {
      producer: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
      assignedTo: { select: { id: true, name: true, email: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          sender: {
            select: { id: true, name: true, avatarUrl: true, role: true },
          },
        },
      },
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

  return NextResponse.json({ ticket });
}

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (!(await canManageTicket(user))) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: params.id },
    select: { id: true, status: true, assignedToId: true },
  });
  if (!ticket) {
    return NextResponse.json(
      { error: "Ticket não encontrado" },
      { status: 404 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const v = validateBody(ticketUpdateSchema, body);
  if (!v.success) return v.error;
  const { status, priority, assignedToId } = v.data;

  // If assigning, verify the target is a valid admin/collab.
  if (typeof assignedToId === "string") {
    const target = await prisma.user.findUnique({
      where: { id: assignedToId },
      select: { id: true, role: true },
    });
    if (
      !target ||
      (target.role !== "ADMIN" && target.role !== "ADMIN_COLLABORATOR")
    ) {
      return NextResponse.json(
        { error: "Usuário não pode ser atribuído (precisa ser admin)" },
        { status: 400 }
      );
    }
  }

  const data: {
    status?: typeof status;
    priority?: typeof priority;
    assignedToId?: string | null;
    closedAt?: Date | null;
  } = {};
  if (status) {
    data.status = status;
    data.closedAt =
      status === "CLOSED" || status === "RESOLVED" ? new Date() : null;
  }
  if (priority) data.priority = priority;
  if (assignedToId !== undefined) data.assignedToId = assignedToId;

  const updated = await prisma.supportTicket.update({
    where: { id: ticket.id },
    data,
    include: {
      producer: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });

  // Two distinct audit events: status changes vs assignment.
  if (status) {
    await logAudit({
      userId: user.id,
      action: "ticket_status_changed",
      target: ticket.id,
      details: { from: ticket.status, to: status },
      ...getRequestMeta(request),
    });
  }
  if (assignedToId !== undefined && assignedToId !== ticket.assignedToId) {
    await logAudit({
      userId: user.id,
      action: "ticket_assigned",
      target: ticket.id,
      details: { from: ticket.assignedToId, to: assignedToId },
      ...getRequestMeta(request),
    });
  }

  return NextResponse.json({ ticket: updated });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveProducerSupportScope } from "@/lib/course-support";
import {
  courseSupportStatusSchema,
  validateBody,
} from "@/lib/validations";

// F2 — Producer-side ticket detail + status updates.
//
// GET    /api/producer/course-support/tickets/[id]   — full thread + meta
// PATCH  /api/producer/course-support/tickets/[id]   — { status }
//
// Ownership: workspaceId match (and collab course-scope when applicable). A
// foreign ticket id returns 404 to avoid leaking existence to other tenants.

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
    const ticket = await prisma.courseSupportTicket.findUnique({
      where: { id: owned.id },
      include: {
        student: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        course: { select: { id: true, title: true, slug: true } },
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
    return NextResponse.json({ ticket });
  } catch (error) {
    console.error("GET /api/producer/course-support/tickets/[id] error:", error);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const r = await resolveProducerSupportScope();
  if (!r.ok) return r.response;
  const { workspaceId, courseIds } = r.scope;

  const { id } = await props.params;
  try {
    const raw = await request.json().catch(() => ({}));
    const v = validateBody(courseSupportStatusSchema, raw);
    if (!v.success) return v.error;
    const { status } = v.data;

    const owned = await loadOwnedTicket(id, workspaceId, courseIds);
    if (!owned) {
      return NextResponse.json(
        { error: "Ticket não encontrado" },
        { status: 404 }
      );
    }

    // closedAt mirrors the status transitions: stamp on CLOSED, clear on
    // re-open to anything else.
    const closedAt =
      status === "CLOSED"
        ? owned.status === "CLOSED"
          ? undefined
          : new Date()
        : owned.status === "CLOSED"
          ? null
          : undefined;

    const updated = await prisma.courseSupportTicket.update({
      where: { id: owned.id },
      data: {
        status,
        ...(closedAt !== undefined ? { closedAt } : {}),
      },
      select: { id: true, status: true, closedAt: true },
    });
    return NextResponse.json({ ticket: updated });
  } catch (error) {
    console.error("PATCH /api/producer/course-support/tickets/[id] error:", error);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}

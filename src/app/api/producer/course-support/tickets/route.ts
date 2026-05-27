import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveProducerSupportScope } from "@/lib/course-support";
import type { CourseSupportStatus, Prisma } from "@prisma/client";

const ALLOWED_STATUS = new Set<CourseSupportStatus>([
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
]);

// F2 — Producer-side listing of course-support tickets.
//
// GET /api/producer/course-support/tickets[?courseId=...][&status=OPEN]
//
// Scope rules:
//   - workspaceId is always pinned to the active workspace.
//   - PRODUCER/ADMIN see every ticket in the workspace.
//   - COLLABORATOR is intersected with their permitted course list.
//   - Optional courseId filter is intersected against the above; foreign IDs
//     simply return zero rows (no 403, no enumeration leak).
export async function GET(request: Request) {
  const r = await resolveProducerSupportScope();
  if (!r.ok) return r.response;
  const { workspaceId, courseIds } = r.scope;

  try {
    const { searchParams } = new URL(request.url);
    const courseIdParam = (searchParams.get("courseId") || "").trim() || null;
    const statusParam = (searchParams.get("status") || "").trim().toUpperCase();
    const status =
      statusParam && ALLOWED_STATUS.has(statusParam as CourseSupportStatus)
        ? (statusParam as CourseSupportStatus)
        : null;

    // Effective course filter: intersection of collab scope + explicit param.
    let effectiveCourseIds: string[] | null = courseIds;
    if (courseIdParam) {
      if (effectiveCourseIds && !effectiveCourseIds.includes(courseIdParam)) {
        return NextResponse.json({ tickets: [] });
      }
      effectiveCourseIds = [courseIdParam];
    }

    const where: Prisma.CourseSupportTicketWhereInput = {
      workspaceId,
      ...(effectiveCourseIds ? { courseId: { in: effectiveCourseIds } } : {}),
      ...(status ? { status } : {}),
    };

    const tickets = await prisma.courseSupportTicket.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      take: 200,
      include: {
        student: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        course: { select: { id: true, title: true, slug: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, body: true, createdAt: true, senderRole: true },
        },
        _count: { select: { messages: true } },
      },
    });

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("GET /api/producer/course-support/tickets error:", error);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}

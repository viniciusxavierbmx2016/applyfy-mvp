import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveProducerSupportScope } from "@/lib/course-support";

// F2 — Producer-side badge count. Mirrors the admin /api/support/unread-count
// design (one shared read-state per side) but scoped to this workspace and,
// for collaborators, to their permitted courses.
//
// A ticket counts as "unread by producer" when:
//   - status != CLOSED, AND
//   - (lastReadByProducerAt IS NULL OR lastReadByProducerAt < lastMessageAt).
//
// Using prisma.count (not queryRawUnsafe) so the collaborator courseId filter
// stays type-safe without raw IN-list interpolation.
export async function GET() {
  const r = await resolveProducerSupportScope();
  if (!r.ok) return r.response;
  const { workspaceId, courseIds } = r.scope;

  try {
    const count = await prisma.courseSupportTicket.count({
      where: {
        workspaceId,
        ...(courseIds ? { courseId: { in: courseIds } } : {}),
        status: { not: "CLOSED" },
        OR: [
          { lastReadByProducerAt: null },
          { lastReadByProducerAt: { lt: prisma.courseSupportTicket.fields.lastMessageAt } },
        ],
      },
    });
    return NextResponse.json({ count });
  } catch (error) {
    console.error("GET /api/producer/course-support/unread-count error:", error);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}

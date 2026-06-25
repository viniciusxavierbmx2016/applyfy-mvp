import { NextResponse } from "next/server";
import type { User } from "@prisma/client";
import { requireStaff, getStaffCourseIds } from "@/lib/auth";
import { resolveStaffWorkspace } from "@/lib/workspace";

/**
 * F2 — Producer-side course-support scope resolution.
 *
 * Centralizes the boilerplate every producer ticket endpoint needs:
 *   1. requireStaff()             — 401 if not authed, 403 if not staff
 *   2. resolveStaffWorkspace()    — null when ADMIN has no workspace selected
 *   3. getStaffCourseIds()        — collab-specific course list (null = unscoped)
 *
 * Returns either an early NextResponse to bail out, or the resolved scope
 * for callers to plug into Prisma `where` clauses. workspaceId is always
 * present in the success path (ADMIN without workspace → 400).
 */
export type ProducerSupportScope = {
  staff: User;
  workspaceId: string;
  /** Collaborator-restricted course IDs; null for ADMIN/PRODUCER (no filter). */
  courseIds: string[] | null;
};

export async function resolveProducerSupportScope(): Promise<
  | { ok: true; scope: ProducerSupportScope }
  | { ok: false; reason: "auth" | "no-workspace"; response: NextResponse }
> {
  let staff: User;
  try {
    staff = await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    const status = msg === "Não autorizado" ? 401 : 403;
    return {
      ok: false,
      reason: "auth",
      response: NextResponse.json({ error: msg || "Erro" }, { status }),
    };
  }

  const { workspace } = await resolveStaffWorkspace(staff);
  if (!workspace) {
    return {
      ok: false,
      reason: "no-workspace",
      response: NextResponse.json(
        { error: "Nenhum workspace ativo" },
        { status: 400 }
      ),
    };
  }

  const courseIds = await getStaffCourseIds(staff);

  return {
    ok: true,
    scope: { staff, workspaceId: workspace.id, courseIds },
  };
}

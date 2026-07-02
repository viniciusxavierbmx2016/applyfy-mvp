import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { resolveStaffWorkspace, requireWorkspaceOwner } from "@/lib/workspace";
import { parseSafeInt } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const staff = await requireStaff();
    const { workspace } = await resolveStaffWorkspace(staff);
    // Owner-only: mata o vazamento cross-tenant (COLLABORATOR caía em where={}).
    // ADMIN passa no requireWorkspaceOwner; PRODUCER precisa ser dono do ws.
    const gate = await requireWorkspaceOwner(staff, workspace?.id ?? "");
    if (!gate.ok) return gate.response;

    const { searchParams } = new URL(request.url);
    const event = searchParams.get("event")?.trim();
    const take = parseSafeInt(searchParams.get("limit"), 50, { min: 1, max: 200 });

    const where: Record<string, unknown> = {};
    if (event && event !== "ALL") where.event = event;

    if (staff.role === "PRODUCER") {
      const owned = await prisma.course.findMany({
        where: { ownerId: staff.id },
        select: {
          id: true,
          externalProductId: true,
          externalProducts: { select: { externalProductId: true } },
        },
      });
      const ownedIds = owned.map((c) => c.id);
      // F11: union the legacy single field with all ids from the new table so
      // logs for newer ids (not mirrored to the legacy field) still match.
      const ownedExternal = Array.from(
        new Set(
          owned
            .flatMap((c) => [
              c.externalProductId,
              ...c.externalProducts.map((ep) => ep.externalProductId),
            ])
            .filter((v): v is string => !!v)
        )
      );

      if (ownedIds.length === 0 && ownedExternal.length === 0) {
        return NextResponse.json({ logs: [] });
      }

      where.OR = [
        ...(workspace ? [{ workspaceId: workspace.id }] : []),
        { courseId: { in: ownedIds } },
        { productExternalId: { in: ownedExternal } },
      ];
    }

    const logs = await prisma.webhookLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, requireAnyPermission, getStaffCourseIds } from "@/lib/auth";
import { resolveStaffWorkspace } from "@/lib/workspace";
import { DASHBOARD_PERMISSIONS } from "@/lib/collaborator";

// Gate espelhado da /api/producer/analytics (:80-83 e :102-131): a parede é a
// ROTA, não a página — o redirect de producer/page.tsx é client-side e um
// colaborador chamava esta URL direto e recebia receita, reembolsos, ticket e
// série diária do workspace inteiro (resolveStaffWorkspace resolve o ws pela
// própria linha Collaborator).
// VIEW_DASHBOARD **ou** VIEW_ANALYTICS: os KPIs são um recorte dos Relatórios,
// então quem vê Relatórios continua vendo o dashboard (ninguém perde acesso no
// deploy) e a permissão nova serve para liberar SÓ os KPIs.
export async function GET(request: Request) {
  try {
    const staff = await requireStaff();
    if (staff.role === "COLLABORATOR") {
      await requireAnyPermission(staff, DASHBOARD_PERMISSIONS);
    }
    const [{ workspace, scoped }, collabScope] = await Promise.all([
      resolveStaffWorkspace(staff),
      getStaffCourseIds(staff),
    ]);

    if (scoped && !workspace) {
      return NextResponse.json({
        totalRevenue: 0,
        totalRefunds: 0,
        netRevenue: 0,
        transactionCount: 0,
        averageTicket: 0,
        revenueByDay: [],
      });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const courseId = searchParams.get("courseId");

    const where: Record<string, unknown> = {};
    if (scoped && workspace) {
      where.workspaceId = workspace.id;
    }
    if (startDate || endDate) {
      where.createdAt = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(`${endDate}T23:59:59.999Z`) } : {}),
      };
    }
    // Escopo de curso do colaborador (2ª camada, §8). getStaffCourseIds devolve
    // null para ADMIN/PRODUCER — comportamento de hoje preservado byte a byte —
    // e a lista de cursos permitidos para COLLABORATOR (`[]` = sem contexto =
    // fail-closed: zera os números em vez de vazar o workspace).
    // ⚠️ Medido antes de filtrar: 0 de 5.897 ProducerTransaction têm courseId
    // nulo, então o filtro por curso não descarta receita legítima.
    if (courseId && courseId !== "all") {
      if (collabScope !== null && !collabScope.includes(courseId)) {
        return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
      }
      where.courseId = courseId;
    } else if (collabScope !== null) {
      where.courseId = { in: collabScope };
    }

    const transactions = await prisma.producerTransaction.findMany({
      where,
      select: { amount: true, status: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    let totalRevenue = 0;
    let totalRefunds = 0;
    let transactionCount = 0;
    const dayMap = new Map<string, number>();

    for (const tx of transactions) {
      if (tx.status === "COMPLETED") {
        totalRevenue += tx.amount;
        transactionCount++;
        const day = tx.createdAt.toISOString().slice(0, 10);
        dayMap.set(day, (dayMap.get(day) ?? 0) + tx.amount);
      } else if (tx.status === "REFUNDED" || tx.status === "CHARGED_BACK") {
        totalRefunds += tx.amount;
      }
    }

    const netRevenue = totalRevenue - totalRefunds;
    const averageTicket = transactionCount > 0 ? netRevenue / transactionCount : 0;

    const revenueByDay = Array.from(dayMap.entries()).map(([date, amount]) => ({
      date,
      amount: Math.round(amount * 100) / 100,
    }));

    return NextResponse.json({
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalRefunds: Math.round(totalRefunds * 100) / 100,
      netRevenue: Math.round(netRevenue * 100) / 100,
      transactionCount,
      averageTicket: Math.round(averageTicket * 100) / 100,
      revenueByDay,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

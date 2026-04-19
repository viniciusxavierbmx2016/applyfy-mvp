import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

interface Ctx {
  params: { id: string };
}

export async function GET(_req: Request, { params }: Ctx) {
  try {
    await requireAdmin();

    const plan = await prisma.plan.findUnique({
      where: { id: params.id },
      include: {
        subscriptions: {
          where: { status: "ACTIVE" },
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: "desc" },
        },
        _count: { select: { subscriptions: true } },
      },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ plan });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro interno" }, { status });
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    await requireAdmin();

    const plan = await prisma.plan.findUnique({ where: { id: params.id } });
    if (!plan) {
      return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const { name, price, maxWorkspaces, maxCoursesPerWorkspace, features, active } = body;

    const updated = await prisma.plan.update({
      where: { id: params.id },
      data: {
        ...(name != null && { name }),
        ...(price != null && { price }),
        ...(maxWorkspaces != null && { maxWorkspaces }),
        ...(maxCoursesPerWorkspace != null && { maxCoursesPerWorkspace }),
        ...(features !== undefined && { features }),
        ...(active != null && { active }),
      },
    });

    return NextResponse.json({ plan: updated });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro interno" }, { status });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    await requireAdmin();

    const activeCount = await prisma.subscription.count({
      where: {
        planId: params.id,
        status: { in: ["ACTIVE", "PAST_DUE", "PENDING"] },
      },
    });

    if (activeCount > 0) {
      return NextResponse.json(
        { error: "Plano possui assinaturas ativas" },
        { status: 400 }
      );
    }

    await prisma.plan.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("Record to delete does not exist")) {
      return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });
    }
    const status = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro interno" }, { status });
  }
}

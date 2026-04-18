import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const producer = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, role: true, name: true, email: true, avatarUrl: true },
    });
    if (!producer || producer.role !== "PRODUCER") {
      return NextResponse.json(
        { error: "Produtor não encontrado" },
        { status: 404 }
      );
    }

    const subscription = await prisma.subscription.findFirst({
      where: { userId: producer.id },
      orderBy: { createdAt: "desc" },
      include: {
        plan: true,
        invoices: { orderBy: { createdAt: "desc" } },
      },
    });

    const plans = await prisma.plan.findMany({
      where: { active: true },
      orderBy: { price: "asc" },
    });

    const [workspacesUsed, coursesUsed] = await Promise.all([
      prisma.workspace.count({ where: { ownerId: producer.id } }),
      prisma.course.count({ where: { ownerId: producer.id } }),
    ]);

    return NextResponse.json({
      producer,
      subscription,
      plans,
      usage: { workspacesUsed, coursesUsed },
    });
  } catch (error) {
    console.error("GET producer subscription error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const producer = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, role: true },
    });
    if (!producer || producer.role !== "PRODUCER") {
      return NextResponse.json(
        { error: "Produtor não encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { planId, exempt, exemptReason } = body;

    if (!planId) {
      return NextResponse.json({ error: "planId obrigatório" }, { status: 400 });
    }

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan || !plan.active) {
      return NextResponse.json(
        { error: "Plano inválido ou inativo" },
        { status: 400 }
      );
    }

    const existing = await prisma.subscription.findFirst({
      where: {
        userId: producer.id,
        status: { in: ["ACTIVE", "PENDING", "PAST_DUE"] },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Produtor já possui uma assinatura ativa" },
        { status: 409 }
      );
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const subscription = await prisma.subscription.create({
      data: {
        userId: producer.id,
        planId,
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd: exempt ? null : periodEnd,
        exempt: Boolean(exempt),
        exemptReason: exempt ? (exemptReason || null) : null,
      },
      include: { plan: true },
    });

    return NextResponse.json({ subscription }, { status: 201 });
  } catch (error) {
    console.error("POST producer subscription error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

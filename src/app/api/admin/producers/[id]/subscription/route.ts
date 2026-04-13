import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import type { ProducerSubscriptionStatus } from "@prisma/client";

const VALID_PLANS = ["Free", "Basic", "Pro", "Enterprise"];
const VALID_STATUS: ProducerSubscriptionStatus[] = [
  "ACTIVE",
  "EXPIRED",
  "CANCELLED",
];

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const producer = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, role: true, name: true, email: true },
    });
    if (!producer || producer.role !== "PRODUCER") {
      return NextResponse.json(
        { error: "Produtor não encontrado" },
        { status: 404 }
      );
    }

    const subscriptions = await prisma.producerSubscription.findMany({
      where: { producerId: producer.id },
      orderBy: { createdAt: "desc" },
    });

    const current = subscriptions.find((s) => s.status === "ACTIVE") || null;

    return NextResponse.json({ producer, current, subscriptions });
  } catch (error) {
    console.error("GET subscription error:", error);
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
    const { plan, amount, currency, startedAt, expiresAt } = body;

    if (!plan || !VALID_PLANS.includes(plan)) {
      return NextResponse.json(
        { error: "Plano inválido" },
        { status: 400 }
      );
    }
    const amt =
      typeof amount === "number" ? amount : parseFloat(String(amount || 0));
    if (!Number.isFinite(amt) || amt < 0) {
      return NextResponse.json(
        { error: "Valor inválido" },
        { status: 400 }
      );
    }

    // Close any current ACTIVE subscription
    await prisma.producerSubscription.updateMany({
      where: { producerId: producer.id, status: "ACTIVE" },
      data: { status: "CANCELLED" },
    });

    const created = await prisma.producerSubscription.create({
      data: {
        producerId: producer.id,
        plan,
        amount: amt,
        currency: (currency || "BRL").toString().toUpperCase().slice(0, 3),
        status: "ACTIVE",
        startedAt: startedAt ? new Date(startedAt) : new Date(),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    return NextResponse.json({ subscription: created }, { status: 201 });
  } catch (error) {
    console.error("POST subscription error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { subscriptionId, status, amount, expiresAt } = body;
    if (!subscriptionId) {
      return NextResponse.json(
        { error: "subscriptionId obrigatório" },
        { status: 400 }
      );
    }

    const sub = await prisma.producerSubscription.findUnique({
      where: { id: subscriptionId },
    });
    if (!sub || sub.producerId !== params.id) {
      return NextResponse.json(
        { error: "Assinatura não encontrada" },
        { status: 404 }
      );
    }

    if (status && !VALID_STATUS.includes(status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }

    const updated = await prisma.producerSubscription.update({
      where: { id: subscriptionId },
      data: {
        ...(status ? { status } : {}),
        ...(amount !== undefined
          ? { amount: parseFloat(String(amount)) || 0 }
          : {}),
        ...(expiresAt !== undefined
          ? { expiresAt: expiresAt ? new Date(expiresAt) : null }
          : {}),
      },
    });

    return NextResponse.json({ subscription: updated });
  } catch (error) {
    console.error("PATCH subscription error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

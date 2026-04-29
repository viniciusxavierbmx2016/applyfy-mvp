import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { SubscriptionStatus } from "@prisma/client";
import { sendEmail } from "@/lib/email";
import { subscriptionActivated, subscriptionRenewed, subscriptionSuspended } from "@/lib/email-templates";
import { safeCompare } from "@/lib/safe-compare";

type ApplyfyPayload = {
  event?: string;
  token?: string;
  client?: { email?: string; name?: string };
  transaction?: {
    id?: string;
    status?: string;
    amount?: number;
    paymentMethod?: string;
    payedAt?: string;
  };
  subscription?: {
    id?: string;
    status?: string;
    intervalType?: string;
    intervalCount?: number;
    cycle?: number;
  } | null;
  orderItems?: Array<{ product?: { externalId?: string } }>;
};

function formatDateBR(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function log(event: string, email: string | undefined, txId: string | undefined, result: string) {
  console.log(`[members-club webhook] event=${event} email=${email ?? "?"} tx=${txId ?? "?"} → ${result}`);
}

export async function POST(request: Request) {
  let body: ApplyfyPayload = {};
  try {
    body = (await request.json().catch(() => ({}))) as ApplyfyPayload;
  } catch {
    return NextResponse.json({ received: true });
  }

  const event = body.event || "UNKNOWN";
  const email = body.client?.email?.trim().toLowerCase();
  const txId = body.transaction?.id;

  try {
    const token = process.env.MEMBERS_CLUB_WEBHOOK_TOKEN;
    if (!token || !body.token || !safeCompare(body.token, token)) {
      log(event, email, txId, "invalid token");
      return NextResponse.json({ received: true }, { status: 401 });
    }

    if (!email) {
      log(event, email, txId, "missing email");
      return NextResponse.json({ received: true });
    }

    const producer = await prisma.user.findFirst({
      where: { email, role: "PRODUCER" },
      select: { id: true, name: true, email: true },
    });

    if (!producer) {
      log(event, email, txId, "producer not found");
      return NextResponse.json({ received: true });
    }

    switch (event) {
      case "TRANSACTION_PAID":
        await handlePaid(producer, body);
        break;
      case "TRANSACTION_CANCELED":
        await handleCanceled(producer.id, body);
        break;
      case "TRANSACTION_REFUNDED":
      case "TRANSACTION_CHARGED_BACK":
        await handleRefund(producer, body, event);
        break;
      default:
        log(event, email, txId, "ignored event");
    }
  } catch (error) {
    console.error("[members-club webhook] error:", error);
    log(event, email, txId, `error: ${error instanceof Error ? error.message : "unknown"}`);
  }

  return NextResponse.json({ received: true });
}

async function handlePaid(
  producer: { id: string; name: string | null; email: string },
  body: ApplyfyPayload
) {
  const producerId = producer.id;
  const email = body.client?.email;
  const txId = body.transaction?.id;
  const amount = body.transaction?.amount ?? 0;
  const paidAt = body.transaction?.payedAt ? new Date(body.transaction.payedAt) : new Date();
  const applyfySubId = body.subscription?.id ?? null;

  if (txId) {
    const existingInvoice = await prisma.invoice.findUnique({
      where: { externalId: txId },
    });
    if (existingInvoice) {
      log("TRANSACTION_PAID", email, txId, "duplicate (invoice exists)");
      return;
    }
  }

  const sub = await prisma.subscription.findFirst({
    where: { userId: producerId },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();

  if (!sub) {
    const defaultPlan = await prisma.plan.findFirst({
      where: { active: true },
      orderBy: { price: "asc" },
    });
    if (!defaultPlan) {
      log("TRANSACTION_PAID", email, txId, "no active plan found");
      return;
    }

    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + 30);

    const created = await prisma.subscription.create({
      data: {
        userId: producerId,
        planId: defaultPlan.id,
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        externalId: applyfySubId,
      },
    });

    await createInvoice(created.id, amount, txId, paidAt);

    const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
    const template = subscriptionActivated(
      producer.name || "Produtor",
      defaultPlan.name,
      fmt.format(defaultPlan.price),
      formatDateBR(periodEnd)
    );
    sendEmail({ to: { email: producer.email, name: producer.name || undefined }, ...template }).catch((err) => console.error("[EMAIL_ERROR] subscriptionActivated to:", producer.email, err?.message || err));

    log("TRANSACTION_PAID", email, txId, "created subscription");
    return;
  }

  const reactivateStatuses: SubscriptionStatus[] = ["PENDING", "PAST_DUE", "SUSPENDED", "CANCELLED"];

  if (reactivateStatuses.includes(sub.status)) {
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + 30);

    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        suspendedAt: null,
        cancelledAt: null,
        ...(applyfySubId ? { externalId: applyfySubId } : {}),
      },
    });

    await createInvoice(sub.id, amount, txId, paidAt);

    await prisma.billingReminder.deleteMany({
      where: { subscriptionId: sub.id },
    });

    const plan = await prisma.plan.findUnique({ where: { id: sub.planId }, select: { name: true, price: true } });
    if (plan) {
      const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
      const template = subscriptionActivated(producer.name || "Produtor", plan.name, fmt.format(plan.price), formatDateBR(periodEnd));
      sendEmail({ to: { email: producer.email, name: producer.name || undefined }, ...template }).catch((err) => console.error("[EMAIL_ERROR] subscriptionActivated to:", producer.email, err?.message || err));
    }

    log("TRANSACTION_PAID", email, txId, `reactivated from ${sub.status}`);
    return;
  }

  if (sub.status === "ACTIVE") {
    const base = sub.currentPeriodEnd && sub.currentPeriodEnd > now
      ? sub.currentPeriodEnd
      : now;
    const extended = new Date(base);
    extended.setDate(extended.getDate() + 30);

    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        currentPeriodEnd: extended,
        ...(applyfySubId ? { externalId: applyfySubId } : {}),
      },
    });

    await createInvoice(sub.id, amount, txId, paidAt);

    await prisma.billingReminder.deleteMany({
      where: { subscriptionId: sub.id },
    });

    const plan = await prisma.plan.findUnique({ where: { id: sub.planId }, select: { name: true, price: true } });
    if (plan) {
      const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
      const template = subscriptionRenewed(producer.name || "Produtor", plan.name, fmt.format(amount || plan.price), formatDateBR(extended));
      sendEmail({ to: { email: producer.email, name: producer.name || undefined }, ...template }).catch((err) => console.error("[EMAIL_ERROR] subscriptionRenewed to:", producer.email, err?.message || err));
    }

    log("TRANSACTION_PAID", email, txId, "renewed (extended period)");
    return;
  }

  log("TRANSACTION_PAID", email, txId, `unhandled status ${sub.status}`);
}

async function handleCanceled(producerId: string, body: ApplyfyPayload) {
  const email = body.client?.email;
  const txId = body.transaction?.id;

  const sub = await prisma.subscription.findFirst({
    where: {
      userId: producerId,
      status: { in: ["ACTIVE", "PAST_DUE"] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!sub) {
    log("TRANSACTION_CANCELED", email, txId, "no active subscription");
    return;
  }

  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
    },
  });

  if (txId) {
    const existing = await prisma.invoice.findUnique({ where: { externalId: txId } });
    if (existing) {
      await prisma.invoice.update({
        where: { id: existing.id },
        data: { status: "FAILED", failedAt: new Date() },
      });
    }
  }

  log("TRANSACTION_CANCELED", email, txId, "cancelled subscription");
}

async function handleRefund(
  producer: { id: string; name: string | null; email: string },
  body: ApplyfyPayload,
  event: string
) {
  const email = body.client?.email;
  const txId = body.transaction?.id;

  const sub = await prisma.subscription.findFirst({
    where: {
      userId: producer.id,
      status: { in: ["ACTIVE", "PAST_DUE", "PENDING"] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (sub) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: "SUSPENDED",
        suspendedAt: new Date(),
      },
    });

    const template = subscriptionSuspended(producer.name || "Produtor");
    sendEmail({ to: { email: producer.email, name: producer.name || undefined }, ...template }).catch((err) => console.error("[EMAIL_ERROR] subscriptionSuspended to:", producer.email, err?.message || err));
  }

  if (txId) {
    const invoice = await prisma.invoice.findUnique({ where: { externalId: txId } });
    if (invoice) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: "REFUNDED", refundedAt: new Date() },
      });
    }
  }

  const label = event === "TRANSACTION_CHARGED_BACK" ? "chargeback" : "refund";
  log(event, email, txId, `suspended (${label})${sub ? "" : " — no active sub found"}`);
}

async function createInvoice(
  subscriptionId: string,
  amount: number,
  externalId: string | undefined,
  paidAt: Date
) {
  await prisma.invoice.create({
    data: {
      subscriptionId,
      amount,
      currency: "BRL",
      status: "PAID",
      paidAt,
      externalId: externalId || null,
    },
  });
}

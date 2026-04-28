import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import type { SubscriptionStatus } from "@prisma/client";

interface Ctx {
  params: { id: string };
}

export async function GET(_req: Request, { params }: Ctx) {
  try {
    await requireAdmin();

    const subscription = await prisma.subscription.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        plan: true,
        invoices: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!subscription) {
      return NextResponse.json({ error: "Assinatura não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ subscription });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro interno" }, { status });
  }
}

type Action =
  | "activate"
  | "suspend"
  | "cancel"
  | "reactivate"
  | "exempt"
  | "remove_exempt"
  | "change_plan"
  | "extend";

const ALLOWED_TRANSITIONS: Record<Action, SubscriptionStatus[]> = {
  activate: ["PENDING"],
  suspend: ["ACTIVE", "PAST_DUE"],
  cancel: ["ACTIVE", "PAST_DUE", "SUSPENDED", "PENDING"],
  reactivate: ["SUSPENDED", "CANCELLED"],
  exempt: ["PENDING", "ACTIVE", "PAST_DUE", "SUSPENDED"],
  remove_exempt: ["ACTIVE"],
  change_plan: ["ACTIVE", "PENDING"],
  extend: ["ACTIVE", "PAST_DUE"],
};

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    await requireAdmin();

    const sub = await prisma.subscription.findUnique({ where: { id: params.id } });
    if (!sub) {
      return NextResponse.json({ error: "Assinatura não encontrada" }, { status: 404 });
    }

    const body = await request.json();
    const action = body.action as Action;
    const reason = body.reason as string | undefined;

    if (!action || !ALLOWED_TRANSITIONS[action]) {
      return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
    }

    const allowed = ALLOWED_TRANSITIONS[action];
    if (!allowed.includes(sub.status)) {
      return NextResponse.json(
        { error: `Não é possível executar "${action}" no status "${sub.status}"` },
        { status: 400 }
      );
    }

    const now = new Date();
    let data: Record<string, unknown> = {};

    switch (action) {
      case "activate": {
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        data = {
          status: "ACTIVE" as SubscriptionStatus,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        };
        break;
      }
      case "suspend":
        data = { status: "SUSPENDED" as SubscriptionStatus, suspendedAt: now };
        break;
      case "cancel":
        data = { status: "CANCELLED" as SubscriptionStatus, cancelledAt: now };
        break;
      case "reactivate": {
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        data = {
          status: "ACTIVE" as SubscriptionStatus,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          suspendedAt: null,
          cancelledAt: null,
        };
        break;
      }
      case "exempt":
        data = {
          exempt: true,
          exemptReason: reason || null,
          status: "ACTIVE" as SubscriptionStatus,
          currentPeriodStart: sub.currentPeriodStart || now,
          currentPeriodEnd: null,
        };
        break;
      case "remove_exempt":
        if (!sub.exempt) {
          return NextResponse.json({ error: "Assinatura não é isenta" }, { status: 400 });
        }
        data = { exempt: false, exemptReason: null };
        break;
      case "change_plan": {
        const newPlanId = body.planId as string;
        if (!newPlanId) {
          return NextResponse.json({ error: "planId obrigatório" }, { status: 400 });
        }
        const newPlan = await prisma.plan.findUnique({ where: { id: newPlanId } });
        if (!newPlan || !newPlan.active) {
          return NextResponse.json({ error: "Plano inválido ou inativo" }, { status: 400 });
        }
        data = { planId: newPlanId };
        break;
      }
      case "extend": {
        const days = parseInt(body.days, 10);
        if (!days || days < 1) {
          return NextResponse.json({ error: "days obrigatório (mínimo 1)" }, { status: 400 });
        }
        const base = sub.currentPeriodEnd || now;
        const extended = new Date(base);
        extended.setDate(extended.getDate() + days);
        data = { currentPeriodEnd: extended };
        break;
      }
    }

    const updated = await prisma.subscription.update({
      where: { id: params.id },
      data,
      include: {
        user: { select: { id: true, name: true, email: true } },
        plan: { select: { id: true, name: true, price: true } },
      },
    });

    if (["activate", "reactivate", "exempt"].includes(action)) {
      await prisma.billingReminder.deleteMany({
        where: { subscriptionId: params.id },
      });
    }

    return NextResponse.json({ subscription: updated });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro interno" }, { status });
  }
}

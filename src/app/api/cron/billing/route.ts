import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import {
  subscriptionExpiring,
  subscriptionSuspended,
} from "@/lib/email-templates";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const results = { reminded: 0, suspended: 0, errors: 0 };

  const subscriptions = await prisma.subscription.findMany({
    where: {
      status: { in: ["ACTIVE", "PAST_DUE"] },
      exempt: false,
      currentPeriodEnd: { not: null },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      plan: { select: { name: true, price: true } },
      billingReminders: true,
    },
  });

  for (const sub of subscriptions) {
    try {
      const periodEnd = sub.currentPeriodEnd!;
      const diffMs = periodEnd.getTime() - now.getTime();
      const daysUntilDue = diffMs / (1000 * 60 * 60 * 24);
      const daysOverdue = -daysUntilDue;

      const sentTypes = new Set(sub.billingReminders.map((r) => r.type));

      if (daysUntilDue <= 3 && daysUntilDue > 1 && !sentTypes.has("before_3d")) {
        await sendBillingEmail(sub, "before_3d", 3);
        results.reminded++;
      }

      if (daysUntilDue <= 1 && daysUntilDue > 0 && !sentTypes.has("before_1d")) {
        await sendBillingEmail(sub, "before_1d", 1);
        results.reminded++;
      }

      if (daysUntilDue <= 0 && daysOverdue < 1 && !sentTypes.has("due_today")) {
        await sendBillingEmail(sub, "due_today", 0);
        if (sub.status === "ACTIVE") {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: "PAST_DUE" },
          });
        }
        results.reminded++;
      }

      if (daysOverdue >= 1 && !sentTypes.has("after_1d")) {
        await sendBillingEmail(sub, "after_1d", -1);
        results.reminded++;
      }

      if (daysOverdue >= 3 && !sentTypes.has("after_3d_suspend")) {
        await sendSuspendEmail(sub);
        await prisma.billingReminder.create({
          data: { subscriptionId: sub.id, type: "after_3d_suspend" },
        });
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { status: "SUSPENDED", suspendedAt: now },
        });
        results.suspended++;
      }

      if (daysOverdue >= 7 && !sentTypes.has("after_7d")) {
        await sendBillingEmail(sub, "after_7d", -7);
        results.reminded++;
      }

      if (daysOverdue >= 15 && !sentTypes.has("after_15d")) {
        await sendBillingEmail(sub, "after_15d", -15);
        results.reminded++;
      }
    } catch (err) {
      console.error(
        `[BILLING-CRON] Error for sub ${sub.id}:`,
        err instanceof Error ? err.message : err
      );
      results.errors++;
    }
  }

  console.log(`[BILLING-CRON] Done:`, results);
  return Response.json(results);
}

type SubWithRelations = {
  id: string;
  user: { id: string; name: string; email: string };
  plan: { name: string; price: number } | null;
};

async function sendBillingEmail(
  sub: SubWithRelations,
  type: string,
  daysLeft: number
) {
  await prisma.billingReminder.create({
    data: { subscriptionId: sub.id, type },
  });

  const template = subscriptionExpiring(
    sub.user.name || "Produtor",
    daysLeft
  );

  await sendEmail({
    to: { email: sub.user.email, name: sub.user.name || undefined },
    subject: template.subject,
    htmlContent: template.htmlContent,
  }).catch((err) =>
    console.error(
      `[BILLING-CRON] Email error (${type}) for ${sub.user.email}:`,
      err instanceof Error ? err.message : err
    )
  );

  console.log(`[BILLING-CRON] Sent ${type} to ${sub.user.email}`);
}

async function sendSuspendEmail(sub: SubWithRelations) {
  const template = subscriptionSuspended(sub.user.name || "Produtor");

  await sendEmail({
    to: { email: sub.user.email, name: sub.user.name || undefined },
    subject: template.subject,
    htmlContent: template.htmlContent,
  }).catch((err) =>
    console.error(
      `[BILLING-CRON] Suspend email error for ${sub.user.email}:`,
      err instanceof Error ? err.message : err
    )
  );

  console.log(`[BILLING-CRON] Sent suspend to ${sub.user.email}`);
}

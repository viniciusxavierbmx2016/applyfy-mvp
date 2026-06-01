import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import {
  subscriptionExpiring,
  subscriptionSuspended,
} from "@/lib/email-templates";
import { logger } from "@/lib/logger";

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
        const sent = await sendBillingEmail(sub, "before_3d", 3);
        if (sent) results.reminded++;
        else results.errors++;
      }

      if (daysUntilDue <= 1 && daysUntilDue > 0 && !sentTypes.has("before_1d")) {
        const sent = await sendBillingEmail(sub, "before_1d", 1);
        if (sent) results.reminded++;
        else results.errors++;
      }

      if (daysUntilDue <= 0 && daysOverdue < 1 && !sentTypes.has("due_today")) {
        const sent = await sendBillingEmail(sub, "due_today", 0);
        // PAST_DUE reflects the calendar (date passed), not the email
        // outcome — leaving it unconditional. If the email failed, no
        // BillingReminder("due_today") was recorded → next cron retries
        // the email; the second `update` here is a no-op since status
        // is already PAST_DUE.
        if (sub.status === "ACTIVE") {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: "PAST_DUE" },
          });
        }
        if (sent) results.reminded++;
        else results.errors++;
      }

      if (daysOverdue >= 1 && !sentTypes.has("after_1d")) {
        const sent = await sendBillingEmail(sub, "after_1d", -1);
        if (sent) results.reminded++;
        else results.errors++;
      }

      if (daysOverdue >= 3 && !sentTypes.has("after_3d_suspend")) {
        // A producer is never suspended without the warning email
        // actually leaving our infra. If Brevo is down, we record the
        // failure and try again next cron — the customer stays ACTIVE
        // in the meantime.
        const delivered = await sendSuspendEmail(sub);
        if (delivered) {
          await prisma.billingReminder.create({
            data: { subscriptionId: sub.id, type: "after_3d_suspend" },
          });
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: "SUSPENDED", suspendedAt: now },
          });
          results.suspended++;
        } else {
          results.errors++;
        }
      }

      if (daysOverdue >= 7 && !sentTypes.has("after_7d")) {
        const sent = await sendBillingEmail(sub, "after_7d", -7);
        if (sent) results.reminded++;
        else results.errors++;
      }

      if (daysOverdue >= 15 && !sentTypes.has("after_15d")) {
        const sent = await sendBillingEmail(sub, "after_15d", -15);
        if (sent) results.reminded++;
        else results.errors++;
      }
    } catch (err) {
      console.error(
        `[BILLING-CRON] Error for sub ${sub.id}:`,
        err instanceof Error ? err.message : err
      );
      results.errors++;
    }
  }

  logger.info("BILLING-CRON", "Done", results as unknown as Record<string, unknown>);
  return Response.json(results);
}

type SubWithRelations = {
  id: string;
  user: { id: string; name: string; email: string };
  plan: { name: string; price: number } | null;
};

// Returns true only if the email was actually delivered AND the
// BillingReminder row was created. On email failure: no reminder is
// stored → next cron retries automatically, so a flaky Brevo can't
// cause a customer to silently miss a notice (which used to happen
// because the reminder was inserted BEFORE the await).
async function sendBillingEmail(
  sub: SubWithRelations,
  type: string,
  daysLeft: number
): Promise<boolean> {
  const template = subscriptionExpiring(
    sub.user.name || "Produtor",
    daysLeft
  );

  try {
    await sendEmail({
      to: { email: sub.user.email, name: sub.user.name || undefined },
      subject: template.subject,
      htmlContent: template.htmlContent,
    });
  } catch (err) {
    console.error(
      `[BILLING-CRON] Email error (${type}) for ${sub.user.email}:`,
      err instanceof Error ? err.message : err
    );
    return false;
  }

  await prisma.billingReminder.create({
    data: { subscriptionId: sub.id, type },
  });
  logger.info("BILLING-CRON", `Sent ${type} to ${sub.user.email}`);
  return true;
}

// Returns true only if the email was actually delivered. The caller
// owns both the BillingReminder row and the Subscription status update
// — they MUST be gated on this boolean so a producer is never
// suspended without receiving the warning email.
async function sendSuspendEmail(sub: SubWithRelations): Promise<boolean> {
  const template = subscriptionSuspended(sub.user.name || "Produtor");

  try {
    await sendEmail({
      to: { email: sub.user.email, name: sub.user.name || undefined },
      subject: template.subject,
      htmlContent: template.htmlContent,
    });
  } catch (err) {
    console.error(
      `[BILLING-CRON] Suspend email error for ${sub.user.email}:`,
      err instanceof Error ? err.message : err
    );
    return false;
  }

  logger.info("BILLING-CRON", `Sent suspend to ${sub.user.email}`);
  return true;
}

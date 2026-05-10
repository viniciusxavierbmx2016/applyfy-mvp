import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  activateEnrollment,
  ensureUserByEmail,
  getSetting,
} from "@/lib/webhook-helpers";
import { processAutomations } from "@/lib/automation-engine";
import { safeCompare } from "@/lib/safe-compare";
import { sendEmail } from "@/lib/email";
import { staffAccessGranted, studentAccessGranted } from "@/lib/email-templates";
import { logger } from "@/lib/logger";
import { applyfyWebhookSchema } from "@/lib/validations";
import type { z } from "zod";

// Applyfy webhook events.
// Docs: https://app.applyfy.com.br/api/v1
// Payload shape (reference):
// {
//   event, token, offerCode,
//   client: { id, name, email, phone },
//   transaction: { id, status, paymentMethod, amount },
//   orderItems: [ { id, price, product: { id, name, externalId } } ]
// }

type ApplyfyPayload = z.infer<typeof applyfyWebhookSchema>;

const GRANT_EVENTS = new Set(["TRANSACTION_PAID"]);
const REVOKE_EVENTS = new Set([
  "TRANSACTION_CANCELED",
  "TRANSACTION_REFUNDED",
  "TRANSACTION_CHARGED_BACK",
]);
const IGNORED_EVENTS = new Set(["TRANSACTION_CREATED"]);

async function logWebhook(entry: {
  event: string;
  email?: string | null;
  productExternalId?: string | null;
  courseId?: string | null;
  workspaceId?: string | null;
  status: "SUCCESS" | "ERROR" | "IGNORED";
  errorMessage?: string | null;
  rawPayload: unknown;
}) {
  try {
    await prisma.webhookLog.create({
      data: {
        event: entry.event,
        email: entry.email ?? null,
        productExternalId: entry.productExternalId ?? null,
        courseId: entry.courseId ?? null,
        workspaceId: entry.workspaceId ?? null,
        status: entry.status,
        errorMessage: entry.errorMessage ?? null,
        rawPayload: entry.rawPayload as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    console.error("Failed to persist WebhookLog:", err);
  }
}

export async function POST(request: Request) {
  let body: ApplyfyPayload = {};
  try {
    const raw = await request.json().catch(() => ({}));
    const parsed = applyfyWebhookSchema.safeParse(raw);
    if (!parsed.success) {
      const errorSummary = parsed.error.issues
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      logger.error("applyfy webhook", "Zod validation failed", {
        errors: errorSummary,
        rawPayload: JSON.stringify(raw).slice(0, 500),
      });
      const rawObj = (raw ?? {}) as Record<string, unknown>;
      const client = rawObj.client as Record<string, unknown> | undefined;
      const fallbackEvent =
        typeof rawObj.event === "string" ? rawObj.event : "UNKNOWN";
      const fallbackEmail =
        typeof client?.email === "string" ? client.email : null;
      await prisma.webhookLog
        .create({
          data: {
            event: fallbackEvent,
            email: fallbackEmail,
            status: "ERROR",
            errorMessage: `Zod validation: ${errorSummary}`.slice(0, 500),
            rawPayload: rawObj as Prisma.InputJsonValue,
          },
        })
        .catch(() => {});
      return NextResponse.json({ received: true }, { status: 200 });
    }
    body = parsed.data;
    const event = body?.event || "UNKNOWN";

    logger.info("applyfy webhook", "received", {
      event,
      transactionId: body?.transaction?.id,
      email: body?.client?.email,
      items: body?.orderItems?.length ?? 0,
    });

    // Token validation — reject fast, but still return 200 per Applyfy spec.
    // Order:
    //  1. Try the per-workspace token `applyfy_token:<workspaceId>` for any
    //     workspace whose course matches an item in the payload. New producers
    //     point Applyfy at the scoped URL, but if any are still on this global
    //     URL their per-workspace token still works.
    //  2. Fall back to the legacy global `applyfy_token` / APPLYFY_TOKEN env.
    const providedToken = body?.token || "";
    const peekItems = Array.isArray(body?.orderItems) ? body.orderItems : [];
    const candidateExternalIds = Array.from(
      new Set(
        peekItems
          .flatMap((it) => [
            it?.product?.externalId?.trim(),
            it?.product?.id?.trim(),
          ])
          .filter((v): v is string => !!v)
      )
    );
    let matchedToken = false;
    if (providedToken && candidateExternalIds.length > 0) {
      const candidateCourses = await prisma.course.findMany({
        where: { externalProductId: { in: candidateExternalIds } },
        select: { workspaceId: true },
      });
      const workspaceIds = Array.from(
        new Set(candidateCourses.map((c) => c.workspaceId))
      );
      for (const wsId of workspaceIds) {
        const wsToken = await getSetting(`applyfy_token:${wsId}`);
        if (wsToken && safeCompare(providedToken, wsToken)) {
          matchedToken = true;
          break;
        }
      }
    }
    if (!matchedToken) {
      const legacyToken =
        (await getSetting("applyfy_token")) || process.env.APPLYFY_TOKEN || "";
      if (!legacyToken || !safeCompare(providedToken, legacyToken)) {
        console.warn("[applyfy webhook] invalid token", { event });
        await logWebhook({
          event,
          email: body?.client?.email,
          status: "ERROR",
          errorMessage: "Invalid token",
          rawPayload: body,
        });
        return NextResponse.json(
          { ok: false, error: "Invalid token" },
          { status: 200 }
        );
      }
    }

    if (IGNORED_EVENTS.has(event)) {
      logger.info("applyfy webhook", "ignored event", { event });
      await logWebhook({
        event,
        email: body?.client?.email,
        status: "IGNORED",
        rawPayload: body,
      });
      return NextResponse.json({ ok: true, ignored: event }, { status: 200 });
    }

    const email = body?.client?.email?.trim().toLowerCase();
    const name = body?.client?.name ?? undefined;
    const phone = body?.client?.phone?.trim() || null;

    if (!email) {
      await logWebhook({
        event,
        status: "ERROR",
        errorMessage: "Missing client.email",
        rawPayload: body,
      });
      return NextResponse.json(
        { ok: false, error: "Missing client.email" },
        { status: 200 }
      );
    }

    const items = Array.isArray(body?.orderItems) ? body.orderItems : [];
    if (items.length === 0) {
      await logWebhook({
        event,
        email,
        status: "ERROR",
        errorMessage: "Missing orderItems",
        rawPayload: body,
      });
      return NextResponse.json(
        { ok: false, error: "Missing orderItems" },
        { status: 200 }
      );
    }

    if (GRANT_EVENTS.has(event)) {
      // We don't short-circuit duplicate webhooks anymore: enrolment
      // (activateEnrollment) and ProducerTransaction (upsert) are both
      // idempotent on retry, and we WANT them re-confirmed so the
      // dashboard always reflects what Applyfy currently believes.
      // What we DO suppress, per buyer/transaction, is the access
      // email — that check happens just before sendEmail, in the loop.
      const txId = body?.transaction?.id?.trim() || null;

      const results: Array<{
        externalId: string;
        courseId?: string;
        granted: boolean;
        reason?: string;
      }> = [];

      for (const item of items) {
        const externalId = item?.product?.externalId?.trim();
        const productId = item?.product?.id?.trim();
        const lookupId = externalId || productId || "";
        if (!externalId && !productId) {
          await logWebhook({
            event,
            email,
            status: "ERROR",
            errorMessage: "Missing product.externalId and product.id",
            rawPayload: item,
          });
          results.push({ externalId: "", granted: false, reason: "missing product identifiers" });
          continue;
        }

        // Try externalId first (configured per-product when available),
        // fall back to product.id (Applyfy's stable internal id).
        let course = externalId
          ? await prisma.course.findFirst({
              where: { externalProductId: externalId },
            })
          : null;
        if (!course && productId) {
          course = await prisma.course.findFirst({
            where: { externalProductId: productId },
          });
        }

        if (!course) {
          logger.info(
            "applyfy webhook",
            `no course for externalId=${externalId ?? ""} productId=${productId ?? ""}`
          );
          await logWebhook({
            event,
            email,
            productExternalId: lookupId,
            status: "ERROR",
            errorMessage: `No course linked to externalId=${externalId ?? ""} productId=${productId ?? ""}`,
            rawPayload: item,
          });
          results.push({ externalId: lookupId, granted: false, reason: "no course" });
          continue;
        }

        const matchedVia =
          course.externalProductId === externalId ? "externalId" : "productId";
        logger.info(
          "applyfy webhook",
          `matched course "${course.title}" via ${matchedVia}`
        );

        // Resolve the user and ensure a per-workspace credential exists for
        // pure STUDENTs. Subsequent iterations of the same buyer/workspace
        // are no-ops (existing credential is left untouched).
        const { user, tempPassword, isStaff } = await ensureUserByEmail(
          email,
          name,
          course.workspaceId,
          phone
        );

        await activateEnrollment(user.id, course.id);

        // Record the sale on ProducerTransaction so /api/producer/sales/stats
        // (the dashboard KPIs) sees it. The scoped webhook already does this
        // on its own path; mirroring it here closes the gap for producers
        // pointing Applyfy at the global URL.
        const txExternalId = body?.transaction?.id?.trim() || null;
        if (txExternalId) {
          await prisma.producerTransaction
            .upsert({
              where: { externalId: txExternalId },
              update: {},
              create: {
                workspaceId: course.workspaceId,
                userId: user.id,
                courseId: course.id,
                amount: Number(body?.transaction?.amount) || Number(item?.price) || 0,
                status: "COMPLETED",
                paymentMethod: body?.transaction?.paymentMethod ?? null,
                externalId: txExternalId,
                customerEmail: email,
                customerName: name ?? null,
              },
            })
            .catch((err) =>
              logger.error("applyfy webhook", "ProducerTransaction upsert failed", {
                txId: txExternalId,
                error: String(err),
              })
            );
        }

        processAutomations({
          type: "STUDENT_ENROLLED",
          workspaceId: course.workspaceId,
          courseId: course.id,
          userId: user.id,
        }).catch(() => {});

        // Send access email. Pure STUDENTs receive a workspace-scoped
        // mc-XXXXXX password (when newly issued); staff/collab buyers
        // are pointed at their existing Members Club credentials.
        // De-dup per (transaction.id, email) within the last 24h so a
        // retried webhook never produces a second copy of the email.
        try {
          let alreadyEmailed = false;
          if (txId && email) {
            const prior = await prisma.webhookLog.findFirst({
              where: {
                event: "TRANSACTION_PAID",
                status: "SUCCESS",
                email,
                createdAt: { gte: new Date(Date.now() - 60 * 1000) },
                rawPayload: { path: ["transaction", "id"], equals: txId },
              },
              select: { id: true },
            });
            alreadyEmailed = !!prior;
          }
          if (alreadyEmailed) {
            logger.info("applyfy webhook", "skipping duplicate email", {
              email,
              txId,
            });
          } else {
            const courseWithWorkspace = await prisma.course.findUnique({
              where: { id: course.id },
              include: { workspace: true },
            });
            if (courseWithWorkspace?.workspace) {
              const ws = courseWithWorkspace.workspace;
              const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
              const loginUrl = `${appUrl}/w/${ws.slug}/login`;
              const template = isStaff
                ? staffAccessGranted(
                    name || email.split("@")[0],
                    course.title,
                    ws.name,
                    loginUrl
                  )
                : studentAccessGranted(
                    name || email.split("@")[0],
                    course.title,
                    ws.name,
                    loginUrl,
                    tempPassword
                  );
              await sendEmail({
                to: { email, name: name || undefined },
                ...template,
                senderName: ws.name,
              }).catch((err) =>
                logger.error("applyfy webhook", "email send failed", {
                  email,
                  error: String(err),
                })
              );
            }
          }
        } catch (emailErr) {
          logger.error("applyfy webhook", "email block error", {
            email,
            error: String(emailErr),
          });
        }

        await logWebhook({
          event,
          email,
          productExternalId: course.externalProductId ?? lookupId,
          courseId: course.id,
          status: "SUCCESS",
          // Store the full body (not just the item) so the idempotency
          // guard at the top can match by transaction.id on retry.
          rawPayload: body,
        });
        results.push({ externalId: lookupId, courseId: course.id, granted: true });
      }

      return NextResponse.json({ ok: true, results }, { status: 200 });
    }

    if (REVOKE_EVENTS.has(event)) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        await logWebhook({
          event,
          email,
          status: "IGNORED",
          errorMessage: "User not found",
          rawPayload: body,
        });
        return NextResponse.json({ ok: true, revoked: 0 }, { status: 200 });
      }

      let revoked = 0;
      for (const item of items) {
        const externalId = item?.product?.externalId?.trim();
        const productId = item?.product?.id?.trim();
        if (!externalId && !productId) continue;

        let course = externalId
          ? await prisma.course.findFirst({
              where: { externalProductId: externalId },
            })
          : null;
        if (!course && productId) {
          course = await prisma.course.findFirst({
            where: { externalProductId: productId },
          });
        }
        if (!course) {
          await logWebhook({
            event,
            email,
            productExternalId: externalId || productId || null,
            status: "ERROR",
            errorMessage: `No course linked to externalId=${externalId ?? ""} productId=${productId ?? ""}`,
            rawPayload: item,
          });
          continue;
        }

        const updated = await prisma.enrollment.updateMany({
          where: { userId: user.id, courseId: course.id },
          data: { status: "CANCELLED" },
        });
        revoked += updated.count;

        await logWebhook({
          event,
          email,
          productExternalId: course.externalProductId ?? null,
          courseId: course.id,
          status: "SUCCESS",
          rawPayload: item,
        });
      }

      return NextResponse.json({ ok: true, revoked }, { status: 200 });
    }

    await logWebhook({
      event,
      email,
      status: "IGNORED",
      errorMessage: "Unhandled event",
      rawPayload: body,
    });
    return NextResponse.json({ ok: true, ignored: event }, { status: 200 });
  } catch (error) {
    console.error("[applyfy webhook] processing error:", error);
    await logWebhook({
      event: body?.event || "UNKNOWN",
      email: body?.client?.email,
      status: "ERROR",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      rawPayload: body,
    });
    // Applyfy requires 200 OK to avoid retries on non-recoverable errors.
    return NextResponse.json(
      { ok: false, error: "Webhook processing failed" },
      { status: 200 }
    );
  }
}

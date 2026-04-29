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

// Applyfy webhook events.
// Docs: https://app.applyfy.com.br/api/v1
// Payload shape (reference):
// {
//   event, token, offerCode,
//   client: { id, name, email, phone },
//   transaction: { id, status, paymentMethod, amount },
//   orderItems: [ { id, price, product: { id, name, externalId } } ]
// }

type ApplyfyProduct = { id?: string; name?: string; externalId?: string };
type ApplyfyOrderItem = { id?: string; price?: number; product?: ApplyfyProduct };
type ApplyfyPayload = {
  event?: string;
  token?: string;
  offerCode?: string;
  client?: { id?: string; name?: string; email?: string; phone?: string };
  transaction?: {
    id?: string;
    status?: string;
    paymentMethod?: string;
    amount?: number;
  };
  orderItems?: ApplyfyOrderItem[];
};

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
    body = (await request.json().catch(() => ({}))) as ApplyfyPayload;
    const event = body?.event || "UNKNOWN";

    console.log("[applyfy webhook] received", {
      event,
      transactionId: body?.transaction?.id,
      email: body?.client?.email,
      items: body?.orderItems?.length ?? 0,
    });

    // Token validation — reject fast, but still return 200 per Applyfy spec
    const storedToken =
      (await getSetting("applyfy_token")) || process.env.APPLYFY_TOKEN || "";
    const providedToken = body?.token || "";

    if (!storedToken || !safeCompare(providedToken, storedToken)) {
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

    if (IGNORED_EVENTS.has(event)) {
      console.log("[applyfy webhook] ignored event", { event });
      await logWebhook({
        event,
        email: body?.client?.email,
        status: "IGNORED",
        rawPayload: body,
      });
      return NextResponse.json({ ok: true, ignored: event }, { status: 200 });
    }

    const email = body?.client?.email?.trim().toLowerCase();
    const name = body?.client?.name;

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
      const user = await ensureUserByEmail(email, name);
      const results: Array<{
        externalId: string;
        courseId?: string;
        granted: boolean;
        reason?: string;
      }> = [];

      for (const item of items) {
        const externalId = item?.product?.externalId?.trim();
        if (!externalId) {
          await logWebhook({
            event,
            email,
            status: "ERROR",
            errorMessage: "Missing product.externalId",
            rawPayload: item,
          });
          results.push({ externalId: "", granted: false, reason: "missing externalId" });
          continue;
        }

        const course = await prisma.course.findFirst({
          where: { externalProductId: externalId },
        });
        if (!course) {
          console.warn("[applyfy webhook] no course for externalId", { externalId });
          await logWebhook({
            event,
            email,
            productExternalId: externalId,
            status: "ERROR",
            errorMessage: `No course linked to externalId ${externalId}`,
            rawPayload: item,
          });
          results.push({ externalId, granted: false, reason: "no course" });
          continue;
        }

        await activateEnrollment(user.id, course.id);

        processAutomations({
          type: "STUDENT_ENROLLED",
          workspaceId: course.workspaceId,
          courseId: course.id,
          userId: user.id,
        }).catch(() => {});

        await logWebhook({
          event,
          email,
          productExternalId: externalId,
          courseId: course.id,
          status: "SUCCESS",
          rawPayload: item,
        });
        results.push({ externalId, courseId: course.id, granted: true });
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
        if (!externalId) continue;

        const course = await prisma.course.findFirst({
          where: { externalProductId: externalId },
        });
        if (!course) {
          await logWebhook({
            event,
            email,
            productExternalId: externalId,
            status: "ERROR",
            errorMessage: `No course linked to externalId ${externalId}`,
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
          productExternalId: externalId,
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

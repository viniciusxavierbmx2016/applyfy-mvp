import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  activateEnrollment,
  ensureUserByEmail,
  getSetting,
} from "@/lib/webhook-helpers";
import { sendEmail } from "@/lib/email";
import { staffAccessGranted, sendCustomAccessEmail } from "@/lib/email-templates";
import { processAutomations } from "@/lib/automation-engine";
import { safeCompare } from "@/lib/safe-compare";
import { logger } from "@/lib/logger";
import { applyfyWebhookSchema } from "@/lib/validations";
import type { z } from "zod";

// Workspace-scoped Applyfy webhook.
// The workspace is identified by the `[slug]` segment (the workspace slug).
// Token per workspace is stored in Settings under key `applyfy_token:<workspaceId>`.

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

// F11: resolve a course by external product id — prefers the new
// CourseExternalProduct table, falling back to the legacy Course field so the
// webhook keeps working for ids that were never migrated to the new table.
async function findCourseByExternalId(
  externalProductId: string,
  workspaceId: string
) {
  const mapping = await prisma.courseExternalProduct.findFirst({
    where: { externalProductId, workspaceId },
    select: {
      course: {
        select: { id: true, title: true, slug: true, externalProductId: true },
      },
    },
  });
  if (mapping?.course) return mapping.course;
  return prisma.course.findFirst({
    where: { externalProductId, workspaceId },
    select: { id: true, title: true, slug: true, externalProductId: true },
  });
}

export async function POST(request: Request, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  let body: ApplyfyPayload = {};
  let workspaceId: string | null = null;
  try {
    const raw = await request.json().catch(() => ({}));
    const parsed = applyfyWebhookSchema.safeParse(raw);
    if (!parsed.success) {
      const errorSummary = parsed.error.issues
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      logger.error("applyfy webhook", "Zod validation failed", {
        slug: params.slug,
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

    const workspace = await prisma.workspace.findUnique({
      where: { slug: params.slug },
      select: { id: true, slug: true, name: true, isActive: true },
    });
    if (!workspace || !workspace.isActive) {
      await logWebhook({
        event,
        status: "ERROR",
        errorMessage: `Workspace not found: ${params.slug}`,
        rawPayload: body,
      });
      return NextResponse.json(
        { ok: false, error: "Workspace not found" },
        { status: 200 }
      );
    }
    workspaceId = workspace.id;

    const providedToken = body?.token || "";

    // Multiple-tokens: validate against WorkspaceApplyfyToken rows first; fall
    // back to the legacy Settings key during the transition so any workspace
    // not yet migrated to the new table keeps working.
    const wsTokens = await prisma.workspaceApplyfyToken.findMany({
      where: { workspaceId: workspace.id },
      select: { id: true, value: true },
    });

    let tokenValid = false;
    let matchedTokenId: string | null = null;

    if (wsTokens.length > 0) {
      for (const t of wsTokens) {
        if (safeCompare(providedToken, t.value)) {
          tokenValid = true;
          matchedTokenId = t.id;
          break;
        }
      }
    } else {
      const legacyToken =
        (await getSetting(`applyfy_token:${workspace.id}`)) || "";
      if (!legacyToken) {
        await logWebhook({
          event,
          email: body?.client?.email,
          workspaceId,
          status: "IGNORED",
          errorMessage: "Workspace sem token Applyfy configurado",
          rawPayload: body,
        });
        return NextResponse.json(
          { ok: false, error: "Integration not configured" },
          { status: 200 }
        );
      }
      if (safeCompare(providedToken, legacyToken)) {
        tokenValid = true;
      }
    }

    if (!tokenValid) {
      await logWebhook({
        event,
        email: body?.client?.email,
        workspaceId,
        status: "ERROR",
        errorMessage: "Invalid token",
        rawPayload: body,
      });
      return NextResponse.json(
        { ok: false, error: "Invalid token" },
        { status: 200 }
      );
    }

    // Fire-and-forget: track last use so the producer can spot stale tokens.
    if (matchedTokenId) {
      prisma.workspaceApplyfyToken
        .update({
          where: { id: matchedTokenId },
          data: { lastUsedAt: new Date() },
        })
        .catch(() => {});
    }

    if (IGNORED_EVENTS.has(event)) {
      await logWebhook({
        event,
        email: body?.client?.email,
        workspaceId,
        status: "IGNORED",
        rawPayload: body,
      });
      return NextResponse.json({ ok: true, ignored: event }, { status: 200 });
    }

    const email = body?.client?.email?.trim().toLowerCase();
    const name = body?.client?.name ?? undefined;
    const phone = body?.client?.phone?.trim() || null;
    const document =
      body?.client?.cpf?.trim() || body?.client?.cnpj?.trim() || null;
    if (!email) {
      await logWebhook({
        event,
        workspaceId,
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
        workspaceId,
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
      // We let enrolment + ProducerTransaction reprocess on retry —
      // both are idempotent. Only the access email is suppressed when
      // we've already sent it for this (transaction, email) pair, and
      // that check happens just before sendEmail in the loop.
      const txId = body?.transaction?.id?.trim() || null;

      const { user, tempPassword, isStaff } = await ensureUserByEmail(
        email,
        name,
        workspace.id,
        phone,
        document
      );
      // Access to a workspace is derived from Enrollment (course→workspace),
      // so we no longer write workspaceId on the User. Keeping that legacy
      // field synced here would re-introduce a single-workspace binding for
      // multi-workspace students.

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
            workspaceId,
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
          ? await findCourseByExternalId(externalId, workspaceId)
          : null;
        if (!course && productId) {
          course = await findCourseByExternalId(productId, workspaceId);
        }

        if (!course) {
          logger.info(
            "applyfy webhook",
            `no course in workspace for externalId=${externalId ?? ""} productId=${productId ?? ""}`
          );
          await logWebhook({
            event,
            email,
            productExternalId: lookupId,
            workspaceId,
            status: "ERROR",
            errorMessage: `No course linked to externalId=${externalId ?? ""} productId=${productId ?? ""} in workspace`,
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

        await activateEnrollment(user.id, course.id);

        processAutomations({
          type: "STUDENT_ENROLLED",
          workspaceId,
          courseId: course.id,
          userId: user.id,
        }).catch(() => {});

        const txExternalId = body?.transaction?.id?.trim() || null;
        if (txExternalId) {
          const exists = await prisma.producerTransaction.findUnique({
            where: { externalId: txExternalId },
            select: { id: true },
          });
          if (!exists) {
            await prisma.producerTransaction.create({
              data: {
                workspaceId,
                userId: user.id,
                courseId: course.id,
                amount: body?.transaction?.amount ?? item?.price ?? 0,
                status: "COMPLETED",
                paymentMethod: body?.transaction?.paymentMethod ?? null,
                externalId: txExternalId,
                customerEmail: email,
                customerName: name ?? null,
                purchaseIp: body?.trackProps?.ip || null,
                purchaseDevice: body?.trackProps?.user_agent || null,
                affiliateCode: body?.trackProps?.affiliate_code || null,
              },
            });
          }
        }

        // De-dup the access email per (transaction, email) within 24h.
        // Enrolment + producerTransaction above are idempotent — we still
        // re-run them on retry — but the email must not duplicate.
        let alreadyEmailed = false;
        if (txId && email) {
          const prior = await prisma.webhookLog.findFirst({
            where: {
              event: "TRANSACTION_PAID",
              status: "SUCCESS",
              email,
              workspaceId,
              createdAt: { gte: new Date(Date.now() - 60 * 1000) },
              rawPayload: { path: ["transaction", "id"], equals: txId },
            },
            select: { id: true },
          });
          alreadyEmailed = !!prior;
        }
        if (alreadyEmailed) {
          logger.info("applyfy webhook", "skipping duplicate email", {
            slug: params.slug,
            email,
            txId,
          });
        } else {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
          const loginUrl = `${appUrl}/w/${workspace.slug}/login`;
          if (isStaff) {
            const template = staffAccessGranted(name || email, course.title, workspace.name, loginUrl);
            await sendEmail({ to: { email, name: name || undefined }, ...template, senderName: workspace.name }).catch((err) => console.error("[EMAIL_ERROR] access email to:", email, err?.message || err));
          } else {
            await sendCustomAccessEmail({
              workspaceId: workspace.id,
              studentName: name || email,
              studentEmail: email,
              courseName: course.title,
              tempPassword,
              loginUrl,
            }).catch((err) => console.error("[EMAIL_ERROR] access email to:", email, err?.message || err));
          }
        }

        await logWebhook({
          event,
          email,
          productExternalId: course.externalProductId ?? lookupId,
          courseId: course.id,
          workspaceId,
          status: "SUCCESS",
          // Store the full body so the idempotency guard at the top can
          // match by transaction.id on retry.
          rawPayload: body,
        });
        results.push({ externalId: lookupId, courseId: course.id, granted: true });
      }

      return NextResponse.json({ ok: true, results }, { status: 200 });
    }

    if (REVOKE_EVENTS.has(event)) {
      const txExternalId = body?.transaction?.id?.trim() || null;
      if (txExternalId) {
        const txStatus = event === "TRANSACTION_REFUNDED" ? "REFUNDED" : "CHARGED_BACK";
        await prisma.producerTransaction.updateMany({
          where: { externalId: txExternalId },
          data: { status: txStatus },
        });
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        await logWebhook({
          event,
          email,
          workspaceId,
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
          ? await findCourseByExternalId(externalId, workspaceId)
          : null;
        if (!course && productId) {
          course = await findCourseByExternalId(productId, workspaceId);
        }
        if (!course) {
          await logWebhook({
            event,
            email,
            productExternalId: externalId || productId || null,
            workspaceId,
            status: "ERROR",
            errorMessage: `No course linked to externalId=${externalId ?? ""} productId=${productId ?? ""} in workspace`,
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
          workspaceId,
          status: "SUCCESS",
          rawPayload: item,
        });
      }

      return NextResponse.json({ ok: true, revoked }, { status: 200 });
    }

    await logWebhook({
      event,
      email,
      workspaceId,
      status: "IGNORED",
      errorMessage: "Unhandled event",
      rawPayload: body,
    });
    return NextResponse.json({ ok: true, ignored: event }, { status: 200 });
  } catch (error) {
    console.error("[applyfy workspace webhook] processing error:", error);
    await logWebhook({
      event: body?.event || "UNKNOWN",
      email: body?.client?.email,
      workspaceId,
      status: "ERROR",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      rawPayload: body,
    });
    return NextResponse.json(
      { ok: false, error: "Webhook processing failed" },
      { status: 200 }
    );
  }
}

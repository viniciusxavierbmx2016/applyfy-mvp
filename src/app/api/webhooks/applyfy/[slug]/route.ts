import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  activateEnrollment,
  ensureUserByEmail,
  getSetting,
} from "@/lib/webhook-helpers";
import { sendEmail } from "@/lib/email";
import { studentAccessGranted } from "@/lib/email-templates";
import { processAutomations } from "@/lib/automation-engine";

// Workspace-scoped Applyfy webhook.
// The workspace is identified by the `[slug]` segment (the workspace slug).
// Token per workspace is stored in Settings under key `applyfy_token:<workspaceId>`.

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

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  let body: ApplyfyPayload = {};
  let workspaceId: string | null = null;
  try {
    body = (await request.json().catch(() => ({}))) as ApplyfyPayload;
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

    const storedToken =
      (await getSetting(`applyfy_token:${workspace.id}`)) ||
      (await getSetting("applyfy_token")) ||
      "";
    const providedToken = body?.token || "";
    if (!storedToken || providedToken !== storedToken) {
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
    const name = body?.client?.name;
    const phone = body?.client?.phone?.trim() || null;
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
      const user = await ensureUserByEmail(email, name, undefined, phone);
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
        if (!externalId) {
          await logWebhook({
            event,
            email,
            workspaceId,
            status: "ERROR",
            errorMessage: "Missing product.externalId",
            rawPayload: item,
          });
          results.push({ externalId: "", granted: false, reason: "missing externalId" });
          continue;
        }

        const course = await prisma.course.findFirst({
          where: { externalProductId: externalId, workspaceId },
          select: { id: true, title: true, slug: true },
        });
        if (!course) {
          await logWebhook({
            event,
            email,
            productExternalId: externalId,
            workspaceId,
            status: "ERROR",
            errorMessage: `No course linked to externalId ${externalId} in workspace`,
            rawPayload: item,
          });
          results.push({ externalId, granted: false, reason: "no course" });
          continue;
        }

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
              },
            });
          }
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
        const loginUrl = `${appUrl}/w/${workspace.slug}/login`;
        const template = studentAccessGranted(
          name || email,
          course.title,
          workspace.name,
          loginUrl
        );
        sendEmail({ to: { email, name: name || undefined }, ...template, senderName: workspace.name }).catch((err) => console.error("[EMAIL_ERROR] studentAccessGranted to:", email, err?.message || err));

        await logWebhook({
          event,
          email,
          productExternalId: externalId,
          courseId: course.id,
          workspaceId,
          status: "SUCCESS",
          rawPayload: item,
        });
        results.push({ externalId, courseId: course.id, granted: true });
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
        if (!externalId) continue;

        const course = await prisma.course.findFirst({
          where: { externalProductId: externalId, workspaceId },
        });
        if (!course) {
          await logWebhook({
            event,
            email,
            productExternalId: externalId,
            workspaceId,
            status: "ERROR",
            errorMessage: `No course linked to externalId ${externalId} in workspace`,
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

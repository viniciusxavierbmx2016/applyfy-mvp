import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { activateEnrollment, ensureUserByEmail } from "@/lib/webhook-helpers";
import { processAutomations } from "@/lib/automation-engine";
import { sendCustomAccessEmail } from "@/lib/email-templates";
import { logger } from "@/lib/logger";
import type { GatewayAdapter, GatewayContext, CanonicalFields } from "./types";

// FASE 6.0 — a lib comum: orquestra o fluxo CANÔNICO da rota ESCOPADA do Applyfy
// (o superset — trackProps + filtro-ws + tx-no-revoke), parametrizada pelo adapter.
// Reusa os helpers neutros (webhook-helpers / automation-engine / email-templates)
// INTOCADOS. `logWebhook` e a resolução de curso sobem pra cá byte-idênticos da
// escopada; a WHERE de resolução GANHA a dimensão `gateway`.

const json200 = (body: unknown) =>
  NextResponse.json(body ?? { received: true }, { status: 200 });

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

// Molde da escopada (applyfy/[slug]:62-79) + a WHERE ganha `gateway` (a dimensão nova).
async function findCourseByGateway(
  externalProductId: string,
  workspaceId: string,
  gateway: string
) {
  const mapping = await prisma.courseExternalProduct.findFirst({
    where: { externalProductId, workspaceId, gateway },
    select: {
      course: {
        select: { id: true, title: true, slug: true, externalProductId: true },
      },
    },
  });
  if (mapping?.course) return mapping.course;
  // Fallback legado do campo único do Course (sem gateway — é global-unique).
  return prisma.course.findFirst({
    where: { externalProductId, workspaceId },
    select: { id: true, title: true, slug: true, externalProductId: true },
  });
}

async function resolveCourse(
  p: { externalId?: string; courseId?: string },
  workspaceId: string,
  gateway: string
) {
  if (p.courseId) {
    return prisma.course.findUnique({
      where: { id: p.courseId },
      select: { id: true, title: true, slug: true, externalProductId: true },
    });
  }
  if (p.externalId) return findCourseByGateway(p.externalId, workspaceId, gateway);
  return null;
}

export async function processGatewayWebhook(
  adapter: GatewayAdapter,
  request: Request,
  ctx: GatewayContext
): Promise<Response> {
  const v = await adapter.verify(request, ctx);
  if (!v.ok) {
    await logWebhook({
      event: "UNKNOWN",
      workspaceId: ctx.workspaceId,
      status: "ERROR",
      errorMessage: v.reason ?? "verify failed",
      rawPayload: {},
    });
    return json200(v.denyBody ?? { ok: false, error: "Invalid" });
  }

  const { action, rawEventName } = adapter.parseEvent(v.payload);
  const f = adapter.extractFields(v.payload);

  if (action === "IGNORE") {
    await logWebhook({
      event: rawEventName,
      email: f.email,
      workspaceId: ctx.workspaceId,
      status: "IGNORED",
      rawPayload: v.payload,
    });
    return json200({ ok: true, ignored: rawEventName });
  }

  if (!f.email) {
    await logWebhook({
      event: rawEventName,
      workspaceId: ctx.workspaceId,
      status: "ERROR",
      errorMessage: "Missing client email",
      rawPayload: v.payload,
    });
    return json200({ ok: false, error: "Missing email" });
  }

  return action === "GRANT"
    ? grant(adapter, ctx, rawEventName, f, v.payload, v.idempotencyKey ?? null)
    : revoke(adapter, ctx, rawEventName, f, v.payload);
}

async function grant(
  adapter: GatewayAdapter,
  ctx: GatewayContext,
  rawEventName: string,
  f: CanonicalFields,
  payload: unknown,
  idempotencyKey: string | null
): Promise<Response> {
  const txId = f.transactionId?.trim() || null;

  // ensureUserByEmail 1× ANTES do loop (escopada [slug]:259-265).
  // Assinatura: (email, name?, workspaceId?, phone?, document?) → {user, tempPassword?, isStaff}
  const { user, tempPassword, isStaff } = await ensureUserByEmail(
    f.email!,
    f.name ?? undefined,
    ctx.workspaceId,
    f.phone ?? null,
    f.document ?? null
  );

  const results: Array<{
    externalId?: string;
    courseId?: string;
    granted: boolean;
    reason?: string;
  }> = [];

  for (const p of f.products) {
    const course = await resolveCourse(p, ctx.workspaceId, adapter.id);
    if (!course) {
      await logWebhook({
        event: rawEventName,
        email: f.email,
        productExternalId: p.externalId ?? null,
        workspaceId: ctx.workspaceId,
        status: "ERROR",
        errorMessage: `No course for externalId=${p.externalId ?? ""} courseId=${p.courseId ?? ""}`,
        rawPayload: p,
      });
      results.push({ externalId: p.externalId, granted: false, reason: "no course" });
      continue;
    }

    await activateEnrollment(user.id, course.id);

    processAutomations({
      type: "STUDENT_ENROLLED",
      workspaceId: ctx.workspaceId,
      courseId: course.id,
      userId: user.id,
    }).catch(() => {});

    if (adapter.capabilities.recordTransaction && txId) {
      const exists = await prisma.producerTransaction.findUnique({
        where: { externalId: txId },
        select: { id: true },
      });
      if (!exists) {
        await prisma.producerTransaction.create({
          data: {
            workspaceId: ctx.workspaceId,
            userId: user.id,
            courseId: course.id,
            amount: f.amount ?? 0,
            status: "COMPLETED",
            paymentMethod: f.paymentMethod ?? null,
            externalId: txId,
            customerEmail: f.email!,
            customerName: f.name ?? null,
            purchaseIp: f.trackProps?.ip || null,
            purchaseDevice: f.trackProps?.userAgent || null,
            affiliateCode: f.trackProps?.affiliateCode || null,
          },
        });
      }
    }

    if (adapter.capabilities.sendAccessEmail) {
      // Dedup do email de acesso (escopada [slug]:367-381, janela de 60s no CÓDIGO).
      // Preferência: o idempotencyKey do gateway (mais forte); fallback: o txId via dedupTxPath.
      let alreadyEmailed = false;
      if (idempotencyKey) {
        const prior = await prisma.webhookLog.findFirst({
          where: {
            event: rawEventName,
            status: "SUCCESS",
            email: f.email,
            workspaceId: ctx.workspaceId,
            createdAt: { gte: new Date(Date.now() - 60 * 1000) },
            rawPayload: { path: ["_idempotency"], equals: idempotencyKey },
          },
          select: { id: true },
        });
        alreadyEmailed = !!prior;
      } else if (txId && adapter.dedupTxPath) {
        const prior = await prisma.webhookLog.findFirst({
          where: {
            event: rawEventName,
            status: "SUCCESS",
            email: f.email,
            workspaceId: ctx.workspaceId,
            createdAt: { gte: new Date(Date.now() - 60 * 1000) },
            rawPayload: { path: adapter.dedupTxPath, equals: txId },
          },
          select: { id: true },
        });
        alreadyEmailed = !!prior;
      }

      if (alreadyEmailed) {
        logger.info(adapter.id + " webhook", "skipping duplicate email", {
          email: f.email,
          idempotencyKey,
          txId,
        });
      } else {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
        await sendCustomAccessEmail({
          workspaceId: ctx.workspaceId,
          studentName: f.name || f.email!,
          studentEmail: f.email!,
          courseName: course.title,
          tempPassword,
          loginUrl: `${appUrl}/w/${ctx.slug}/login`,
          isStaff,
        }).catch((err) =>
          console.error("[" + adapter.id + "] access email to:", f.email, err?.message || err)
        );
      }
    }

    // Guarda o idempotencyKey DENTRO do rawPayload logado, pro dedup acima achá-lo por JSON path
    // (a idempotência é um HEADER, não vem no corpo — sem coluna nova no WebhookLog).
    const logPayload =
      idempotencyKey && payload && typeof payload === "object"
        ? { ...(payload as Record<string, unknown>), _idempotency: idempotencyKey }
        : payload;

    await logWebhook({
      event: rawEventName,
      email: f.email,
      productExternalId: course.externalProductId ?? p.externalId ?? null,
      courseId: course.id,
      workspaceId: ctx.workspaceId,
      status: "SUCCESS",
      rawPayload: logPayload,
    });
    results.push({ externalId: p.externalId, courseId: course.id, granted: true });
  }

  return json200({ ok: true, results });
}

async function revoke(
  adapter: GatewayAdapter,
  ctx: GatewayContext,
  rawEventName: string,
  f: CanonicalFields,
  payload: unknown
): Promise<Response> {
  const txId = f.transactionId?.trim() || null;
  if (adapter.capabilities.recordTransaction && txId) {
    await prisma.producerTransaction.updateMany({
      where: { externalId: txId },
      data: { status: /refund/i.test(rawEventName) ? "REFUNDED" : "CHARGED_BACK" },
    });
  }

  const user = await prisma.user.findUnique({ where: { email: f.email! } });
  if (!user) {
    await logWebhook({
      event: rawEventName,
      email: f.email,
      workspaceId: ctx.workspaceId,
      status: "IGNORED",
      errorMessage: "User not found",
      rawPayload: payload,
    });
    return json200({ ok: true, revoked: 0 });
  }

  let revoked = 0;
  for (const p of f.products) {
    const course = await resolveCourse(p, ctx.workspaceId, adapter.id);
    if (!course) {
      await logWebhook({
        event: rawEventName,
        email: f.email,
        productExternalId: p.externalId ?? null,
        workspaceId: ctx.workspaceId,
        status: "ERROR",
        errorMessage: `No course for externalId=${p.externalId ?? ""} courseId=${p.courseId ?? ""}`,
        rawPayload: p,
      });
      continue;
    }
    const updated = await prisma.enrollment.updateMany({
      where: { userId: user.id, courseId: course.id },
      data: { status: "CANCELLED" },
    });
    revoked += updated.count;
    await logWebhook({
      event: rawEventName,
      email: f.email,
      productExternalId: course.externalProductId ?? p.externalId ?? null,
      courseId: course.id,
      workspaceId: ctx.workspaceId,
      status: "SUCCESS",
      rawPayload: p,
    });
  }
  return json200({ ok: true, revoked });
}

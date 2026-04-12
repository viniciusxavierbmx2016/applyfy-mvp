import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  activateEnrollment,
  ensureUserByEmail,
  getSetting,
} from "@/lib/webhook-helpers";

// Hotmart sends events for: PURCHASE_APPROVED, PURCHASE_COMPLETE, PURCHASE_REFUNDED,
// PURCHASE_CHARGEBACK, PURCHASE_CANCELED, SUBSCRIPTION_CANCELLATION, etc.
// We grant access on APPROVED/COMPLETE and revoke on refund/cancel/chargeback.
const GRANT_EVENTS = new Set([
  "PURCHASE_APPROVED",
  "PURCHASE_COMPLETE",
  "PURCHASE_BILLET_PRINTED", // optional — treat as grant-pending if desired
]);
const REVOKE_EVENTS = new Set([
  "PURCHASE_REFUNDED",
  "PURCHASE_CHARGEBACK",
  "PURCHASE_CANCELED",
  "SUBSCRIPTION_CANCELLATION",
]);

export async function POST(request: Request) {
  try {
    const storedToken =
      (await getSetting("hotmart_hottok")) || process.env.HOTMART_HOTTOK || "";

    const headerToken =
      request.headers.get("x-hotmart-hottok") ||
      request.headers.get("hottok") ||
      "";

    const url = new URL(request.url);
    const queryToken = url.searchParams.get("hottok") || "";

    const body = await request.json().catch(() => ({}));
    const bodyToken = body?.hottok || "";

    const providedToken = headerToken || queryToken || bodyToken;

    if (!storedToken || providedToken !== storedToken) {
      return NextResponse.json({ error: "Invalid hottok" }, { status: 401 });
    }

    const event: string = body?.event || body?.data?.event || "";
    const data = body?.data || body;

    const buyerEmail: string | undefined =
      data?.buyer?.email || data?.purchase?.buyer?.email;
    const buyerName: string | undefined =
      data?.buyer?.name || data?.purchase?.buyer?.name;
    const productId: string | undefined = String(
      data?.product?.id ?? data?.purchase?.product?.id ?? ""
    ).trim();
    const productUcode: string | undefined =
      data?.product?.ucode || data?.purchase?.product?.ucode;

    if (!buyerEmail) {
      return NextResponse.json(
        { error: "Buyer email not found in payload" },
        { status: 400 }
      );
    }

    const externalId = productUcode || productId;
    if (!externalId) {
      return NextResponse.json(
        { error: "Product id not found in payload" },
        { status: 400 }
      );
    }

    const course = await prisma.course.findFirst({
      where: { externalProductId: externalId },
    });
    if (!course) {
      return NextResponse.json(
        { error: `No course linked to product ${externalId}` },
        { status: 404 }
      );
    }

    if (GRANT_EVENTS.has(event)) {
      const user = await ensureUserByEmail(buyerEmail, buyerName);
      await activateEnrollment(user.id, course.id);
      return NextResponse.json({ ok: true, granted: true });
    }

    if (REVOKE_EVENTS.has(event)) {
      const user = await prisma.user.findUnique({
        where: { email: buyerEmail.trim().toLowerCase() },
      });
      if (user) {
        await prisma.enrollment.updateMany({
          where: { userId: user.id, courseId: course.id },
          data: { status: "CANCELLED" },
        });
      }
      return NextResponse.json({ ok: true, revoked: true });
    }

    return NextResponse.json({ ok: true, ignored: event || "no-event" });
  } catch (error) {
    console.error("POST /api/webhooks/hotmart error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

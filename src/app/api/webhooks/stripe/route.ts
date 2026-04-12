import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import {
  activateEnrollment,
  ensureUserByEmail,
  getSetting,
} from "@/lib/webhook-helpers";

const TOLERANCE_SECONDS = 5 * 60;

interface StripeSignatureParts {
  timestamp: string;
  signatures: string[];
}

function parseSignatureHeader(header: string): StripeSignatureParts | null {
  const parts = header.split(",").map((p) => p.trim());
  let timestamp = "";
  const signatures: string[] = [];
  for (const part of parts) {
    const [k, v] = part.split("=");
    if (k === "t") timestamp = v;
    else if (k === "v1") signatures.push(v);
  }
  if (!timestamp || signatures.length === 0) return null;
  return { timestamp, signatures };
}

function verifyStripeSignature(
  payload: string,
  header: string,
  secret: string
): boolean {
  const parsed = parseSignatureHeader(header);
  if (!parsed) return false;

  const age = Math.abs(Date.now() / 1000 - Number(parsed.timestamp));
  if (Number.isNaN(age) || age > TOLERANCE_SECONDS) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${parsed.timestamp}.${payload}`, "utf8")
    .digest("hex");

  return parsed.signatures.some((sig) => {
    if (sig.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  });
}

export async function POST(request: Request) {
  try {
    const secret =
      (await getSetting("stripe_webhook_secret")) ||
      process.env.STRIPE_WEBHOOK_SECRET ||
      "";

    if (!secret) {
      return NextResponse.json(
        { error: "Stripe webhook secret not configured" },
        { status: 500 }
      );
    }

    const signature = request.headers.get("stripe-signature") || "";
    const rawBody = await request.text();

    if (!verifyStripeSignature(rawBody, signature, secret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);

    if (event.type !== "checkout.session.completed") {
      return NextResponse.json({ ok: true, ignored: event.type });
    }

    const session = event.data?.object || {};
    const email: string | undefined =
      session.customer_details?.email ||
      session.customer_email ||
      session.metadata?.email;
    const name: string | undefined =
      session.customer_details?.name || session.metadata?.name;

    const courseId: string | undefined =
      session.metadata?.courseId || session.metadata?.course_id;
    const externalProductId: string | undefined =
      session.metadata?.externalProductId ||
      session.metadata?.productId ||
      session.metadata?.product_id;

    if (!email) {
      return NextResponse.json(
        { error: "Customer email missing" },
        { status: 400 }
      );
    }

    let course = null;
    if (courseId) {
      course = await prisma.course.findUnique({ where: { id: courseId } });
    } else if (externalProductId) {
      course = await prisma.course.findFirst({
        where: { externalProductId },
      });
    }

    if (!course) {
      return NextResponse.json(
        { error: "Course not found from metadata" },
        { status: 404 }
      );
    }

    const user = await ensureUserByEmail(email, name);
    await activateEnrollment(user.id, course.id);

    return NextResponse.json({ ok: true, granted: true });
  } catch (error) {
    console.error("POST /api/webhooks/stripe error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

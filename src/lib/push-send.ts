import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import type { PushSubscription } from "@prisma/client";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  image?: string;
}

// Shared delivery: send to already-fetched subscriptions. Both single- and
// multi-user entry points funnel through here so the topic/cleanup/logging
// logic lives in one place. Returns the count of successful deliveries.
async function sendToSubscriptions(
  subs: PushSubscription[],
  payload: PushPayload
) {
  if (subs.length === 0) return 0;

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush
        .sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload),
          {
            TTL: 3600,
            urgency: "high",
            // RFC 8030: Topic header must be <= 32 url-safe chars. Omit when the
            // tag is longer (automation/lives use long ids) — the SW still uses
            // payload.tag to collapse notifications on the device.
            ...(payload.tag && payload.tag.length <= 32
              ? { topic: payload.tag }
              : {}),
          }
        )
        .catch(async (err) => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } });
          }
          throw err;
        })
    )
  );

  results.forEach((r, i) => {
    if (r.status === "rejected") {
      const err = (r as PromiseRejectedResult).reason;
      console.error("[push] delivery failed", {
        userId: subs[i].userId,
        statusCode: err?.statusCode,
        message: err?.message,
        body: err?.body,
      });
    }
  });

  return results.filter((r) => r.status === "fulfilled").length;
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });
  return sendToSubscriptions(subscriptions, payload);
}

export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  if (userIds.length === 0) return 0;
  // Single query for all recipients (was one findMany per user — N+1).
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
  });
  return sendToSubscriptions(subscriptions, payload);
}

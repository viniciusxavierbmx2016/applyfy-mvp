import webpush from "web-push";
import { prisma } from "@/lib/prisma";

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

export async function sendPushToUser(userId: string, payload: PushPayload) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) return;

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
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
            topic: payload.tag || "default",
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

  return results;
}

export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  if (userIds.length === 0) return;
  await Promise.allSettled(
    userIds.map((id) => sendPushToUser(id, payload))
  );
}

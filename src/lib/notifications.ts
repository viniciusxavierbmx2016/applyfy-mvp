import { prisma } from "./prisma";
import type { NotificationType } from "@prisma/client";

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  message: string;
  link?: string | null;
  actorId?: string | null;
}

export async function createNotification(input: CreateNotificationInput) {
  if (input.actorId && input.actorId === input.userId) return null;
  try {
    return await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        message: input.message,
        link: input.link ?? null,
      },
    });
  } catch (error) {
    console.error("createNotification error:", error);
    return null;
  }
}

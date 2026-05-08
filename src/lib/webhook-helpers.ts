import type { User } from "@prisma/client";
import { prisma } from "./prisma";
import { createAdminClient } from "./supabase-admin";
import { createNotification } from "./notifications";

/**
 * Upsert a user in the database and in Supabase Auth.
 *
 * Returns `{ user, tempPassword? }`:
 * - When the Prisma User already exists, `tempPassword` is undefined — we
 *   never rotate an existing account's password from this helper.
 * - When the Supabase auth user already exists but the Prisma row is
 *   missing, we adopt the existing auth identity without rotating either,
 *   so `tempPassword` is undefined.
 * - When we provision a brand-new identity, we generate a friendly
 *   `mc-XXXXXX` password, set it on Supabase, and return it so the
 *   caller can include it in the access email.
 */
export async function ensureUserByEmail(
  email: string,
  name?: string,
  workspaceId?: string,
  phone?: string | null
): Promise<{ user: User; tempPassword?: string }> {
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    const updates: Record<string, unknown> = {};
    if (workspaceId && existing.role === "STUDENT" && !existing.workspaceId) {
      updates.workspaceId = workspaceId;
    }
    if (phone && !existing.phone) {
      updates.phone = phone;
    }
    if (Object.keys(updates).length > 0) {
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: updates,
      });
      return { user: updated };
    }
    return { user: existing };
  }

  const admin = createAdminClient();

  // Try to find an existing Supabase auth user with this email
  const { data: list } = await admin.auth.admin.listUsers();
  const existingAuth = list?.users.find(
    (u) => u.email?.toLowerCase() === normalizedEmail
  );

  let authId = existingAuth?.id;
  let tempPassword: string | undefined;

  if (!authId) {
    tempPassword = `mc-${Math.random().toString(36).slice(2, 8)}`;
    const { data, error } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name: name || normalizedEmail.split("@")[0] },
    });
    if (error || !data.user) {
      throw new Error(
        `Failed to create supabase auth user: ${error?.message || "unknown"}`
      );
    }
    authId = data.user.id;
  }

  const user = await prisma.user.create({
    data: {
      id: authId,
      email: normalizedEmail,
      name: name || normalizedEmail.split("@")[0],
      workspaceId: workspaceId ?? null,
      phone: phone || null,
    },
  });

  return { user, tempPassword };
}

/**
 * Sends a recovery link email to a user so they can set their password and
 * access the workspace. Used when a producer manually enrolls a student.
 * Returns the action_link for logging/debugging.
 */
export async function sendWorkspaceAccessEmail(
  email: string,
  workspaceSlug: string,
  baseUrl: string
): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: email.trim().toLowerCase(),
      options: {
        redirectTo: `${baseUrl}/reset-password?next=/w/${workspaceSlug}`,
      },
    });
    if (error) {
      console.error("generateLink error:", error);
      return null;
    }
    return data.properties?.action_link || null;
  } catch (err) {
    console.error("sendWorkspaceAccessEmail error:", err);
    return null;
  }
}

export async function activateEnrollment(userId: string, courseId: string) {
  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  const wasActive = existing?.status === "ACTIVE";

  const enrollment = await prisma.enrollment.upsert({
    where: { userId_courseId: { userId, courseId } },
    create: { userId, courseId, status: "ACTIVE" },
    update: { status: "ACTIVE" },
  });

  if (!wasActive) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { title: true, slug: true },
    });
    if (course) {
      await createNotification({
        userId,
        type: "ENROLLMENT",
        message: `Você foi matriculado no curso ${course.title}`,
        link: `/course/${course.slug}`,
      });
    }
  }

  return enrollment;
}

export async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.settings.findUnique({ where: { key } });
  return row?.value ?? null;
}

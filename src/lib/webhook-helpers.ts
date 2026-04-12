import { prisma } from "./prisma";
import { createAdminClient } from "./supabase-admin";

/**
 * Upsert a user in the database and in Supabase Auth.
 * If the Supabase auth user doesn't exist, creates one with a random password
 * and email_confirm:true. The buyer should use "forgot password" to set their own.
 */
export async function ensureUserByEmail(email: string, name?: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) return existing;

  const admin = createAdminClient();

  // Try to find an existing Supabase auth user with this email
  const { data: list } = await admin.auth.admin.listUsers();
  const existingAuth = list?.users.find(
    (u) => u.email?.toLowerCase() === normalizedEmail
  );

  let authId = existingAuth?.id;

  if (!authId) {
    const randomPassword =
      Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const { data, error } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password: randomPassword,
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
    },
  });

  return user;
}

export async function activateEnrollment(userId: string, courseId: string) {
  return prisma.enrollment.upsert({
    where: { userId_courseId: { userId, courseId } },
    create: { userId, courseId, status: "ACTIVE" },
    update: { status: "ACTIVE" },
  });
}

export async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.settings.findUnique({ where: { key } });
  return row?.value ?? null;
}

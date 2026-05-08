import type { User } from "@prisma/client";
import { prisma } from "./prisma";
import { createAdminClient } from "./supabase-admin";
import { createNotification } from "./notifications";
import {
  generateSalt,
  generateTempPassword,
  hashPassword,
} from "./workspace-auth";

const STAFF_ROLES = new Set<string>([
  "PRODUCER",
  "ADMIN",
  "COLLABORATOR",
  "ADMIN_COLLABORATOR",
]);

/**
 * Upsert a user in the database and in Supabase Auth, plus (for pure
 * STUDENTs) a per-workspace credential.
 *
 * Returns `{ user, tempPassword?, isStaff }`:
 * - `isStaff` is true when the user is staff or has an accepted Collaborator
 *   row. These users authenticate against the global Supabase Auth and do
 *   not get a WorkspaceCredential.
 * - For pure STUDENTs with a `workspaceId`, a WorkspaceCredential is created
 *   the first time we see this (user, workspace) pair. The plaintext
 *   `mc-XXXXXX` password used to derive the hash is returned so callers can
 *   include it in the access email. If a credential already exists, it is
 *   left untouched and `tempPassword` is undefined (no silent rotation).
 * - When the global Supabase Auth user is provisioned for the first time,
 *   we still set a random global password (no email exposure) so the
 *   legacy fallback in /w/<slug>/login keeps working during the migration
 *   window. The student-facing temp password is the workspace-scoped one.
 */
export async function ensureUserByEmail(
  email: string,
  name?: string,
  workspaceId?: string,
  phone?: string | null
): Promise<{ user: User; tempPassword?: string; isStaff: boolean }> {
  const normalizedEmail = email.trim().toLowerCase();

  // 1) Resolve the Prisma user (find or create), upserting Supabase Auth
  //    when needed. Tracks whether a global password was generated for
  //    a brand-new auth identity — kept around for legacy fallback only.
  let user: User;
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
    user = Object.keys(updates).length
      ? await prisma.user.update({ where: { id: existing.id }, data: updates })
      : existing;
  } else {
    const admin = createAdminClient();
    const { data: list } = await admin.auth.admin.listUsers();
    const existingAuth = list?.users.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );
    let authId = existingAuth?.id;
    if (!authId) {
      const globalPassword = generateTempPassword();
      const { data, error } = await admin.auth.admin.createUser({
        email: normalizedEmail,
        password: globalPassword,
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
    user = await prisma.user.create({
      data: {
        id: authId,
        email: normalizedEmail,
        name: name || normalizedEmail.split("@")[0],
        workspaceId: workspaceId ?? null,
        phone: phone || null,
      },
    });
  }

  // 2) Determine whether this account uses platform-wide auth (staff or
  //    accepted collaborator) or per-workspace auth (pure STUDENT).
  const isStaffRole = STAFF_ROLES.has(user.role);
  const acceptedCollab = isStaffRole
    ? null
    : await prisma.collaborator.findFirst({
        where: { userId: user.id, status: "ACCEPTED" },
        select: { id: true },
      });
  const isStaff = isStaffRole || !!acceptedCollab;

  // 3) For pure STUDENTs with a workspaceId, ensure a WorkspaceCredential
  //    exists. Existing credentials are never rotated — they stay under
  //    the student's control.
  let tempPassword: string | undefined;
  if (!isStaff && workspaceId) {
    const existingCred = await prisma.workspaceCredential.findUnique({
      where: { userId_workspaceId: { userId: user.id, workspaceId } },
      select: { id: true },
    });
    if (!existingCred) {
      tempPassword = generateTempPassword();
      const salt = generateSalt();
      const passwordHash = hashPassword(tempPassword, salt);
      await prisma.workspaceCredential.create({
        data: { userId: user.id, workspaceId, passwordHash, salt },
      });
    }
  }

  return { user, tempPassword, isStaff };
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

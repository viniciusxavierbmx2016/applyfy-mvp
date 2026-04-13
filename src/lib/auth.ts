import { createServerSupabaseClient } from "./supabase-server";
import { prisma } from "./prisma";
import type { Enrollment, User } from "@prisma/client";

/** True if the enrollment is ACTIVE and (expiresAt is null or in the future). */
export function isEnrollmentActive(
  enrollment: Pick<Enrollment, "status" | "expiresAt"> | null | undefined
): boolean {
  if (!enrollment) return false;
  if (enrollment.status !== "ACTIVE") return false;
  if (enrollment.expiresAt && enrollment.expiresAt.getTime() < Date.now())
    return false;
  return true;
}

export async function getSession() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createServerSupabaseClient();
  // Use getUser() (not getSession) — it validates the JWT with the Auth server,
  // so it's reliable across middleware cookie refreshes on Vercel.
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: authUser.email.toLowerCase() },
  });

  return user;
}

export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireAuth();
  if (user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
  return user;
}

export async function requireStaff(): Promise<User> {
  const user = await requireAuth();
  if (user.role !== "ADMIN" && user.role !== "PRODUCER") {
    throw new Error("Forbidden");
  }
  return user;
}

export function isAdmin(user: Pick<User, "role">): boolean {
  return user.role === "ADMIN";
}

export function isStaff(user: Pick<User, "role">): boolean {
  return user.role === "ADMIN" || user.role === "PRODUCER";
}

// Returns true if the staff user can edit the given course.
// ADMIN: always. PRODUCER: only if they are the course owner.
export async function canEditCourse(
  staff: Pick<User, "id" | "role">,
  courseId: string
): Promise<boolean> {
  if (staff.role === "ADMIN") return true;
  if (staff.role !== "PRODUCER") return false;
  const c = await prisma.course.findUnique({
    where: { id: courseId },
    select: { ownerId: true, workspace: { select: { ownerId: true } } },
  });
  if (!c) return false;
  return c.ownerId === staff.id || c.workspace.ownerId === staff.id;
}

export async function canEditModule(
  staff: Pick<User, "id" | "role">,
  moduleId: string
): Promise<boolean> {
  if (staff.role === "ADMIN") return true;
  if (staff.role !== "PRODUCER") return false;
  const m = await prisma.module.findUnique({
    where: { id: moduleId },
    select: {
      course: {
        select: { ownerId: true, workspace: { select: { ownerId: true } } },
      },
    },
  });
  if (!m) return false;
  return (
    m.course.ownerId === staff.id || m.course.workspace.ownerId === staff.id
  );
}

export async function canEditLesson(
  staff: Pick<User, "id" | "role">,
  lessonId: string
): Promise<boolean> {
  if (staff.role === "ADMIN") return true;
  if (staff.role !== "PRODUCER") return false;
  const l = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      module: {
        select: {
          course: {
            select: { ownerId: true, workspace: { select: { ownerId: true } } },
          },
        },
      },
    },
  });
  if (!l) return false;
  return (
    l.module.course.ownerId === staff.id ||
    l.module.course.workspace.ownerId === staff.id
  );
}

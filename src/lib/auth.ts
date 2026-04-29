import { cache } from "react";
import { createServerSupabaseClient } from "./supabase-server";
import { prisma } from "./prisma";
import type { Enrollment, User } from "@prisma/client";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface ReleaseStatus {
  released: boolean;
  releaseDate: Date;
  daysRemaining: number;
}

/** Compute release status for a module or lesson based on enrollment.createdAt
 * and the maximum of its own daysToRelease and the parent module's. */
export function computeReleaseStatus(
  enrollmentCreatedAt: Date | null | undefined,
  daysToRelease: number
): ReleaseStatus {
  const base = enrollmentCreatedAt ? enrollmentCreatedAt.getTime() : Date.now();
  const releaseTime = base + Math.max(0, daysToRelease) * MS_PER_DAY;
  const now = Date.now();
  const released = releaseTime <= now;
  const daysRemaining = released
    ? 0
    : Math.ceil((releaseTime - now) / MS_PER_DAY);
  return { released, releaseDate: new Date(releaseTime), daysRemaining };
}

export function computeLessonRelease(
  enrollmentCreatedAt: Date | null | undefined,
  moduleDays: number,
  lessonDays: number
): ReleaseStatus {
  return computeReleaseStatus(
    enrollmentCreatedAt,
    Math.max(moduleDays || 0, lessonDays || 0)
  );
}

export interface ReleaseOverrides {
  modules: Set<string>;
  lessons: Set<string>;
}

export const EMPTY_OVERRIDES: ReleaseOverrides = {
  modules: new Set(),
  lessons: new Set(),
};

const RELEASED_NOW: ReleaseStatus = {
  released: true,
  releaseDate: new Date(0),
  daysRemaining: 0,
};

export function computeModuleReleaseWithOverride(
  enrollmentCreatedAt: Date | null | undefined,
  moduleId: string,
  moduleDays: number,
  overrides: ReleaseOverrides
): ReleaseStatus {
  if (overrides.modules.has(moduleId)) return RELEASED_NOW;
  return computeReleaseStatus(enrollmentCreatedAt, moduleDays);
}

export function computeLessonReleaseWithOverride(
  enrollmentCreatedAt: Date | null | undefined,
  moduleId: string,
  lessonId: string,
  moduleDays: number,
  lessonDays: number,
  overrides: ReleaseOverrides
): ReleaseStatus {
  if (overrides.lessons.has(lessonId)) return RELEASED_NOW;
  if (overrides.modules.has(moduleId)) return RELEASED_NOW;
  return computeLessonRelease(enrollmentCreatedAt, moduleDays, lessonDays);
}

/** Load an enrollment's overrides as a {modules, lessons} Set pair.
 *  Returns EMPTY_OVERRIDES when enrollmentId is null (admin/preview). */
export async function loadEnrollmentOverrides(
  enrollmentId: string | null | undefined
): Promise<ReleaseOverrides> {
  if (!enrollmentId) return EMPTY_OVERRIDES;
  const rows = await prisma.enrollmentOverride.findMany({
    where: { enrollmentId, released: true },
    select: { moduleId: true, lessonId: true },
  });
  const modules = new Set<string>();
  const lessons = new Set<string>();
  for (const r of rows) {
    if (r.moduleId) modules.add(r.moduleId);
    if (r.lessonId) lessons.add(r.lessonId);
  }
  return { modules, lessons };
}

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

// React `cache()` deduplicates within a single request — multiple calls
// (getCurrentUser + requireAuth + requireStaff in the same handler) now hit
// Supabase Auth + Prisma exactly once per request.
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: authUser.email.toLowerCase() },
  });
  if (!user) return null;

  // 2FA enforcement: if user has a verified TOTP factor but the current
  // session is still AAL1 (logged in with password but didn't complete the
  // MFA challenge), treat as not authenticated. /api/auth/mfa/challenge
  // upgrades the session to AAL2 after a valid code.
  // Restricted to staff roles since only ADMIN/PRODUCER can enroll factors.
  if (user.role === "ADMIN" || user.role === "PRODUCER") {
    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    const hasVerifiedFactor =
      factorsData?.totp?.some((f) => f.status === "verified") ?? false;
    if (hasVerifiedFactor) {
      const { data: aalData } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalData?.currentLevel !== "aal2") return null;
    }
  }

  return user;
});

export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Não autorizado");
  }
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireAuth();
  if (user.role !== "ADMIN") {
    throw new Error("Sem permissão");
  }
  return user;
}

export async function requireStaff(): Promise<User> {
  const user = await requireAuth();
  if (
    user.role !== "ADMIN" &&
    user.role !== "PRODUCER" &&
    user.role !== "COLLABORATOR"
  ) {
    throw new Error("Sem permissão");
  }
  return user;
}

export function isAdmin(user: Pick<User, "role">): boolean {
  return user.role === "ADMIN";
}

export function isStaff(user: Pick<User, "role">): boolean {
  return (
    user.role === "ADMIN" ||
    user.role === "PRODUCER" ||
    user.role === "COLLABORATOR"
  );
}

// Resolves the collaborator context if the user is a COLLABORATOR, or null.
// Throws Forbidden if user is COLLABORATOR but has no accepted record.
export async function requireCollaboratorContextIfAny(
  user: Pick<User, "id" | "role">
): Promise<{
  workspaceId: string;
  permissions: string[];
  courseIds: string[];
} | null> {
  if (user.role !== "COLLABORATOR") return null;
  const c = await prisma.collaborator.findFirst({
    where: { userId: user.id, status: "ACCEPTED" },
    select: { workspaceId: true, permissions: true, courseIds: true },
  });
  if (!c) throw new Error("Sem permissão");
  return c;
}

// Returns the effective list of course IDs the staff can act on, or `null`
// meaning "no restriction" (ADMIN global, PRODUCER/COLLABORATOR with all
// courses in workspace).
export async function getStaffCourseIds(
  staff: Pick<User, "id" | "role">
): Promise<string[] | null> {
  if (staff.role === "ADMIN") return null;
  if (staff.role === "PRODUCER") return null; // scoped at workspace level elsewhere
  if (staff.role === "COLLABORATOR") {
    const ctx = await requireCollaboratorContextIfAny(staff);
    if (!ctx) return [];
    if (ctx.courseIds.length === 0) {
      // All workspace courses
      const rows = await prisma.course.findMany({
        where: { workspaceId: ctx.workspaceId },
        select: { id: true },
      });
      return rows.map((r) => r.id);
    }
    return ctx.courseIds;
  }
  return [];
}

export async function requirePermission(
  staff: Pick<User, "id" | "role">,
  permission: string
): Promise<void> {
  if (staff.role === "ADMIN" || staff.role === "PRODUCER") return;
  if (staff.role !== "COLLABORATOR") throw new Error("Sem permissão");
  const ctx = await requireCollaboratorContextIfAny(staff);
  if (!ctx || !ctx.permissions.includes(permission)) {
    throw new Error("Sem permissão");
  }
}

// Returns true if the staff user can edit the given course.
// ADMIN: always. PRODUCER: only if they are the course owner.
export async function canEditCourse(
  staff: Pick<User, "id" | "role">,
  courseId: string
): Promise<boolean> {
  if (staff.role === "ADMIN") return true;
  if (staff.role === "COLLABORATOR") {
    const ctx = await requireCollaboratorContextIfAny(staff).catch(() => null);
    if (!ctx || !ctx.permissions.includes("MANAGE_LESSONS")) return false;
    const c = await prisma.course.findUnique({
      where: { id: courseId },
      select: { workspaceId: true },
    });
    if (!c || c.workspaceId !== ctx.workspaceId) return false;
    if (ctx.courseIds.length === 0) return true;
    return ctx.courseIds.includes(courseId);
  }
  if (staff.role !== "PRODUCER") return false;
  const c = await prisma.course.findUnique({
    where: { id: courseId },
    select: { ownerId: true, workspace: { select: { ownerId: true } } },
  });
  if (!c) return false;
  return c.ownerId === staff.id || c.workspace.ownerId === staff.id;
}

// Returns true if the staff user can manage student enrollments for the course.
// ADMIN: always. PRODUCER: only if owns course or workspace.
// COLLABORATOR: needs MANAGE_STUDENTS permission + course in scope.
export async function canManageStudentsOfCourse(
  staff: Pick<User, "id" | "role">,
  courseId: string
): Promise<boolean> {
  if (staff.role === "ADMIN") return true;
  if (staff.role === "COLLABORATOR") {
    const ctx = await requireCollaboratorContextIfAny(staff).catch(() => null);
    if (!ctx || !ctx.permissions.includes("MANAGE_STUDENTS")) return false;
    const c = await prisma.course.findUnique({
      where: { id: courseId },
      select: { workspaceId: true },
    });
    if (!c || c.workspaceId !== ctx.workspaceId) return false;
    if (ctx.courseIds.length === 0) return true;
    return ctx.courseIds.includes(courseId);
  }
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
  const m = await prisma.module.findUnique({
    where: { id: moduleId },
    select: {
      courseId: true,
      course: {
        select: { ownerId: true, workspace: { select: { ownerId: true } } },
      },
    },
  });
  if (!m) return false;
  if (staff.role === "COLLABORATOR") {
    return canEditCourse(staff, m.courseId);
  }
  if (staff.role !== "PRODUCER") return false;
  return (
    m.course.ownerId === staff.id || m.course.workspace.ownerId === staff.id
  );
}

export async function canEditLesson(
  staff: Pick<User, "id" | "role">,
  lessonId: string
): Promise<boolean> {
  if (staff.role === "ADMIN") return true;
  const l = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      module: {
        select: {
          courseId: true,
          course: {
            select: { ownerId: true, workspace: { select: { ownerId: true } } },
          },
        },
      },
    },
  });
  if (!l) return false;
  if (staff.role === "COLLABORATOR") {
    return canEditCourse(staff, l.module.courseId);
  }
  if (staff.role !== "PRODUCER") return false;
  return (
    l.module.course.ownerId === staff.id ||
    l.module.course.workspace.ownerId === staff.id
  );
}

import { notFound } from "next/navigation";
import { getCourseMeta } from "@/lib/course-meta";
import { getCurrentUser, isEnrollmentActive } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CourseShell } from "@/components/course-shell";
import { CourseSupportWidget } from "@/components/course-support-widget";
import { WorkspaceThemeLock } from "@/components/workspace-theme-lock";
import type { EnrollmentStatus } from "@prisma/client";

export default async function CourseSlugLayout(props: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const { children } = props;

  const course = await getCourseMeta(slug);
  if (!course) {
    notFound();
  }

  // Buscar forceTheme do workspace para WorkspaceThemeLock.
  // Cosmetic-only query — on failure we fall back to no force (user's
  // own theme wins) instead of crashing the whole course tree.
  let forceTheme: string | null = null;
  try {
    const workspaceForceTheme = await prisma.workspace.findUnique({
      where: { id: course.workspace!.id },
      select: { forceTheme: true },
    });
    forceTheme = workspaceForceTheme?.forceTheme ?? null;
  } catch (err) {
    console.error("[COURSE_LAYOUT] forceTheme query failed", err);
    forceTheme = null;
  }

  // Verificar acesso (ADMIN | PRODUCER dono do curso/workspace | enrollment ativo)
  let hasAccess = false;
  let isStudentAccess = false; // F2: only enrolled students get the support widget
  const user = await getCurrentUser();
  if (user) {
    const isCourseOwner =
      user.role === "PRODUCER" &&
      (course.ownerId === user.id || course.workspace!.ownerId === user.id);
    const isStaffViewer = user.role === "ADMIN" || isCourseOwner;

    if (isStaffViewer) {
      hasAccess = true;
    } else {
      // FAIL CLOSED: if the DB didn't confirm enrollment, we treat it as
      // no access. A transient Prisma blip must NEVER grant a non-paying
      // viewer the enrolled-student UI. isEnrollmentActive(null) is
      // defined to return false, so the fallback chain is type-safe.
      let enrollment: { status: EnrollmentStatus; expiresAt: Date | null } | null = null;
      try {
        enrollment = await prisma.enrollment.findFirst({
          where: { userId: user.id, courseId: course.id },
          select: { status: true, expiresAt: true },
        });
      } catch (err) {
        console.error(
          "[COURSE_LAYOUT] enrollment query failed — failing closed (no access)",
          err
        );
        enrollment = null;
      }
      hasAccess = isEnrollmentActive(enrollment);
      isStudentAccess = hasAccess;
    }
  }

  const hasCustomization = !!(
    course.memberBgColor ||
    course.memberSidebarColor ||
    course.memberHeaderColor ||
    course.memberCardColor ||
    course.memberPrimaryColor ||
    course.memberTextColor
  );

  // CSS vars SSR — só inclui campos customizados (fallbacks cobrem o resto)
  const memberVars = [
    course.memberBgColor && `--member-bg: ${course.memberBgColor}`,
    course.memberSidebarColor && `--member-sidebar: ${course.memberSidebarColor}`,
    course.memberHeaderColor && `--member-header: ${course.memberHeaderColor}`,
    course.memberCardColor && `--member-card: ${course.memberCardColor}`,
    course.memberPrimaryColor && `--member-primary: ${course.memberPrimaryColor}`,
    course.memberTextColor && `--member-text: ${course.memberTextColor}`,
  ]
    .filter(Boolean)
    .join("; ");

  return (
    <WorkspaceThemeLock forceTheme={forceTheme}>
      {memberVars && (
        <style
          dangerouslySetInnerHTML={{
            __html: `:root{${memberVars}}`,
          }}
        />
      )}
      <CourseShell
        course={{
          id: course.id,
          slug: course.slug,
          title: course.title,
          bannerUrl: course.bannerUrl,
          workspace: course.workspace!,
          termsContent: course.termsContent,
          termsFileUrl: course.termsFileUrl,
        }}
        hasAccess={hasAccess}
        hasCustomization={hasCustomization}
      >
        {children}
      </CourseShell>
      {/* F2 — Per-course support widget. Only for enrolled students (the API
          would 403 staff anyway) and only when the producer hasn't disabled
          showLessonSupport for this course. */}
      {isStudentAccess && course.showLessonSupport && (
        <CourseSupportWidget
          courseId={course.id}
          courseTitle={course.title}
          buttonColor={course.supportButtonColor}
          buttonImage={course.supportButtonImage}
        />
      )}
    </WorkspaceThemeLock>
  );
}

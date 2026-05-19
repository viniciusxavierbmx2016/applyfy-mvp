import { notFound } from "next/navigation";
import { getCourseMeta } from "@/lib/course-meta";
import { getCurrentUser, isEnrollmentActive } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CourseShell } from "@/components/course-shell";
import { WorkspaceThemeLock } from "@/components/workspace-theme-lock";

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

  // Buscar forceTheme do workspace para WorkspaceThemeLock
  const workspaceForceTheme = await prisma.workspace.findUnique({
    where: { id: course.workspace!.id },
    select: { forceTheme: true },
  });
  const forceTheme = workspaceForceTheme?.forceTheme ?? null;

  // Verificar acesso (ADMIN | PRODUCER dono do curso/workspace | enrollment ativo)
  let hasAccess = false;
  const user = await getCurrentUser();
  if (user) {
    const isCourseOwner =
      user.role === "PRODUCER" &&
      (course.ownerId === user.id || course.workspace!.ownerId === user.id);
    const isStaffViewer = user.role === "ADMIN" || isCourseOwner;

    if (isStaffViewer) {
      hasAccess = true;
    } else {
      const enrollment = await prisma.enrollment.findFirst({
        where: { userId: user.id, courseId: course.id },
        select: { status: true, expiresAt: true },
      });
      hasAccess = isEnrollmentActive(enrollment);
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
    </WorkspaceThemeLock>
  );
}

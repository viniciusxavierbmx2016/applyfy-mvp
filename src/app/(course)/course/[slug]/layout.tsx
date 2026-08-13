import { notFound } from "next/navigation";
import { getCourseMeta } from "@/lib/course-meta";
import {
  getCurrentUser,
  isEnrollmentActive,
  getCollaboratorContext,
} from "@/lib/auth";
import {
  isBlockedViewer,
  getWorkspaceBlock,
  contactOf,
} from "@/lib/workspace-block";
import { WorkspaceSuspendedNotice } from "@/components/workspace-suspended-notice";
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
  // ⚠️ COSMÉTICO. Só governa a classe `.course-customized` no modo preview —
  // nunca `hasAccess`. Existe porque as `--member-*` vão para todos, mas as ~109
  // regras de override vivem na classe, que só existia no shell completo: o
  // colaborador sem matrícula via o fundo do produtor com cards e acentos crus.
  let themeInPreview = false;
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
        // O ACESSO segue fail-closed (acima) — isto não o afrouxa. Mas o TEMA
        // não precisa ser punido por um soluço de rede: "não confirmei sua
        // matrícula" é diferente de "você não tem", e apagar as cores do
        // produtor para um aluno legítimo é regressão visível causada por erro
        // transitório. Só a classe cosmética sobrevive; o shell, não.
        themeInPreview = true;
      }
      hasAccess = isEnrollmentActive(enrollment);
      isStudentAccess = hasAccess;

      // Colaborador aceito DESTE workspace: entra na comunidade do curso para
      // moderar (as APIs já o autorizam) e merece ver o curso com as cores do
      // produtor, não com o Tailwind cru. `getCollaboratorContext` é por userId
      // e cache()d — cego ao role, então cobre o híbrido do C5.
      // ⚠️ Escopo deliberado: NÃO se aplica a visitante sem vínculo. Um `.
      // course-customized` incondicional aqui mudaria a cara da PÁGINA DE VENDA
      // de todo curso customizado, que é superfície de receita e não foi pedida.
      if (!hasAccess && !themeInPreview) {
        try {
          const ctx = await getCollaboratorContext(user.id);
          themeInPreview = ctx?.workspaceId === course.workspace!.id;
        } catch (err) {
          console.error("[COURSE_LAYOUT] collaborator lookup failed (cosmetic)", err);
          themeInPreview = false;
        }
      }
    }
  }

  // FASE 6B fatia 2 — bloqueio por plano do produtor. Cobre página do curso,
  // módulo, aula e comunidade de uma vez (o layout envolve as 4 rotas).
  // ⚠️ SSR: protege o RENDER. A API do player (/api/lessons/[id]/view) tem o
  // mesmo bloqueio — bloquear só um deixa o outro servindo.
  // ⚠️ Contato: getCourseMeta NÃO traz supportEmail/supportWhatsapp (só
  // showLessonSupport e as cores do botão), e esta fatia não toca a peça
  // compartilhada — aqui o contato é o do DONO. Trazer o suporte do curso ao
  // meta é candidato próprio.
  if (isBlockedViewer(user, course.workspace!.ownerId)) {
    const block = await getWorkspaceBlock(course.workspace!.id);
    if (block.blocked) {
      return (
        <WorkspaceSuspendedNotice
          contact={contactOf(block.owner, null, block.workspace)}
        />
      );
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
        themeInPreview={themeInPreview}
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

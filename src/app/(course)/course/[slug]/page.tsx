"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useUserStore } from "@/stores/user-store";
import { ReviewsSection } from "@/components/reviews-section";
import {
  ModuleCarousel,
  type CarouselModule,
} from "@/components/module-carousel";
import { CoursePreview } from "@/components/course-preview";
import { ModuleListView, type ListModule } from "@/components/module-list-view";
import { HeadphonesIcon } from "@/components/support-popover";
import { formatPhoneDisplay, formatWhatsappLink, stripHtml } from "@/lib/utils";

interface LessonItem {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string;
  duration: number | null;
  order: number;
  daysToRelease: number;
  progress: Array<{ completed: boolean }>;
}

interface ModuleItem {
  id: string;
  title: string;
  order: number;
  daysToRelease: number;
  releaseAt: string | null;
  thumbnailUrl: string | null;
  hideTitle?: boolean;
  sectionId: string | null;
  lessons: LessonItem[];
  firstIncompleteLesson: string | null;
}

interface SectionItem {
  id: string;
  title: string;
  order: number;
}

interface CourseDetail {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail: string | null;
  bannerUrl: string | null;
  checkoutUrl: string | null;
  price: number | null;
  priceCurrency: string | null;
  certificateEnabled?: boolean;
  communityEnabled?: boolean;
  reviewsEnabled?: boolean;
  showStudentCount?: boolean;
  enrollmentCount?: number;
  supportEmail?: string | null;
  supportWhatsapp?: string | null;
  ratingAverage: number;
  ratingCount: number;
  memberWelcomeText?: string | null;
  memberLayoutStyle?: string | null;
  modules: ModuleItem[];
  sections: SectionItem[];
}

interface MyReview {
  rating: number;
  comment: string | null;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
function releaseInfo(base: Date | null, days: number) {
  const baseMs = base ? new Date(base).getTime() : Date.now();
  const releaseTime = baseMs + Math.max(0, days) * MS_PER_DAY;
  return { released: releaseTime <= Date.now(), releaseAt: new Date(releaseTime) };
}

function moduleStats(m: ModuleItem) {
  const total = m.lessons.length;
  const done = m.lessons.filter((l) => l.progress?.some((p) => p.completed)).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { pct, done, total };
}

function toCarouselModule(
  m: ModuleItem,
  course: CourseDetail,
  enrollmentCreatedAt: Date | null,
  hasAccess: boolean,
  overrides: { modules: Set<string>; lessons: Set<string> },
  bypassRelease: boolean
): CarouselModule {
  const stats = moduleStats(m);
  const rel = releaseInfo(enrollmentCreatedAt, m.daysToRelease ?? 0);
  const overridden = overrides.modules.has(m.id) || bypassRelease;
  const dateLocked = m.releaseAt ? new Date(m.releaseAt) > new Date() : false;
  const locked = hasAccess && !overridden && (!rel.released || dateLocked);
  const empty = stats.total === 0;
  const resumeLessonId =
    m.firstIncompleteLesson ?? m.lessons.slice().sort((a, b) => a.order - b.order)[0]?.id ?? null;
  const clickable = hasAccess && !locked && !empty && !!resumeLessonId;
  const displayReleaseAt = dateLocked && m.releaseAt ? new Date(m.releaseAt) : rel.releaseAt;
  return {
    id: m.id,
    title: m.title,
    thumbnailUrl: m.thumbnailUrl,
    lessonsTotal: stats.total,
    lessonsDone: stats.done,
    progressPct: stats.pct,
    locked,
    empty,
    hideTitle: m.hideTitle,
    releaseAt: displayReleaseAt,
    href:
      clickable && resumeLessonId
        ? `/course/${course.slug}/lesson/${resumeLessonId}`
        : `/course/${course.slug}`,
    clickable,
  };
}

function toListModule(
  m: ModuleItem,
  course: CourseDetail,
  enrollmentCreatedAt: Date | null,
  hasAccess: boolean,
  overrides: { modules: Set<string>; lessons: Set<string> },
  bypassRelease: boolean
): ListModule {
  const stats = moduleStats(m);
  const rel = releaseInfo(enrollmentCreatedAt, m.daysToRelease ?? 0);
  const overridden = overrides.modules.has(m.id) || bypassRelease;
  const dateLocked = m.releaseAt ? new Date(m.releaseAt) > new Date() : false;
  const locked = hasAccess && !overridden && (!rel.released || dateLocked);
  const resumeLessonId =
    m.firstIncompleteLesson ?? m.lessons.slice().sort((a, b) => a.order - b.order)[0]?.id ?? null;
  return {
    id: m.id,
    title: m.title,
    thumbnailUrl: m.thumbnailUrl,
    lessonsTotal: stats.total,
    lessonsDone: stats.done,
    progressPct: stats.pct,
    locked,
    hideTitle: m.hideTitle,
    releaseAt: dateLocked && m.releaseAt ? new Date(m.releaseAt).toLocaleDateString("pt-BR") : undefined,
    resumeHref: resumeLessonId
      ? `/course/${course.slug}/lesson/${resumeLessonId}`
      : `/course/${course.slug}`,
    lessons: m.lessons
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((l) => {
        const lRel = releaseInfo(
          enrollmentCreatedAt,
          Math.max(m.daysToRelease ?? 0, l.daysToRelease ?? 0)
        );
        const lOverridden = overrides.lessons.has(l.id) || overridden || bypassRelease;
        return {
          id: l.id,
          title: l.title,
          completed: l.progress?.some((p) => p.completed) ?? false,
          locked: hasAccess && !lOverridden && !lRel.released,
        };
      }),
  };
}

function groupBySection(modules: ModuleItem[], sections: SectionItem[]) {
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);
  const sortedModules = [...modules].sort((a, b) => a.order - b.order);
  const unsectioned = sortedModules.filter((m) => !m.sectionId);
  const groups: Array<{ section: SectionItem | null; modules: ModuleItem[] }> = [];
  if (unsectioned.length > 0) {
    groups.push({ section: null, modules: unsectioned });
  }
  for (const s of sortedSections) {
    groups.push({
      section: s,
      modules: sortedModules.filter((m) => m.sectionId === s.id),
    });
  }
  return groups;
}

export default function CourseHomePage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const workspace = useUserStore((s) => s.workspace);
  const isStaffViewer =
    user?.role === "ADMIN" || user?.role === "PRODUCER";
  const backHref = isStaffViewer
    ? "/"
    : workspace?.slug
      ? `/w/${workspace.slug}`
      : "/";
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [serverStaffViewer, setServerStaffViewer] = useState(false);
  const [enrollmentCreatedAt, setEnrollmentCreatedAt] = useState<Date | null>(null);
  const [myReview, setMyReview] = useState<MyReview | null>(null);
  const [overrides, setOverrides] = useState<{
    modules: Set<string>;
    lessons: Set<string>;
  }>({ modules: new Set(), lessons: new Set() });
  const [lastAccessedLesson, setLastAccessedLesson] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/courses/by-slug/${params.slug}/init`);
        if (res.ok) {
          const data = await res.json();
          setCourse(data.course);
          setHasAccess(data.hasAccess);
          setServerStaffViewer(!!data.isStaffViewer);
          setEnrollmentCreatedAt(
            data.enrollment?.createdAt ? new Date(data.enrollment.createdAt) : null
          );
          setMyReview(data.myReview ?? null);
          setOverrides({
            modules: new Set<string>(data.overrides?.modules ?? []),
            lessons: new Set<string>(data.overrides?.lessons ?? []),
          });
          setLastAccessedLesson(data.lastAccessedLesson ?? null);
        } else if (res.status === 404) {
          router.push(backHref);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.slug, router, backHref]);

  const totals = useMemo(() => {
    if (!course) return { totalLessons: 0, doneLessons: 0, pct: 0 };
    let totalLessons = 0;
    let doneLessons = 0;
    for (const m of course.modules) {
      for (const l of m.lessons) {
        totalLessons++;
        if (l.progress?.some((p) => p.completed)) doneLessons++;
      }
    }
    const pct = totalLessons === 0 ? 0 : Math.round((doneLessons / totalLessons) * 100);
    return { totalLessons, doneLessons, pct };
  }, [course]);

  const bypassRelease = serverStaffViewer || isStaffViewer;
  const continueWatching = useMemo(() => {
    if (!course) return null;
    const all = course.modules
      .flatMap((m) =>
        m.lessons.map((l) => ({
          lesson: l,
          module: m,
          released:
            bypassRelease ||
            overrides.lessons.has(l.id) ||
            overrides.modules.has(m.id) ||
            releaseInfo(
              enrollmentCreatedAt,
              Math.max(m.daysToRelease ?? 0, l.daysToRelease ?? 0)
            ).released,
        }))
      )
      .filter((x) => x.released);
    if (all.length === 0) return null;
    if (lastAccessedLesson) {
      const fromAccess = all.find((x) => x.lesson.id === lastAccessedLesson);
      if (fromAccess) return fromAccess;
    }
    return all.find((x) => !x.lesson.progress?.some((p) => p.completed)) ?? all[0];
  }, [course, enrollmentCreatedAt, overrides, lastAccessedLesson, bypassRelease]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-16 px-4">
        <p className="text-gray-600 dark:text-gray-400">Curso não encontrado</p>
      </div>
    );
  }

  // Pré-visualização para quem não tem acesso (página de vendas)
  if (!hasAccess) {
    return (
      <CoursePreview
        course={{
          id: course.id,
          title: course.title,
          slug: course.slug,
          description: course.description,
          thumbnail: course.thumbnail,
          bannerUrl: course.bannerUrl,
          checkoutUrl: course.checkoutUrl,
          price: course.price,
          priceCurrency: course.priceCurrency,
          ratingAverage: course.ratingAverage,
          ratingCount: course.ratingCount,
          certificateEnabled: course.certificateEnabled,
          reviewsEnabled: course.reviewsEnabled,
          showStudentCount: course.showStudentCount,
          enrollmentCount: course.enrollmentCount,
          modules: course.modules.map((m) => ({
            id: m.id,
            title: m.title,
            order: m.order,
            thumbnailUrl: m.thumbnailUrl,
            sectionId: m.sectionId,
            lessons: m.lessons.map((l) => ({
              id: l.id,
              title: l.title,
              order: l.order,
            })),
          })),
          sections: course.sections || [],
        }}
        myReview={myReview}
      />
    );
  }

  const groups = groupBySection(course.modules, course.sections || []);

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-4 lg:py-6 max-w-[1400px] mx-auto w-full">
      {isStaffViewer && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/30 text-sm">
          <span className="text-amber-800 dark:text-amber-200 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Você está visualizando como produtor
          </span>
          <Link
            href={`/producer/courses/${course.id}/edit`}
            className="text-amber-900 dark:text-amber-100 font-medium hover:underline"
          >
            Voltar ao editor →
          </Link>
        </div>
      )}
      {/* Banner */}
      {course.bannerUrl && (
        <div
          className="relative w-full mb-0 -mx-4 sm:-mx-6 lg:-mx-10 overflow-hidden bg-gray-100 dark:bg-gray-900 min-h-[240px] sm:min-h-[320px] lg:min-h-[380px]"
          style={{ aspectRatio: "1125/400" }}
        >
          <Image
            src={course.bannerUrl}
            alt={course.title}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/0 to-transparent dark:from-gray-950 dark:via-gray-950/0 dark:to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-white/30 via-transparent to-white/30 dark:from-gray-950/40 dark:via-transparent dark:to-gray-950/40" />
        </div>
      )}

      {/* Course header row */}
      <div className={`mb-10 flex flex-col lg:flex-row lg:items-center gap-5 lg:gap-6 bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-gray-200/70 dark:border-white/5 rounded-2xl p-5 shadow-sm shadow-black/[0.02] dark:shadow-none relative z-10 ${course.bannerUrl ? "-mt-16 sm:-mt-20" : ""}`}>
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {course.thumbnail ? (
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0 ring-1 ring-black/5 dark:ring-white/10">
              <Image
                src={course.thumbnail}
                alt={course.title}
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-semibold text-xl flex-shrink-0 shadow-sm">
              {course.title.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-gray-900 dark:text-white truncate">
              {course.title}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              {course.modules.length} módulo{course.modules.length !== 1 && "s"}
              {" · "}
              {totals.totalLessons} aula{totals.totalLessons !== 1 && "s"}
              {course.showStudentCount && typeof course.enrollmentCount === "number" && course.enrollmentCount > 0 && (
                <>
                  {" · "}
                  {course.enrollmentCount} aluno{course.enrollmentCount !== 1 && "s"} matriculado{course.enrollmentCount !== 1 && "s"}
                </>
              )}
            </p>
          </div>
        </div>

        {hasAccess && totals.totalLessons > 0 && (
          <div className="lg:w-80">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {totals.pct}% de progresso
              </span>
              <span className="text-gray-500 flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {totals.doneLessons}/{totals.totalLessons}
              </span>
            </div>
            <div className="h-1.5 bg-gray-200 dark:bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500"
                style={{ width: `${totals.pct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {!hasAccess && (
        <div className="mb-8 bg-gray-50 dark:bg-white/5 border border-gray-200/70 dark:border-white/5 rounded-2xl p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <p className="text-base font-semibold tracking-tight text-gray-900 dark:text-white">
              Acesso bloqueado
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Adquira o curso para assistir às aulas.
            </p>
          </div>
          {course.checkoutUrl && (
            <a
              href={course.checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors duration-200 shadow-sm hover:shadow"
            >
              Comprar agora
            </a>
          )}
        </div>
      )}

      {course.memberWelcomeText && (
        <p className="mb-6 text-gray-600 dark:text-gray-400 text-sm">
          {course.memberWelcomeText}
        </p>
      )}

      {hasAccess && continueWatching && (
        <section id="continue" className="mb-12 scroll-mt-20">
          <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white mb-4 px-1">
            Continuar assistindo
          </h2>
          <Link
            href={`/course/${course.slug}/lesson/${continueWatching.lesson.id}`}
            className="group relative flex flex-col sm:flex-row gap-5 p-5 bg-gradient-to-r from-gray-50 via-gray-50 to-white dark:from-white/[0.06] dark:via-white/[0.04] dark:to-white/[0.02] border border-gray-200/70 dark:border-white/5 rounded-2xl shadow-sm transition-[border-color,box-shadow] duration-300 hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/40 hover:border-gray-300 dark:hover:border-white/10"
          >
            <div className="relative w-full sm:w-64 aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0 ring-1 ring-black/5 dark:ring-white/5">
              {continueWatching.module.thumbnailUrl ? (
                <Image
                  src={continueWatching.module.thumbnailUrl}
                  alt={continueWatching.module.title}
                  fill
                  sizes="256px"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : course.thumbnail ? (
                <Image src={course.thumbnail} alt={course.title} fill sizes="256px" className="object-cover transition-transform duration-300 group-hover:scale-105" />
              ) : null}
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors duration-300">
                <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ring-2 ring-white/30">
                  <svg className="w-7 h-7 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <p className="text-xs uppercase tracking-widest text-blue-500 dark:text-blue-400 font-semibold">
                {continueWatching.module.title}
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-white mt-1.5 line-clamp-2">
                {continueWatching.lesson.title}
              </p>
              {continueWatching.lesson.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
                  {stripHtml(continueWatching.lesson.description)}
                </p>
              )}
              <span className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 group-hover:gap-3 transition-[gap] duration-300">
                Continuar
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </Link>
        </section>
      )}

      {course.memberLayoutStyle === "list" ? (
        <ModuleListView
          courseSlug={course.slug}
          groups={groups.map((group) => ({
            title:
              group.section?.title ??
              (groups.length > 1 ? "Módulos" : undefined),
            modules: group.modules.map((m) =>
              toListModule(
                m,
                course,
                enrollmentCreatedAt,
                hasAccess,
                overrides,
                serverStaffViewer || isStaffViewer
              )
            ),
          }))}
        />
      ) : (
        groups.map((group, idx) => (
          <ModuleCarousel
            key={group.section?.id || `group-${idx}`}
            title={
              group.section?.title ??
              (groups.length > 1 ? "Módulos" : undefined)
            }
            modules={group.modules.map((m) =>
              toCarouselModule(
                m,
                course,
                enrollmentCreatedAt,
                hasAccess,
                overrides,
                serverStaffViewer || isStaffViewer
              )
            )}
          />
        ))
      )}

      {course.modules.length === 0 && (
        <div className="bg-gray-50 dark:bg-white/5 border border-gray-200/70 dark:border-white/5 rounded-2xl p-8 text-center">
          <p className="text-gray-500">Nenhum módulo disponível ainda.</p>
        </div>
      )}

      <section className="mb-12">
        <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white mb-4 px-1">
          Sobre o curso
        </h2>
        <div
          className="prose-lesson text-gray-700 dark:text-gray-300 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: course.description }}
        />
      </section>

      {course.reviewsEnabled !== false && (
        <ReviewsSection
          courseId={course.id}
          initialAverage={course.ratingAverage}
          initialCount={course.ratingCount}
          myReview={myReview}
          canReview={hasAccess}
        />
      )}

      {(course.supportEmail || course.supportWhatsapp) && (
        <section className="mt-10 rounded-xl border border-gray-200/70 dark:border-white/5 bg-gray-50 dark:bg-white/5 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 inline-flex items-center justify-center flex-shrink-0">
              <HeadphonesIcon className="w-5 h-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Precisa de ajuda?
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Fale direto com a equipe de suporte deste curso.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {course.supportEmail && (
              <a
                href={`mailto:${course.supportEmail}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/60 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition"
              >
                <svg className="w-4 h-4 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email
              </a>
            )}
            {formatWhatsappLink(course.supportWhatsapp) && (
              <a
                href={formatWhatsappLink(course.supportWhatsapp)!}
                target="_blank"
                rel="noopener noreferrer"
                title={formatPhoneDisplay(course.supportWhatsapp)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/60 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition"
              >
                <svg className="w-4 h-4 text-emerald-500 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h2.28a1 1 0 01.95.68l1.5 4.49a1 1 0 01-.5 1.21l-1.9.95a11 11 0 005.52 5.52l.95-1.9a1 1 0 011.21-.5l4.49 1.5a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C9.72 21 3 14.28 3 6V5z" />
                </svg>
                WhatsApp
              </a>
            )}
          </div>
        </section>
      )}
    </div>
  );
}


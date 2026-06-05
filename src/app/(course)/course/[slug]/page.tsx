"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { SkeletonModuleCarousel } from "@/components/ui/skeleton";
import { formatPhoneDisplay, formatWhatsappLink } from "@/lib/utils";

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
  thumbnailPosition: string | null;
  bannerUrl: string | null;
  bannerPosition: string | null;
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

// Picks the lesson to land on when the user clicks a module: the first
// RELEASED-and-incomplete lesson (in order). Falls back to the first
// released lesson when everything's done. Returns null when no lesson
// in the module is released yet — callers should send the user to the
// module overview page in that case so they can see when each unlocks.
function pickResumeLessonId(
  m: ModuleItem,
  enrollmentCreatedAt: Date | null,
  overrides: { modules: Set<string>; lessons: Set<string> },
  bypassRelease: boolean
): string | null {
  const moduleOverridden = overrides.modules.has(m.id) || bypassRelease;
  const ordered = m.lessons.slice().sort((a, b) => a.order - b.order);
  const released = ordered.filter((l) => {
    if (overrides.lessons.has(l.id) || moduleOverridden) return true;
    const r = releaseInfo(
      enrollmentCreatedAt,
      Math.max(m.daysToRelease ?? 0, l.daysToRelease ?? 0)
    );
    return r.released;
  });
  if (released.length === 0) return null;
  const incomplete = released.find(
    (l) => !l.progress?.some((p) => p.completed)
  );
  return (incomplete ?? released[0]).id;
}

function toCarouselModule(
  m: ModuleItem,
  course: CourseDetail,
  enrollmentCreatedAt: Date | null,
  hasAccess: boolean,
  overrides: { modules: Set<string>; lessons: Set<string> },
  bypassRelease: boolean,
  automationLocks: Record<string, { reason: string }>
): CarouselModule {
  const stats = moduleStats(m);
  const autoLock = automationLocks[m.id];
  const overridden = overrides.modules.has(m.id) || bypassRelease;
  const lockedByAutomation = !overridden && !!autoLock;
  const rel = releaseInfo(enrollmentCreatedAt, m.daysToRelease ?? 0);
  const dateLocked = m.releaseAt ? new Date(m.releaseAt) > new Date() : false;
  const locked = lockedByAutomation || (hasAccess && !overridden && (!rel.released || dateLocked));
  const empty = stats.total === 0;
  const resumeLessonId = pickResumeLessonId(m, enrollmentCreatedAt, overrides, bypassRelease);
  const clickable = hasAccess && !locked && !empty;
  const displayReleaseAt = dateLocked && m.releaseAt ? new Date(m.releaseAt) : rel.releaseAt;
  // When the module itself is released but every lesson inside is still
  // gated by a per-lesson drip, send the user to the module overview
  // page where each lesson shows its unlock date.
  const moduleHref = clickable
    ? resumeLessonId
      ? `/course/${course.slug}/lesson/${resumeLessonId}`
      : `/course/${course.slug}/module/${m.id}`
    : `/course/${course.slug}`;
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
    releaseAt: lockedByAutomation ? undefined : displayReleaseAt,
    href: moduleHref,
    clickable,
  };
}

function toListModule(
  m: ModuleItem,
  course: CourseDetail,
  enrollmentCreatedAt: Date | null,
  hasAccess: boolean,
  overrides: { modules: Set<string>; lessons: Set<string> },
  bypassRelease: boolean,
  automationLocks: Record<string, { reason: string }>
): ListModule {
  const stats = moduleStats(m);
  const autoLock = automationLocks[m.id];
  const overridden = overrides.modules.has(m.id) || bypassRelease;
  const lockedByAutomation = !overridden && !!autoLock;
  const rel = releaseInfo(enrollmentCreatedAt, m.daysToRelease ?? 0);
  const dateLocked = m.releaseAt ? new Date(m.releaseAt) > new Date() : false;
  const locked = lockedByAutomation || (hasAccess && !overridden && (!rel.released || dateLocked));
  const resumeLessonId = pickResumeLessonId(m, enrollmentCreatedAt, overrides, bypassRelease);
  return {
    id: m.id,
    title: m.title,
    thumbnailUrl: m.thumbnailUrl,
    lessonsTotal: stats.total,
    lessonsDone: stats.done,
    progressPct: stats.pct,
    locked,
    hideTitle: m.hideTitle,
    releaseAt: lockedByAutomation
      ? undefined
      : dateLocked && m.releaseAt
        ? new Date(m.releaseAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" })
        : locked && !rel.released
          ? rel.releaseAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" })
          : undefined,
    lockReason: lockedByAutomation ? autoLock.reason : undefined,
    resumeHref: resumeLessonId
      ? `/course/${course.slug}/lesson/${resumeLessonId}`
      : `/course/${course.slug}/module/${m.id}`,
    lessons: m.lessons
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((l) => {
        const lRel = releaseInfo(
          enrollmentCreatedAt,
          Math.max(m.daysToRelease ?? 0, l.daysToRelease ?? 0)
        );
        const lOverridden = overrides.lessons.has(l.id) || overridden || bypassRelease;
        const locked = hasAccess && !lOverridden && !lRel.released;
        return {
          id: l.id,
          title: l.title,
          completed: l.progress?.some((p) => p.completed) ?? false,
          locked,
          releaseDate: locked ? lRel.releaseAt.toISOString() : null,
        };
      }),
  };
}

function groupBySection(modules: ModuleItem[], sections: SectionItem[]) {
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);
  const sortedModules = [...modules].sort((a, b) => a.order - b.order);
  const unsectioned = sortedModules.filter((m) => !m.sectionId);
  const groups: Array<{ section: SectionItem | null; modules: ModuleItem[] }> = [];
  for (const s of sortedSections) {
    groups.push({
      section: s,
      modules: sortedModules.filter((m) => m.sectionId === s.id),
    });
  }
  if (unsectioned.length > 0) {
    groups.push({ section: null, modules: unsectioned });
  }
  return groups;
}

export default function CourseHomePage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const workspace = useUserStore((s) => s.workspace);
  // Local role-only check. Kept (still used by bypassRelease / groups.map
  // below as a permissive default) — but DON'T use it to decide UX that
  // depends on ownership (banner, backHref): a PRODUCER buying another
  // producer's course would falsely qualify. serverStaffViewer (populated
  // from /init, ownership-aware) is the right source for that.
  const isStaffViewer =
    user?.role === "ADMIN" || user?.role === "PRODUCER";
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [serverStaffViewer, setServerStaffViewer] = useState(false);
  // Declared AFTER serverStaffViewer to avoid TDZ. Uses the ownership-aware
  // flag so a producer-as-buyer goes back to /w/<slug>, not /.
  const backHref = serverStaffViewer
    ? "/"
    : workspace?.slug
      ? `/w/${workspace.slug}`
      : "/";
  const [enrollmentCreatedAt, setEnrollmentCreatedAt] = useState<Date | null>(null);
  const [myReview, setMyReview] = useState<MyReview | null>(null);
  const [overrides, setOverrides] = useState<{
    modules: Set<string>;
    lessons: Set<string>;
  }>({ modules: new Set(), lessons: new Set() });
  const [automationLocks, setAutomationLocks] = useState<Record<string, { reason: string }>>({});
  const [lastAccessedLesson, setLastAccessedLesson] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
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
        setAutomationLocks(data.automationLocks ?? {});
        setLoadError(false);
      } else if (res.status === 404) {
        // Curso realmente não existe → redireciona (NÃO é erro técnico).
        router.push(backHref);
        return;
      } else {
        // 5xx ou qualquer outro não-ok: erro técnico real, em vez de cair no
        // "Curso não encontrado" enganoso. Espelha o storefront (commit 4aeb733).
        setLoadError(true);
      }
    } catch {
      // Falha de rede/parse — mesmo tratamento de erro de servidor.
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [params.slug, router, backHref]);

  useEffect(() => {
    load();
  }, [load]);

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
            (bypassRelease ||
            overrides.lessons.has(l.id) ||
            overrides.modules.has(m.id) ||
            releaseInfo(
              enrollmentCreatedAt,
              Math.max(m.daysToRelease ?? 0, l.daysToRelease ?? 0)
            ).released) && !automationLocks[m.id],
        }))
      )
      .filter((x) => x.released);
    if (all.length === 0) return null;
    if (lastAccessedLesson) {
      const fromAccess = all.find((x) => x.lesson.id === lastAccessedLesson);
      if (fromAccess) return fromAccess;
    }
    return all.find((x) => !x.lesson.progress?.some((p) => p.completed)) ?? all[0];
  }, [course, enrollmentCreatedAt, overrides, lastAccessedLesson, bypassRelease, automationLocks]);

  if (loading) {
    return (
      <div className="animate-fade-in-up space-y-8 p-4 lg:p-8">
        <div className="w-full rounded-xl bg-gray-200 dark:bg-gray-800/40 animate-pulse aspect-[16/9] sm:aspect-[10/3] lg:aspect-[75/16]" />
        <div className="space-y-2">
          <div className="h-8 w-2/3 rounded bg-gray-200 dark:bg-gray-800/60 animate-pulse" />
          <div className="h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-800/40 animate-pulse" />
          <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-800/40 animate-pulse mt-2" />
        </div>
        <SkeletonModuleCarousel />
        <SkeletonModuleCarousel />
      </div>
    );
  }

  // Erro TÉCNICO (5xx / rede) — tela de retry, distinta do "não encontrado" (404 redireciona).
  if (loadError && !loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 001.74-2.99l-6.93-12a2 2 0 00-3.48 0l-6.93 12A2 2 0 005.07 19z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Não foi possível carregar o curso
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Ocorreu um erro. Verifique sua conexão e tente novamente.
          </p>
          <button
            onClick={() => load()}
            className="inline-flex items-center justify-center px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-lg transition"
          >
            Tentar novamente
          </button>
        </div>
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
          supportEmail: course.supportEmail,
          supportWhatsapp: course.supportWhatsapp,
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

  // Aluno "novo" no curso: nunca abriu nenhuma aula (sem lastAccessedLesson) E não
  // completou nenhuma. Só ele vê "Comece por aqui"/"Começar"; quem já tem QUALQUER
  // progresso/acesso vê exatamente o de hoje ("Continuar assistindo"/"Continuar").
  const isNewStudent = !lastAccessedLesson && totals.doneLessons === 0;

  return (
    <div className="w-full animate-fade-in-up">
      {serverStaffViewer && (
        <div className="px-4 sm:px-6 lg:px-10 max-w-[1400px] mx-auto w-full pt-4 lg:pt-6">
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
        </div>
      )}
      {/* Banner */}
      {course.bannerUrl && (
        <div
          className="relative w-full overflow-hidden bg-gray-100 dark:bg-gray-900 aspect-[16/9] sm:aspect-[10/3] lg:aspect-[75/16]"
        >
          <Image
            src={course.bannerUrl}
            alt={course.title}
            fill
            sizes="100vw"
            className="object-cover"
            style={course.bannerPosition ? (() => { try { const p = JSON.parse(course.bannerPosition); return { objectPosition: `${p.x}% ${p.y}%` }; } catch { return undefined; } })() : undefined}
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/0 to-transparent dark:from-gray-950 dark:via-gray-950/0 dark:to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-white/30 via-transparent to-white/30 dark:from-gray-950/40 dark:via-transparent dark:to-gray-950/40" />
        </div>
      )}

      {/* Resto do conteúdo: capado em 1400 + centralizado, com o padding lateral.
          pt SÓ quando NÃO há banner — com banner, o box de info sobe via -mt e sobrepõe
          o banner (sem pt aqui pro margin-top negativo colapsar através deste wrapper). */}
      <div className={`px-4 sm:px-6 lg:px-10 pb-4 lg:pb-6 max-w-[1400px] mx-auto w-full ${course.bannerUrl ? "" : "pt-4 lg:pt-6"}`}>
      {/* Course header row */}
      <div className={`mb-10 flex flex-col lg:flex-row lg:items-center gap-5 lg:gap-6 bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-gray-200/70 dark:border-white/5 rounded-2xl p-5 shadow-sm shadow-black/[0.02] dark:shadow-none relative z-10 ${course.bannerUrl ? "-mt-12 sm:-mt-14" : ""}`}>
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {course.thumbnail ? (
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0 ring-1 ring-black/5 dark:ring-white/10">
              <Image
                src={course.thumbnail}
                alt={course.title}
                fill
                sizes="64px"
                className="object-cover"
                style={course.thumbnailPosition ? (() => { try { const p = JSON.parse(course.thumbnailPosition); return { objectPosition: `${p.x}% ${p.y}%` }; } catch { return undefined; } })() : undefined}
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
                className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-[width] duration-500"
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
        <section id="continue" className="mb-6 scroll-mt-20">
          <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white mb-3 px-1">
            {isNewStudent ? "Comece por aqui" : "Continuar assistindo"}
          </h2>
          <Link
            href={`/course/${course.slug}/lesson/${continueWatching.lesson.id}`}
            className="group relative flex flex-row items-center gap-4 p-4 bg-gradient-to-r from-gray-50 via-gray-50 to-white dark:from-white/[0.06] dark:via-white/[0.04] dark:to-white/[0.02] border border-gray-200/70 dark:border-white/5 rounded-2xl shadow-sm transition-[border-color,box-shadow] duration-300 hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/40 hover:border-gray-300 dark:hover:border-white/10"
          >
            <div className="relative w-32 sm:w-48 aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0 ring-1 ring-black/5 dark:ring-white/5">
              {continueWatching.module.thumbnailUrl ? (
                <Image
                  src={continueWatching.module.thumbnailUrl}
                  alt={continueWatching.module.title}
                  fill
                  sizes="(max-width: 640px) 128px, 192px"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : course.thumbnail ? (
                <Image src={course.thumbnail} alt={course.title} fill sizes="(max-width: 640px) 128px, 192px" className="object-cover transition-transform duration-300 group-hover:scale-105" />
              ) : null}
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors duration-300">
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ring-2 ring-white/30">
                  <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] sm:text-xs uppercase tracking-widest text-blue-500 dark:text-blue-400 font-semibold truncate">
                {continueWatching.module.title}
              </p>
              <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mt-1 line-clamp-2">
                {continueWatching.lesson.title}
              </p>
              <span className="mt-2 inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400 group-hover:gap-2.5 transition-[gap] duration-300">
                {isNewStudent ? "Começar" : "Continuar"}
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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
              undefined,
            modules: group.modules.map((m) =>
              toListModule(
                m,
                course,
                enrollmentCreatedAt,
                hasAccess,
                overrides,
                serverStaffViewer || isStaffViewer,
                automationLocks
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
              undefined
            }
            modules={group.modules.map((m) =>
              toCarouselModule(
                m,
                course,
                enrollmentCreatedAt,
                hasAccess,
                overrides,
                serverStaffViewer || isStaffViewer,
                automationLocks
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

      {course.description?.trim() && (
        <section className="mb-12">
          <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white mb-4 px-1">
            Sobre o curso
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
            {course.description}
          </p>
        </section>
      )}

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
    </div>
  );
}


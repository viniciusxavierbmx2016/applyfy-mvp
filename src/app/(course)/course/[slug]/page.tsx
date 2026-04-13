"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ReviewsSection } from "@/components/reviews-section";
import {
  ModuleCarousel,
  type CarouselModule,
} from "@/components/module-carousel";
import { CoursePreview } from "@/components/course-preview";

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
  thumbnailUrl: string | null;
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
  hasCertificate?: boolean;
  ratingAverage: number;
  ratingCount: number;
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
  hasAccess: boolean
): CarouselModule {
  const stats = moduleStats(m);
  const rel = releaseInfo(enrollmentCreatedAt, m.daysToRelease ?? 0);
  const locked = hasAccess && !rel.released;
  const empty = stats.total === 0;
  const resumeLessonId =
    m.firstIncompleteLesson ?? m.lessons.slice().sort((a, b) => a.order - b.order)[0]?.id ?? null;
  const clickable = hasAccess && !locked && !empty && !!resumeLessonId;
  return {
    id: m.id,
    title: m.title,
    thumbnailUrl: m.thumbnailUrl,
    lessonsTotal: stats.total,
    lessonsDone: stats.done,
    progressPct: stats.pct,
    locked,
    empty,
    releaseAt: rel.releaseAt,
    href:
      clickable && resumeLessonId
        ? `/course/${course.slug}/lesson/${resumeLessonId}`
        : `/course/${course.slug}`,
    clickable,
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
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [enrollmentCreatedAt, setEnrollmentCreatedAt] = useState<Date | null>(null);
  const [myReview, setMyReview] = useState<MyReview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/courses/by-slug/${params.slug}`);
        if (res.ok) {
          const data = await res.json();
          setCourse(data.course);
          setHasAccess(data.hasAccess);
          setEnrollmentCreatedAt(
            data.enrollment?.createdAt ? new Date(data.enrollment.createdAt) : null
          );
          setMyReview(data.myReview ?? null);
        } else if (res.status === 404) {
          router.push("/");
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.slug, router]);

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

  const continueWatching = useMemo(() => {
    if (!course) return null;
    const all = course.modules
      .flatMap((m) =>
        m.lessons.map((l) => ({
          lesson: l,
          module: m,
          released: releaseInfo(
            enrollmentCreatedAt,
            Math.max(m.daysToRelease ?? 0, l.daysToRelease ?? 0)
          ).released,
        }))
      )
      .filter((x) => x.released);
    return all.find((x) => !x.lesson.progress?.some((p) => p.completed)) ?? null;
  }, [course, enrollmentCreatedAt]);

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
      {/* Banner */}
      {course.bannerUrl && (
        <div
          className="relative w-full mb-6 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-900 shadow-2xl shadow-black/10 dark:shadow-black/40 ring-1 ring-black/5 dark:ring-white/5"
          style={{ aspectRatio: "1125/350" }}
        >
          <Image
            src={course.bannerUrl}
            alt={course.title}
            fill
            sizes="(max-width: 1400px) 100vw, 1400px"
            className="object-cover"
            priority
          />
        </div>
      )}

      {/* Course header row */}
      <div className="mb-10 flex flex-col lg:flex-row lg:items-center gap-5 lg:gap-6 bg-gray-50 dark:bg-white/5 border border-gray-200/70 dark:border-white/5 rounded-2xl p-5 shadow-sm shadow-black/[0.02] dark:shadow-none">
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
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-gray-900 dark:text-white truncate">
              {course.title}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              {course.modules.length} módulo{course.modules.length !== 1 && "s"}
              {" · "}
              {totals.totalLessons} aula{totals.totalLessons !== 1 && "s"}
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
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow"
            >
              Comprar agora
            </a>
          )}
        </div>
      )}

      {hasAccess && continueWatching && (
        <section id="continue" className="mb-10 scroll-mt-20">
          <h2 className="text-xs font-semibold tracking-[0.14em] uppercase text-gray-400 dark:text-gray-500 mb-4 px-1">
            Continuar assistindo
          </h2>
          <Link
            href={`/course/${course.slug}/lesson/${continueWatching.lesson.id}`}
            className="group flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 dark:bg-white/5 border border-gray-200/70 dark:border-white/5 rounded-2xl shadow-sm transition-all duration-200 hover:scale-[1.01] hover:shadow-md hover:bg-white dark:hover:bg-white/[0.07]"
          >
            <div className="relative w-full sm:w-52 aspect-video rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
              {continueWatching.module.thumbnailUrl ? (
                <Image
                  src={continueWatching.module.thumbnailUrl}
                  alt={continueWatching.module.title}
                  fill
                  sizes="208px"
                  className="object-cover"
                />
              ) : course.thumbnail ? (
                <Image src={course.thumbnail} alt={course.title} fill sizes="208px" className="object-cover" />
              ) : null}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition">
                <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-wide text-blue-500 dark:text-blue-400 font-semibold">
                {continueWatching.module.title}
              </p>
              <p className="text-base font-semibold text-gray-900 dark:text-white mt-1">
                {continueWatching.lesson.title}
              </p>
              {continueWatching.lesson.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                  {continueWatching.lesson.description}
                </p>
              )}
            </div>
          </Link>
        </section>
      )}

      {groups.map((group, idx) => (
        <ModuleCarousel
          key={group.section?.id || `group-${idx}`}
          title={
            group.section?.title ??
            (groups.length > 1 ? "Módulos" : undefined)
          }
          modules={group.modules.map((m) =>
            toCarouselModule(m, course, enrollmentCreatedAt, hasAccess)
          )}
        />
      ))}

      {course.modules.length === 0 && (
        <div className="bg-gray-50 dark:bg-white/5 border border-gray-200/70 dark:border-white/5 rounded-2xl p-8 text-center">
          <p className="text-gray-500">Nenhum módulo disponível ainda.</p>
        </div>
      )}

      <section className="mb-10">
        <h2 className="text-xs font-semibold tracking-[0.14em] uppercase text-gray-400 dark:text-gray-500 mb-4 px-1">
          Sobre o curso
        </h2>
        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
          {course.description}
        </p>
      </section>

      <ReviewsSection
        courseId={course.id}
        initialAverage={course.ratingAverage}
        initialCount={course.ratingCount}
        myReview={myReview}
        canReview={hasAccess}
      />
    </div>
  );
}

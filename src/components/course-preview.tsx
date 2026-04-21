"use client";

import Link from "next/link";
import Image from "next/image";
import { ReviewsSection } from "@/components/reviews-section";
import { StarRating } from "@/components/star-rating";

export interface PreviewLesson {
  id: string;
  title: string;
  order: number;
}

export interface PreviewModule {
  id: string;
  title: string;
  order: number;
  thumbnailUrl: string | null;
  sectionId: string | null;
  lessons: PreviewLesson[];
}

export interface PreviewSection {
  id: string;
  title: string;
  order: number;
}

export interface PreviewCourse {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail: string | null;
  bannerUrl: string | null;
  checkoutUrl: string | null;
  price: number | null;
  priceCurrency: string | null;
  ratingAverage: number;
  ratingCount: number;
  certificateEnabled?: boolean;
  reviewsEnabled?: boolean;
  showStudentCount?: boolean;
  enrollmentCount?: number;
  modules: PreviewModule[];
  sections: PreviewSection[];
}

export interface PreviewMyReview {
  rating: number;
  comment: string | null;
}

function formatPrice(price: number | null, currency: string | null): string | null {
  if (price == null) return null;
  const cur = currency || "BRL";
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: cur,
      minimumFractionDigits: price % 1 === 0 ? 0 : 2,
    }).format(price);
  } catch {
    return `${cur} ${price.toFixed(2)}`;
  }
}

function groupBySection(modules: PreviewModule[], sections: PreviewSection[]) {
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);
  const sortedModules = [...modules].sort((a, b) => a.order - b.order);
  const unsectioned = sortedModules.filter((m) => !m.sectionId);
  const groups: Array<{ section: PreviewSection | null; modules: PreviewModule[] }> = [];
  if (unsectioned.length > 0) groups.push({ section: null, modules: unsectioned });
  for (const s of sortedSections) {
    groups.push({
      section: s,
      modules: sortedModules.filter((m) => m.sectionId === s.id),
    });
  }
  return groups;
}

function LockIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

export function CoursePreview({
  course,
  myReview,
}: {
  course: PreviewCourse;
  myReview: PreviewMyReview | null;
}) {
  const groups = groupBySection(course.modules, course.sections || []);
  const totalLessons = course.modules.reduce(
    (sum, m) => sum + m.lessons.length,
    0
  );
  const priceLabel = formatPrice(course.price, course.priceCurrency);

  const checkoutCta = course.checkoutUrl ? (
    <a
      href={course.checkoutUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-500 hover:to-blue-500 text-white text-[15px] font-semibold rounded-xl shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 transition-[colors,box-shadow] duration-200"
    >
      Comprar agora
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
      </svg>
    </a>
  ) : (
    <a
      href="mailto:contato@exemplo.com"
      className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[15px] font-semibold rounded-xl transition-opacity duration-200 hover:opacity-90"
    >
      Entre em contato
    </a>
  );

  return (
    <div className="relative min-h-screen pb-28 lg:pb-0">
      {/* Back link */}
      <div className="px-4 sm:px-6 lg:px-10 pt-5 max-w-[1400px] mx-auto w-full">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar à vitrine
        </Link>
      </div>

      {/* Banner */}
      {course.bannerUrl && (
        <div className="px-4 sm:px-6 lg:px-10 pt-5 max-w-[1400px] mx-auto w-full">
          <div
            className="relative w-full rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-900 shadow-2xl shadow-black/10 dark:shadow-black/40 ring-1 ring-black/5 dark:ring-white/5"
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          </div>
        </div>
      )}

      <div className="px-4 sm:px-6 lg:px-10 py-8 max-w-[1400px] mx-auto w-full grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 lg:gap-10">
        {/* Main column */}
        <div className="min-w-0">
          {/* Header */}
          <div className="mb-8 flex items-start gap-4">
            {course.thumbnail && (
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0 ring-1 ring-black/5 dark:ring-white/10 shadow-sm">
                <Image
                  src={course.thumbnail}
                  alt={course.title}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-gray-900 dark:text-white leading-tight">
                {course.title}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                {course.reviewsEnabled !== false && course.ratingCount > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <StarRating value={course.ratingAverage} size="sm" />
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {course.ratingAverage.toFixed(1)}
                    </span>
                    <span>({course.ratingCount})</span>
                  </span>
                )}
                <span>
                  {course.modules.length} módulo{course.modules.length !== 1 && "s"}
                </span>
                <span>
                  {totalLessons} aula{totalLessons !== 1 && "s"}
                </span>
                {course.showStudentCount && typeof course.enrollmentCount === "number" && course.enrollmentCount > 0 && (
                  <span>
                    {course.enrollmentCount} aluno{course.enrollmentCount !== 1 && "s"} matriculado{course.enrollmentCount !== 1 && "s"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <section className="mb-10">
            <h2 className="text-xs font-semibold tracking-[0.14em] uppercase text-gray-400 dark:text-gray-500 mb-3 px-1">
              Sobre o curso
            </h2>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed text-[15px]">
              {course.description}
            </p>
          </section>

          {/* What you'll learn */}
          <section className="mb-10">
            <h2 className="text-xs font-semibold tracking-[0.14em] uppercase text-gray-400 dark:text-gray-500 mb-4 px-1">
              O que você vai aprender
            </h2>
            <div className="space-y-3">
              {groups.map((group, idx) => (
                <div key={group.section?.id || `group-${idx}`}>
                  {group.section && (
                    <p className="text-[11px] font-semibold tracking-wider uppercase text-gray-500 mb-2 px-1">
                      {group.section.title}
                    </p>
                  )}
                  <div className="space-y-2">
                    {group.modules.map((m) => (
                      <details
                        key={m.id}
                        className="group bg-gray-50 dark:bg-white/5 border border-gray-200/70 dark:border-white/5 rounded-2xl overflow-hidden transition-colors duration-200 hover:border-gray-300 dark:hover:border-white/10 open:shadow-sm"
                      >
                        <summary className="flex items-center gap-3 p-4 cursor-pointer list-none select-none">
                          {m.thumbnailUrl ? (
                            <div className="relative w-10 h-14 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0 ring-1 ring-black/5 dark:ring-white/10">
                              <Image
                                src={m.thumbnailUrl}
                                alt={m.title}
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-14 rounded-md bg-gradient-to-br from-blue-500/20 to-blue-700/20 dark:from-blue-500/10 dark:to-blue-800/10 flex-shrink-0 flex items-center justify-center">
                              <LockIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[15px] font-semibold tracking-tight text-gray-900 dark:text-white truncate">
                              {m.title}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {m.lessons.length} aula{m.lessons.length !== 1 && "s"}
                            </p>
                          </div>
                          <LockIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                          <svg
                            className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 transition-transform duration-200 group-open:rotate-180"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </summary>
                        {m.lessons.length > 0 && (
                          <ul className="border-t border-gray-200/70 dark:border-white/5 divide-y divide-gray-200/70 dark:divide-white/5">
                            {m.lessons
                              .slice()
                              .sort((a, b) => a.order - b.order)
                              .map((l, li) => (
                                <li
                                  key={l.id}
                                  className="flex items-center gap-3 px-4 py-3 text-sm text-gray-600 dark:text-gray-400"
                                >
                                  <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-600 w-5 text-right">
                                    {li + 1}
                                  </span>
                                  <span className="flex-1 truncate">{l.title}</span>
                                  <LockIcon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-600 flex-shrink-0" />
                                </li>
                              ))}
                          </ul>
                        )}
                      </details>
                    ))}
                  </div>
                </div>
              ))}
              {course.modules.length === 0 && (
                <div className="bg-gray-50 dark:bg-white/5 border border-gray-200/70 dark:border-white/5 rounded-2xl p-8 text-center">
                  <p className="text-gray-500">
                    O conteúdo deste curso ainda está sendo preparado.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Reviews (read-only) */}
          {course.reviewsEnabled !== false && (
            <ReviewsSection
              courseId={course.id}
              initialAverage={course.ratingAverage}
              initialCount={course.ratingCount}
              myReview={myReview}
              canReview={false}
            />
          )}
        </div>

        {/* Purchase sidebar (desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-6 bg-gray-50 dark:bg-white/5 border border-gray-200/70 dark:border-white/5 rounded-2xl p-5 shadow-sm">
            {course.thumbnail && (
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-4 ring-1 ring-black/5 dark:ring-white/10">
                <Image
                  src={course.thumbnail}
                  alt={course.title}
                  fill
                  sizes="360px"
                  className="object-cover"
                />
              </div>
            )}
            <div className="mb-5">
              {priceLabel ? (
                <>
                  <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-gray-400 dark:text-gray-500">
                    Investimento
                  </p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                    {priceLabel}
                  </p>
                </>
              ) : (
                <p className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
                  Consulte
                </p>
              )}
            </div>
            {checkoutCta}
            <ul className="mt-5 space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Acesso imediato após a compra
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {course.modules.length} módulo{course.modules.length !== 1 && "s"} ·{" "}
                {totalLessons} aula{totalLessons !== 1 && "s"}
              </li>
              {course.certificateEnabled !== false && (
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Certificado de conclusão
                </li>
              )}
            </ul>
          </div>
        </aside>
      </div>

      {/* Mobile fixed footer CTA */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl border-t border-gray-200/70 dark:border-white/5 px-4 py-3">
        <div className="flex items-center gap-3 max-w-[600px] mx-auto">
          <div className="flex-1 min-w-0">
            {priceLabel ? (
              <>
                <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400 dark:text-gray-500 leading-none">
                  Investimento
                </p>
                <p className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white mt-0.5 truncate">
                  {priceLabel}
                </p>
              </>
            ) : (
              <p className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white truncate">
                Consulte
              </p>
            )}
          </div>
          <div className="flex-shrink-0">
            {course.checkoutUrl ? (
              <a
                href={course.checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-b from-blue-500 to-blue-600 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-600/20"
              >
                Comprar agora
              </a>
            ) : (
              <a
                href="mailto:contato@exemplo.com"
                className="inline-flex items-center gap-2 px-5 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold rounded-xl"
              >
                Contato
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

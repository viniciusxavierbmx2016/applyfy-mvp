"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ProgressBar } from "@/components/progress-bar";
import { ReviewsSection } from "@/components/reviews-section";
import { StarRating } from "@/components/star-rating";
import { calculateCourseProgress } from "@/lib/utils";

interface LessonItem {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string;
  duration: number | null;
  order: number;
  progress: Array<{ completed: boolean }>;
}

interface ModuleItem {
  id: string;
  title: string;
  order: number;
  lessons: LessonItem[];
}

interface CourseDetail {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail: string | null;
  checkoutUrl: string | null;
  hasCertificate?: boolean;
  ratingAverage: number;
  ratingCount: number;
  modules: ModuleItem[];
}

interface MyReview {
  rating: number;
  comment: string | null;
}

export default function CourseDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [myReview, setMyReview] = useState<MyReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/courses/by-slug/${params.slug}`);
        if (res.ok) {
          const data = await res.json();
          setCourse(data.course);
          setHasAccess(data.hasAccess);
          setMyReview(data.myReview ?? null);
          if (data.course?.modules?.[0]) {
            setOpenModules(new Set([data.course.modules[0].id]));
          }
        } else if (res.status === 404) {
          router.push("/");
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.slug, router]);

  function toggleModule(id: string) {
    setOpenModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400">Curso não encontrado</p>
      </div>
    );
  }

  // === LOCKED VIEW (no access) ===
  if (!hasAccess) {
    return (
      <div className="max-w-5xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-6"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar para vitrine
        </Link>

        {/* Hero */}
        <div className="relative aspect-video max-h-[400px] bg-gray-900 rounded-2xl overflow-hidden mb-8 border border-gray-800">
          {course.thumbnail ? (
            <Image
              src={course.thumbnail}
              alt={course.title}
              fill
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-16 h-16 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-full text-xs text-white font-medium mb-3">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Acesso bloqueado
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-white">
              {course.title}
            </h1>
            {course.ratingCount > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <StarRating value={course.ratingAverage} size="sm" />
                <span className="text-sm text-white font-medium">
                  {course.ratingAverage.toFixed(1)}
                </span>
                <span className="text-xs text-gray-300">
                  ({course.ratingCount} avaliaç{course.ratingCount === 1 ? "ão" : "ões"})
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold text-white mb-3">
              Sobre o curso
            </h2>
            <p className="text-gray-300 whitespace-pre-line leading-relaxed">
              {course.description}
            </p>

            {course.modules.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold text-white mb-3">
                  Conteúdo do curso
                </h2>
                <p className="text-sm text-gray-400 mb-4">
                  {course.modules.length} módulo{course.modules.length !== 1 && "s"} •{" "}
                  {course.modules.reduce((sum, m) => sum + m.lessons.length, 0)}{" "}
                  aulas
                </p>
                <div className="space-y-2">
                  {course.modules.map((m, i) => (
                    <div
                      key={m.id}
                      className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center gap-3 opacity-70"
                    >
                      <span className="text-xs text-gray-500 w-6">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="flex-1">
                        <p className="text-white font-medium text-sm">
                          {m.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {m.lessons.length} aula
                          {m.lessons.length !== 1 && "s"}
                        </p>
                      </div>
                      <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <ReviewsSection
              courseId={course.id}
              initialAverage={course.ratingAverage}
              initialCount={course.ratingCount}
              myReview={null}
              canReview={false}
            />
          </div>

          {/* CTA de compra */}
          <div className="lg:sticky lg:top-20 h-fit">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-2">
                Libere o acesso
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Adquira o curso para assistir às aulas e participar da comunidade.
              </p>

              {course.checkoutUrl ? (
                <a
                  href={course.checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
                >
                  Comprar agora
                </a>
              ) : (
                <div className="text-center py-3 px-4 bg-gray-800 text-gray-400 text-sm rounded-lg">
                  Em breve
                </div>
              )}

              <ul className="mt-5 space-y-2.5 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Acesso vitalício
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Comunidade exclusiva
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Suporte nas aulas
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // === ENROLLED VIEW ===
  const progress = calculateCourseProgress(course);
  const allLessons = course.modules.flatMap((m) => m.lessons);
  const firstIncomplete = allLessons.find(
    (l) => !l.progress?.some((p) => p.completed)
  );

  return (
    <div className="max-w-5xl mx-auto">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-6"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Voltar para vitrine
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        {course.thumbnail && (
          <div className="md:w-80 flex-shrink-0">
            <div className="relative aspect-video bg-gray-800 rounded-xl overflow-hidden border border-gray-800">
              <Image
                src={course.thumbnail}
                alt={course.title}
                fill
                sizes="(max-width: 768px) 100vw, 320px"
                className="object-cover"
              />
            </div>
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">
            {course.title}
          </h1>
          <p className="text-gray-400 mb-4 line-clamp-3">{course.description}</p>

          <div className="mb-4">
            <ProgressBar value={progress} showLabel />
          </div>

          <div className="flex flex-wrap gap-2">
            {firstIncomplete && (
              <Link
                href={`/course/${course.slug}/lesson/${firstIncomplete.id}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                {progress > 0 ? "Continuar de onde parei" : "Começar curso"}
              </Link>
            )}
            <Link
              href={`/course/${course.slug}/community`}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
              Comunidade
            </Link>
          </div>
        </div>
      </div>

      {/* Certificado — visível ao concluir 100% */}
      {progress >= 100 && course.hasCertificate !== false && (
        <div className="mb-8 bg-gradient-to-r from-blue-600/20 to-blue-500/10 border border-blue-500/30 rounded-xl p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-6 h-6 text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white">
                Parabéns! Você concluiu este curso
              </h3>
              <p className="text-sm text-gray-300">
                Baixe seu certificado oficial em PDF.
              </p>
            </div>
            <a
              href={`/api/certificates/${course.id}`}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"
                />
              </svg>
              Baixar Certificado
            </a>
          </div>
        </div>
      )}

      {/* Conteúdo em accordion */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">
          Conteúdo do curso
        </h2>
        {course.modules.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
            <p className="text-gray-500">Nenhum módulo disponível ainda.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {course.modules.map((module, moduleIdx) => {
              const isOpen = openModules.has(module.id);
              const completedCount = module.lessons.filter((l) =>
                l.progress?.some((p) => p.completed)
              ).length;

              return (
                <div
                  key={module.id}
                  className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => toggleModule(module.id)}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-800/50 transition"
                  >
                    <span className="text-xs text-gray-500 w-6">
                      {String(moduleIdx + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1">
                      <p className="text-white font-medium">{module.title}</p>
                      <p className="text-xs text-gray-500">
                        {completedCount}/{module.lessons.length} aulas concluídas
                      </p>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-500 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-800">
                      {module.lessons.length === 0 ? (
                        <p className="text-sm text-gray-500 p-4">
                          Nenhuma aula neste módulo.
                        </p>
                      ) : (
                        <ul className="divide-y divide-gray-800">
                          {module.lessons.map((lesson, lessonIdx) => {
                            const isCompleted = lesson.progress?.some(
                              (p) => p.completed
                            );
                            return (
                              <li key={lesson.id}>
                                <Link
                                  href={`/course/${course.slug}/lesson/${lesson.id}`}
                                  className="flex items-center gap-3 p-4 hover:bg-gray-800/50 transition"
                                >
                                  <div
                                    className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                                      isCompleted
                                        ? "bg-green-500/20 text-green-400"
                                        : "bg-gray-800 text-gray-500"
                                    }`}
                                  >
                                    {isCompleted ? (
                                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    ) : (
                                      <span className="text-xs">
                                        {lessonIdx + 1}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p
                                      className={`text-sm font-medium truncate ${
                                        isCompleted
                                          ? "text-gray-400"
                                          : "text-white"
                                      }`}
                                    >
                                      {lesson.title}
                                    </p>
                                  </div>
                                  {lesson.duration && (
                                    <span className="text-xs text-gray-500">
                                      {lesson.duration}min
                                    </span>
                                  )}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ReviewsSection
        courseId={course.id}
        initialAverage={course.ratingAverage}
        initialCount={course.ratingCount}
        myReview={myReview}
        canReview
      />
    </div>
  );
}

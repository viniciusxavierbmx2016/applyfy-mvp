"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { calculateCourseProgress } from "@/lib/utils";
import { useUserStore } from "@/stores/user-store";

interface EnrolledCourse {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail: string | null;
  checkoutUrl: string | null;
  ratingAverage?: number;
  ratingCount?: number;
  isExpired?: boolean;
  expiresAt?: string | null;
  canManage?: boolean;
  modules: Array<{
    title: string;
    thumbnailUrl?: string | null;
    lessons: Array<{
      id: string;
      title: string;
      progress: Array<{ completed: boolean }>;
    }>;
  }>;
}

interface StoreCourse {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail: string | null;
  checkoutUrl: string | null;
  ratingAverage?: number;
  ratingCount?: number;
  canManage?: boolean;
}

function getContinueWatching(courses: EnrolledCourse[]) {
  for (const course of courses) {
    for (const mod of course.modules) {
      for (const lesson of mod.lessons) {
        if (!lesson.progress?.some((p) => p.completed)) {
          return { course, module: mod, lesson };
        }
      }
    }
  }
  if (courses.length > 0) {
    const c = courses[0];
    const m = c.modules[0];
    const l = m?.lessons[0];
    if (l) return { course: c, module: m, lesson: l };
  }
  return null;
}

export default function WorkspaceVitrinePage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params.slug;
  const { user, isLoading: userLoading } = useUserStore();
  const [enrolled, setEnrolled] = useState<EnrolledCourse[]>([]);
  const [store, setStore] = useState<StoreCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [suspended, setSuspended] = useState(false);

  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      router.replace(`/w/${slug}/login`);
      return;
    }
    async function load() {
      try {
        const res = await fetch(`/api/w/${slug}/init`);
        if (res.status === 403) {
          await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
          router.replace(
            `/w/${slug}/login?error=${encodeURIComponent("Você não tem acesso a esta área de membros")}`
          );
          return;
        }
        if (res.status === 503) {
          const data = await res.json().catch(() => ({}));
          if (data.suspended) {
            setSuspended(true);
            return;
          }
        }
        if (res.ok) {
          const data = await res.json();
          setEnrolled(data.enrolled || []);
          setStore(data.store || []);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, userLoading, slug, router]);

  const active = enrolled.filter((c) => !c.isExpired);
  const expired = enrolled.filter((c) => c.isExpired);
  const continueItem = useMemo(() => getContinueWatching(active), [active]);
  const firstName = user?.name?.split(" ")[0] || "aluno";

  if (suspended) {
    return (
      <div className="membership-area min-h-screen flex items-center justify-center bg-[var(--ground-0)] px-4">
        <div className="text-center max-w-md">
          <div className="mx-auto w-16 h-16 rounded-full bg-[var(--ground-2)] flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-[var(--ink-3)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--ink-1)] mb-2" style={{ fontFamily: "var(--font-display)" }}>
            Área temporariamente indisponível
          </h1>
          <p className="text-[var(--ink-2)]">
            O administrador desta área de membros está com o acesso suspenso. Por favor, entre em contato com o responsável.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="membership-area px-4 sm:px-6 lg:px-8 py-8 lg:py-12 max-w-6xl mx-auto space-y-12">
      {/* Hero de boas-vindas */}
      <section>
        <h2
          className="text-4xl md:text-5xl font-bold tracking-tight text-[var(--ink-1)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Olá, {firstName}
        </h2>
        <p className="text-lg text-[var(--ink-2)] mt-2">
          Bora continuar de onde parou
        </p>
      </section>

      {userLoading || loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Continuar assistindo */}
          {continueItem && (
            <section>
              <h3
                className="text-xl font-bold text-[var(--ink-1)] mb-4"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Continuar assistindo
              </h3>
              <Link
                href={`/course/${continueItem.course.slug}/lesson/${continueItem.lesson.id}`}
                className="group relative flex flex-col sm:flex-row gap-5 bg-[var(--ground-2)] border border-[var(--ground-3)] rounded-[var(--r-lg)] overflow-hidden transition-[border-color] duration-[var(--dur)] ease-[var(--ease)] hover:border-[var(--brand)]"
              >
                <div className="relative w-full sm:w-80 aspect-video bg-[var(--ground-1)] flex-shrink-0 overflow-hidden">
                  {(continueItem.module.thumbnailUrl || continueItem.course.thumbnail) && (
                    <Image
                      src={(continueItem.module.thumbnailUrl || continueItem.course.thumbnail)!}
                      alt={continueItem.module.title}
                      fill
                      sizes="320px"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors duration-300">
                    <div className="w-14 h-14 rounded-full bg-[var(--brand)] flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-[0_0_24px_var(--brand-glow)]">
                      <svg className="w-7 h-7 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center p-5 sm:pr-6 sm:pl-0">
                  <p className="text-xs uppercase tracking-widest text-[var(--brand)] font-semibold">
                    {continueItem.module.title}
                  </p>
                  <p
                    className="text-2xl font-bold text-[var(--ink-1)] mt-1.5 line-clamp-2"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {continueItem.lesson.title}
                  </p>
                  {(() => {
                    const pct = calculateCourseProgress(continueItem.course);
                    return (
                      <div className="mt-4">
                        <div className="h-1 bg-[var(--ground-3)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[var(--brand)] rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-xs text-[var(--ink-3)] mt-1.5">{pct}% do curso concluído</p>
                      </div>
                    );
                  })()}
                  <span className="mt-4 inline-flex items-center gap-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white rounded-[var(--r-md)] px-6 py-3 text-base font-medium w-fit transition-colors duration-[var(--dur-fast)] shadow-[0_0_16px_var(--brand-glow)]">
                    Continuar
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </Link>
            </section>
          )}

          {/* Meus cursos */}
          <section>
            <h3
              className="text-xl font-bold text-[var(--ink-1)] mb-6"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Seus cursos
            </h3>
            {active.length === 0 ? (
              <div className="bg-[var(--ground-2)] border border-[var(--ground-3)] rounded-[var(--r-lg)] p-8 text-center">
                <p className="text-[var(--ink-3)]">
                  Você ainda não está matriculado em nenhum curso ativo
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {active.map((course) => {
                  const pct = calculateCourseProgress(course);
                  const totalLessons = course.modules.reduce((a, m) => a + m.lessons.length, 0);
                  const doneLessons = course.modules.reduce(
                    (a, m) => a + m.lessons.filter((l) => l.progress?.some((p) => p.completed)).length,
                    0
                  );
                  return (
                    <Link
                      key={course.id}
                      href={`/course/${course.slug}`}
                      className="group block bg-[var(--ground-2)] border border-[var(--ground-3)] rounded-[var(--r-lg)] overflow-hidden transition-[border-color] duration-[var(--dur)] ease-[var(--ease)] hover:border-[var(--brand)]"
                    >
                      <div className="relative aspect-video bg-[var(--ground-1)] overflow-hidden">
                        {course.thumbnail ? (
                          <Image
                            src={course.thumbnail}
                            alt={course.title}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-12 h-12 text-[var(--ink-disabled)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h4 className="text-base font-semibold text-[var(--ink-1)] line-clamp-1">
                          {course.title}
                        </h4>
                        <div className="mt-3">
                          <div className="h-1 bg-[var(--ground-3)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[var(--brand)] rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-sm text-[var(--ink-3)] mt-1.5">
                            {doneLessons} de {totalLessons} aulas
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* Acesso expirado */}
          {expired.length > 0 && (
            <section>
              <h3
                className="text-xl font-bold text-[var(--ink-1)] mb-1"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Acesso expirado
              </h3>
              <p className="text-sm text-[var(--ink-3)] mb-6">
                Renove para continuar assistindo a estes cursos.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {expired.map((course) => (
                  <div
                    key={course.id}
                    className="bg-[var(--ground-2)] border border-[var(--ground-3)] rounded-[var(--r-lg)] overflow-hidden opacity-70"
                  >
                    <div className="relative aspect-video bg-[var(--ground-1)] overflow-hidden grayscale-[0.4]">
                      {course.thumbnail && (
                        <Image
                          src={course.thumbnail}
                          alt={course.title}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover"
                        />
                      )}
                      <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-[var(--signal-hot)] rounded-full text-xs text-white font-medium">
                        Expirado
                      </div>
                    </div>
                    <div className="p-4">
                      <h4 className="text-base font-semibold text-[var(--ink-1)] line-clamp-1 mb-2">
                        {course.title}
                      </h4>
                      {course.checkoutUrl && (
                        <a
                          href={course.checkoutUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-full px-3 py-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-sm font-medium rounded-[var(--r-md)] transition-colors duration-[var(--dur-fast)]"
                        >
                          Renovar acesso
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Outros cursos (loja) */}
          {store.length > 0 && (
            <section>
              <h3
                className="text-xl font-bold text-[var(--ink-1)] mb-6"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Outros cursos
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {store.map((course) => (
                  <Link
                    key={course.id}
                    href={`/course/${course.slug}`}
                    className="group block bg-[var(--ground-2)] border border-[var(--ground-3)] rounded-[var(--r-lg)] overflow-hidden transition-[border-color] duration-[var(--dur)] ease-[var(--ease)] hover:border-[var(--brand)]"
                  >
                    <div className="relative aspect-video bg-[var(--ground-1)] overflow-hidden">
                      {course.thumbnail ? (
                        <Image
                          src={course.thumbnail}
                          alt={course.title}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-12 h-12 text-[var(--ink-disabled)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h4 className="text-base font-semibold text-[var(--ink-1)] line-clamp-1 mb-1">
                        {course.title}
                      </h4>
                      <p className="text-sm text-[var(--ink-3)] line-clamp-2">
                        {course.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

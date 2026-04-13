"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  duration: number | null;
  order: number;
  daysToRelease: number;
  progress: Array<{ completed: boolean }>;
}

interface ModuleItem {
  id: string;
  title: string;
  daysToRelease: number;
  thumbnailUrl: string | null;
  lessons: Lesson[];
}

interface CourseDetail {
  id: string;
  slug: string;
  title: string;
  modules: ModuleItem[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
function isReleased(base: Date | null, days: number) {
  const baseMs = base ? new Date(base).getTime() : Date.now();
  return baseMs + Math.max(0, days) * MS_PER_DAY <= Date.now();
}
function releaseDate(base: Date | null, days: number) {
  const baseMs = base ? new Date(base).getTime() : Date.now();
  return new Date(baseMs + Math.max(0, days) * MS_PER_DAY);
}

export default function ModuleDetailPage() {
  const params = useParams<{ slug: string; moduleId: string }>();
  const router = useRouter();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [enrollmentCreatedAt, setEnrollmentCreatedAt] = useState<Date | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
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
        } else {
          router.replace("/");
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.slug, router]);

  const mod = useMemo(
    () => course?.modules.find((m) => m.id === params.moduleId) ?? null,
    [course, params.moduleId]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!course || !mod) {
    return (
      <div className="text-center py-16 px-4">
        <p className="text-gray-600 dark:text-gray-400">Módulo não encontrado</p>
        <Link
          href={`/course/${params.slug}`}
          className="inline-block mt-4 text-blue-500 hover:text-blue-400"
        >
          Voltar ao curso
        </Link>
      </div>
    );
  }

  const modReleased = isReleased(enrollmentCreatedAt, mod.daysToRelease ?? 0);
  const modReleaseAt = releaseDate(enrollmentCreatedAt, mod.daysToRelease ?? 0);

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-[1200px] mx-auto w-full">
      <Link
        href={`/course/${course.slug}`}
        className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Voltar ao curso
      </Link>

      <div className="flex flex-col sm:flex-row gap-5 mb-8">
        {mod.thumbnailUrl && (
          <div className="relative w-full sm:w-48 aspect-[4/5] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
            <Image
              src={mod.thumbnailUrl}
              alt={mod.title}
              fill
              sizes="192px"
              className="object-cover"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
            {course.title}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mt-1">
            {mod.title}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {mod.lessons.length} aula{mod.lessons.length !== 1 && "s"}
          </p>
        </div>
      </div>

      {hasAccess && !modReleased && (
        <div className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-700 dark:text-yellow-400 text-sm">
          Este módulo libera em{" "}
          {modReleaseAt.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
        </div>
      )}

      <ul className="space-y-2">
        {mod.lessons.map((lesson, idx) => {
          const released = isReleased(
            enrollmentCreatedAt,
            Math.max(mod.daysToRelease ?? 0, lesson.daysToRelease ?? 0)
          );
          const lessonRelAt = releaseDate(
            enrollmentCreatedAt,
            Math.max(mod.daysToRelease ?? 0, lesson.daysToRelease ?? 0)
          );
          const completed = lesson.progress?.some((p) => p.completed);
          const locked = hasAccess && !released;

          if (locked) {
            return (
              <li
                key={lesson.id}
                className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl opacity-60"
              >
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                    {lesson.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Disponível em{" "}
                    {lessonRelAt.toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </li>
            );
          }

          return (
            <li key={lesson.id}>
              <Link
                href={`/course/${course.slug}/lesson/${lesson.id}`}
                className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-blue-500/50 rounded-xl transition group"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    completed
                      ? "bg-green-500/20 text-green-500"
                      : "bg-blue-600/10 text-blue-500 dark:text-blue-400"
                  }`}
                >
                  {completed ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-xs font-bold">{idx + 1}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {lesson.title}
                  </p>
                  {lesson.description && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                      {lesson.description}
                    </p>
                  )}
                </div>
                {lesson.duration && (
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {lesson.duration}min
                  </span>
                )}
                <svg
                  className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </li>
          );
        })}
      </ul>

      {mod.lessons.length === 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-500">Nenhuma aula neste módulo.</p>
        </div>
      )}
    </div>
  );
}

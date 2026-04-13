"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUserStore } from "@/stores/user-store";
import { CourseCard } from "@/components/course-card";
import { calculateCourseProgress } from "@/lib/utils";

interface EnrolledCourse {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail: string | null;
  ratingAverage?: number;
  ratingCount?: number;
  isExpired?: boolean;
  modules: Array<{
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
}

interface ContinueWatching {
  courseSlug: string;
  courseTitle: string;
  thumbnail: string | null;
  lessonId: string;
  lessonTitle: string;
  progress: number;
}

interface ProducerCourse {
  id: string;
  title: string;
  slug: string;
  thumbnail: string | null;
  _count?: { enrollments: number; modules: number };
}

export default function HomePage() {
  const { user, isLoading: userLoading } = useUserStore();

  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user?.role === "PRODUCER") {
    return <ProducerHome firstName={user.name?.split(" ")[0] || "produtor"} />;
  }

  return <StudentHome firstName={user?.name?.split(" ")[0] || "aluno"} />;
}

function StudentHome({ firstName }: { firstName: string }) {
  const [enrolled, setEnrolled] = useState<EnrolledCourse[]>([]);
  const [store, setStore] = useState<StoreCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/courses");
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
  }, []);

  const continueWatching: ContinueWatching | null = (() => {
    const inProgress = enrolled
      .map((c) => ({ course: c, progress: calculateCourseProgress(c) }))
      .filter(({ progress }) => progress > 0 && progress < 100)
      .sort((a, b) => b.progress - a.progress);

    for (const { course, progress } of inProgress) {
      for (const mod of course.modules) {
        for (const lesson of mod.lessons) {
          const isCompleted = lesson.progress?.some((p) => p.completed);
          if (!isCompleted) {
            return {
              courseSlug: course.slug,
              courseTitle: course.title,
              thumbnail: course.thumbnail,
              lessonId: lesson.id,
              lessonTitle: lesson.title,
              progress,
            };
          }
        }
      }
    }
    return null;
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">
        Olá, {firstName} 👋
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">Bem-vindo à sua área de membros</p>

      {continueWatching && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Continue assistindo
          </h2>
          <Link
            href={`/course/${continueWatching.courseSlug}/lesson/${continueWatching.lessonId}`}
            className="group flex flex-col sm:flex-row gap-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-700 rounded-xl overflow-hidden transition"
          >
            <div className="relative aspect-video sm:w-64 sm:flex-shrink-0 bg-gray-100 dark:bg-gray-800 overflow-hidden">
              {continueWatching.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={continueWatching.thumbnail}
                  alt={continueWatching.courseTitle}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 9v6l5-3-5-3z" />
                  </svg>
                </div>
              )}
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-900 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="flex-1 p-4 sm:p-6 flex flex-col justify-center">
              <p className="text-sm text-blue-400 font-medium mb-1">
                {continueWatching.courseTitle}
              </p>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {continueWatching.lessonTitle}
              </h3>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${continueWatching.progress}%` }}
                  />
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {Math.round(continueWatching.progress)}%
                </span>
              </div>
            </div>
          </Link>
        </section>
      )}

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Meus cursos</h2>
        {enrolled.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center">
            <p className="text-gray-500">
              Você ainda não está matriculado em nenhum curso
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {enrolled.map((course) => (
              <CourseCard
                key={course.id}
                slug={course.slug}
                title={course.title}
                description={course.description}
                thumbnail={course.thumbnail}
                progress={calculateCourseProgress(course)}
                ratingAverage={course.ratingAverage}
                ratingCount={course.ratingCount}
                expired={course.isExpired}
              />
            ))}
          </div>
        )}
      </section>

      {store.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Outros cursos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {store.map((course) => (
              <CourseCard
                key={course.id}
                slug={course.slug}
                title={course.title}
                description={course.description}
                thumbnail={course.thumbnail}
                checkoutUrl={course.checkoutUrl}
                ratingAverage={course.ratingAverage}
                ratingCount={course.ratingCount}
                locked
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ProducerHome({ firstName }: { firstName: string }) {
  const [loading, setLoading] = useState(true);
  const [hasWorkspace, setHasWorkspace] = useState(false);
  const [courses, setCourses] = useState<ProducerCourse[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const wsRes = await fetch("/api/workspaces");
        const wsData = wsRes.ok ? await wsRes.json() : { workspaces: [] };
        const hasWs = (wsData.workspaces?.length ?? 0) > 0;
        setHasWorkspace(hasWs);
        if (hasWs) {
          const cRes = await fetch("/api/courses?filter=all");
          if (cRes.ok) {
            const cData = await cRes.json();
            setCourses(cData.courses || []);
          }
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasWorkspace) {
    return (
      <div className="max-w-2xl mx-auto pt-8 lg:pt-16">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 sm:p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-blue-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
            Olá, {firstName} 👋
          </h1>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 mb-8">
            Crie seu primeiro workspace para começar a montar sua área de membros.
          </p>
          <Link
            href="/admin/workspaces"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
          >
            Criar workspace
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="max-w-2xl mx-auto pt-8 lg:pt-16">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 sm:p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
            Olá, {firstName} 👋
          </h1>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 mb-8">
            Seu workspace está pronto. Agora crie seu primeiro curso.
          </p>
          <Link
            href="/admin/courses"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
          >
            Criar curso
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    );
  }

  const totalStudents = courses.reduce(
    (s, c) => s + (c._count?.enrollments ?? 0),
    0
  );
  const totalCourses = courses.length;

  return (
    <div>
      <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">
        Olá, {firstName} 👋
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Resumo do seu workspace
      </p>

      <div className="grid grid-cols-2 gap-4 mb-10">
        <StatCard label="Cursos" value={totalCourses} accent="text-blue-500 dark:text-blue-400" />
        <StatCard label="Alunos totais" value={totalStudents} accent="text-emerald-500 dark:text-emerald-400" />
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Seus cursos
          </h2>
          <Link
            href="/admin/courses"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Gerenciar
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((c) => (
            <Link
              key={c.id}
              href={`/admin/courses/${c.id}`}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-700 rounded-xl overflow-hidden transition group"
            >
              <div className="aspect-video bg-gray-100 dark:bg-gray-800 overflow-hidden">
                {c.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.thumbnail}
                    alt={c.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {c.title}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {c._count?.enrollments ?? 0} alunos · {c._count?.modules ?? 0} módulos
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}

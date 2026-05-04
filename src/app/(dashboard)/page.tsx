"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

export default function HomePage() {
  const { user, workspace, collaborator, isLoading: userLoading } = useUserStore();
  const router = useRouter();

  useEffect(() => {
    if (userLoading || !user) return;
    if (user.role === "ADMIN") {
      router.replace("/admin");
      return;
    }
    // C6: STUDENT with Collaborator row goes to /producer.
    if (
      user.role === "PRODUCER" ||
      user.role === "COLLABORATOR" ||
      (user.role === "STUDENT" && !!collaborator)
    ) {
      router.replace("/producer");
      return;
    }
    if (user.role === "STUDENT") {
      if (workspace?.slug) {
        router.replace(`/w/${workspace.slug}`);
      } else {
        fetch("/api/student/workspace")
          .then((r) => r.ok ? r.json() : null)
          .then((d) => {
            if (d?.slug) router.replace(`/w/${d.slug}`);
            else router.replace("/login?error=sem-workspace");
          })
          .catch(() => router.replace("/login?error=sem-workspace"));
      }
    }
  }, [user, workspace, userLoading, router]);

  if (userLoading || !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user.role !== "STUDENT" || workspace?.slug) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <StudentHome firstName={user.name?.split(" ")[0] || "aluno"} />;
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


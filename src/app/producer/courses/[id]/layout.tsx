"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import { CourseEditTabs, type CourseEditTab } from "@/components/course-edit-tabs";

interface CourseHeader {
  id: string;
  title: string;
  slug: string;
  isPublished: boolean;
}

function CourseLayoutInner({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [course, setCourse] = useState<CourseHeader | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/courses/${params.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.course) {
          setCourse({
            id: d.course.id,
            title: d.course.title,
            slug: d.course.slug,
            isPublished: d.course.isPublished,
          });
        }
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  function getActiveTab(): CourseEditTab {
    if (pathname.endsWith("/students")) return "students";
    if (pathname.endsWith("/comments")) return "comments";
    if (pathname.endsWith("/customize")) return "customize";
    if (pathname.endsWith("/edit") || pathname.includes("/edit")) {
      if (searchParams.get("tab") === "content") return "content";
      return "info";
    }
    return "info";
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="space-y-3 mb-6">
          <div className="h-4 w-16 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          <div className="h-7 w-64 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        </div>
        <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-6xl mx-auto text-center py-16">
        <p className="text-gray-600 dark:text-gray-400">Curso não encontrado</p>
        <Link
          href="/producer/courses"
          className="inline-block mt-4 text-blue-400 hover:text-blue-300"
        >
          Voltar para cursos
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-1">
        <Link
          href="/producer/courses"
          className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-0.5">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
          {course.title}
        </h1>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
            course.isPublished
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
          }`}
        >
          {course.isPublished ? "Publicado" : "Rascunho"}
        </span>
        <a
          href={`/course/${course.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-white/[0.08] rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Pré-visualizar
        </a>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
        /course/{course.slug}
      </p>

      <CourseEditTabs courseId={course.id} active={getActiveTab()} />

      <div className="mt-6">{children}</div>
    </div>
  );
}

export default function CourseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto">
          <div className="space-y-3 mb-6">
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            <div className="h-7 w-64 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          </div>
          <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        </div>
      }
    >
      <CourseLayoutInner>{children}</CourseLayoutInner>
    </Suspense>
  );
}

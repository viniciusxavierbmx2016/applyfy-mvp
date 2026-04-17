"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserStore } from "@/stores/user-store";
import {
  DateRangeSelector,
  computeRange,
  type DateRangeValue,
} from "@/components/date-range-selector";
import { PERMISSION_LABELS } from "@/lib/collaborator";

const AnalyticsOverview = dynamic(
  () =>
    import("@/components/analytics-overview").then(
      (m) => m.AnalyticsOverview
    ),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    ),
  }
);

interface CourseOption {
  id: string;
  title: string;
}

interface CollabCourse {
  id: string;
  title: string;
  slug: string;
  thumbnail: string | null;
  _count: { modules: number; enrollments: number };
}

export default function ProducerDashboardPage() {
  const { user, collaborator } = useUserStore();
  const router = useRouter();
  const [courseId, setCourseId] = useState<string>("all");
  const [range, setRange] = useState<DateRangeValue>(() =>
    computeRange("last_30_days")
  );
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [collabCourses, setCollabCourses] = useState<CollabCourse[]>([]);
  const [collabLoading, setCollabLoading] = useState(true);

  const perms = collaborator?.permissions ?? [];
  const hasAnalytics =
    user?.role !== "COLLABORATOR" || perms.includes("VIEW_ANALYTICS");

  useEffect(() => {
    if (!user) return;
    if (user.role === "ADMIN") {
      router.replace("/admin");
      return;
    }
    if (user.role === "STUDENT") {
      router.replace("/");
      return;
    }

    if (hasAnalytics) {
      fetch("/api/producer/analytics?tab=overview&window=7")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && Array.isArray(d.courses) && setCourses(d.courses))
        .catch(() => {});
    } else {
      fetch("/api/courses?filter=all")
        .then((r) => (r.ok ? r.json() : { courses: [] }))
        .then((d) => setCollabCourses(d.courses || []))
        .catch(() => {})
        .finally(() => setCollabLoading(false));
    }
  }, [user, router, hasAnalytics]);

  if (!user || user.role === "ADMIN" || user.role === "STUDENT") {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (!hasAnalytics) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Seus cursos e atividades
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Suas permissões
          </p>
          <div className="flex flex-wrap gap-2">
            {perms.map((p) => (
              <span
                key={p}
                className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400"
              >
                {PERMISSION_LABELS[p as keyof typeof PERMISSION_LABELS] ?? p}
              </span>
            ))}
          </div>
        </div>

        {collabLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-3">
                <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : collabCourses.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center">
            <p className="text-gray-500 text-sm">
              Nenhum curso atribuído a você.
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Seus cursos
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {collabCourses.map((c) => (
                <Link
                  key={c.id}
                  href={`/producer/courses/${c.id}/edit`}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:border-gray-400 dark:hover:border-gray-600 transition group"
                >
                  <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {c.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {c._count.modules} módulos · {c._count.enrollments} alunos
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Visão geral do seu workspace
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[180px]"
          >
            <option value="all">Todos os cursos</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          <DateRangeSelector value={range} onChange={setRange} />
        </div>
      </div>

      <AnalyticsOverview
        courseId={courseId}
        startDate={range.startDate}
        endDate={range.endDate}
        rangeLabel={range.label}
      />
    </div>
  );
}

"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserStore } from "@/stores/user-store";
import {
  DateRangeSelector,
  computeRange,
  type DateRangeValue,
} from "@/components/date-range-selector";

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

export default function ProducerDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardSkeleton() {
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

function DashboardContent() {
  const { user, collaborator } = useUserStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [courseId, setCourseId] = useState<string>("all");
  const [range, setRange] = useState<DateRangeValue>(() =>
    computeRange("last_30_days")
  );
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [showWelcome, setShowWelcome] = useState(false);

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

    if (!hasAnalytics) {
      router.replace("/producer/courses");
      return;
    }

    fetch("/api/producer/analytics?tab=overview&window=7")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && Array.isArray(d.courses) && setCourses(d.courses))
      .catch(() => {});
  }, [user, router, hasAnalytics]);

  useEffect(() => {
    if (searchParams.get("welcome") === "true") {
      setShowWelcome(true);
      window.history.replaceState({}, "", "/producer");
    }
  }, [searchParams]);

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

  return (
    <div className="space-y-6">
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-md w-full mx-4 text-center space-y-4 border border-gray-200 dark:border-gray-800 shadow-2xl">
            <div className="mx-auto w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center text-3xl">
              <svg className="w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Bem-vindo(a) ao Members Club!
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Sua assinatura está ativa. Agora você pode criar workspaces, cursos e muito mais.
            </p>
            <button
              onClick={() => setShowWelcome(false)}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition"
            >
              Começar agora
            </button>
          </div>
        </div>
      )}

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
            className="bg-white dark:bg-white/[0.04] border border-gray-300 dark:border-white/[0.08] rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-gray-300 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 min-w-[180px] transition-all duration-200"
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

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  const { user } = useUserStore();
  const router = useRouter();
  const [courseId, setCourseId] = useState<string>("all");
  const [range, setRange] = useState<DateRangeValue>(() =>
    computeRange("last_30_days")
  );
  const [courses, setCourses] = useState<CourseOption[]>([]);

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
    fetch("/api/producer/analytics?tab=overview&window=7")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && Array.isArray(d.courses) && setCourses(d.courses))
      .catch(() => {});
  }, [user, router]);

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
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
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

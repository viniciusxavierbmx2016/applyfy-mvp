"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DateRangeSelector,
  computeRange,
  type DateRangeValue,
} from "@/components/date-range-selector";

const ReportsContentTab = dynamic(
  () =>
    import("@/components/reports-content-tab").then((m) => m.ReportsContentTab),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 bg-gray-100 dark:bg-gray-900 rounded-xl animate-pulse" />
    ),
  }
);

const ReportsStudentsTab = dynamic(
  () =>
    import("@/components/reports-students-tab").then(
      (m) => m.ReportsStudentsTab
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 bg-gray-100 dark:bg-gray-900 rounded-xl animate-pulse" />
    ),
  }
);

type TabId = "content" | "students";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "content", label: "Conteúdo" },
  { id: "students", label: "Alunos" },
];

function DownloadIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

interface CourseOption { id: string; title: string; }

export default function AdminAnalyticsPage() {
  return (
    <Suspense fallback={<div className="p-6" />}>
      <AdminAnalyticsPageInner />
    </Suspense>
  );
}

function AdminAnalyticsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab") || "content";
  const tab: TabId = TABS.some((t) => t.id === rawTab)
    ? (rawTab as TabId)
    : "content";

  useEffect(() => {
    if (rawTab === "overview" || !TABS.some((t) => t.id === rawTab)) {
      const sp = new URLSearchParams(searchParams.toString());
      sp.set("tab", "content");
      router.replace(`/admin/analytics?${sp.toString()}`);
    }
  }, [rawTab, router, searchParams]);

  const [courseId, setCourseId] = useState<string>("all");
  const [range, setRange] = useState<DateRangeValue>(() =>
    computeRange("last_30_days")
  );
  const [courses, setCourses] = useState<CourseOption[]>([]);

  useEffect(() => {
    fetch("/api/admin/analytics?tab=overview&window=7")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && Array.isArray(d.courses) && setCourses(d.courses))
      .catch(() => {});
  }, []);

  function changeTab(id: TabId) {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("tab", id);
    router.replace(`/admin/analytics?${sp.toString()}`);
  }

  function handleExport() {
    const qs = new URLSearchParams();
    if (courseId !== "all") qs.set("courseId", courseId);
    qs.set("startDate", range.startDate);
    qs.set("endDate", range.endDate);
    qs.set("tab", tab);
    qs.set("format", "csv");
    window.location.href = `/api/admin/analytics?${qs.toString()}`;
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Relatórios
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Análise detalhada de conteúdo e alunos
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
          <Button variant="secondary" size="sm" onClick={handleExport}>
            <DownloadIcon className="w-4 h-4 mr-2" />
            Exportar relatório
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <nav className="flex gap-1 overflow-x-auto" aria-label="Tabs">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => changeTab(t.id)}
                className={`relative px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  active
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {t.label}
                <span
                  className={`absolute inset-x-2 bottom-0 h-0.5 rounded-t-full transition-all ${
                    active ? "bg-blue-600 dark:bg-blue-400" : "bg-transparent"
                  }`}
                />
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      {tab === "content" && (
        <ReportsContentTab
          courseId={courseId}
          startDate={range.startDate}
          endDate={range.endDate}
        />
      )}
      {tab === "students" && (
        <ReportsStudentsTab
          courseId={courseId}
          startDate={range.startDate}
          endDate={range.endDate}
        />
      )}
    </div>
  );
}

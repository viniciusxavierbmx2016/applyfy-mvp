"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

const AdminAnalyticsContent = dynamic(
  () =>
    import("@/components/admin-analytics-content").then(
      (m) => m.AdminAnalyticsContent
    ),
  {
    ssr: false,
    loading: () => (
      <div className="p-6">
        <div className="h-6 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-4" />
        <div className="h-64 bg-gray-100 dark:bg-gray-900 rounded-xl animate-pulse" />
      </div>
    ),
  }
);

type TabId = "overview" | "content" | "students";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "overview", label: "Visão Geral" },
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

function ClockIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
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
  const tabParam = (searchParams.get("tab") || "overview") as TabId;
  const tab: TabId = TABS.some((t) => t.id === tabParam) ? tabParam : "overview";

  const [courseId, setCourseId] = useState<string>("all");
  const [windowDays, setWindowDays] = useState<7 | 30 | 90>(30);
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
    qs.set("window", String(windowDays));
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
            Performance dos seus cursos, engajamento e progresso dos alunos.
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
          <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-0.5">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setWindowDays(d as 7 | 30 | 90)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                  windowDays === d
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
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
      {tab === "overview" && (
        <AdminAnalyticsContent courseId={courseId} windowDays={windowDays} />
      )}
      {tab === "content" && <ComingSoon title="Relatórios de Conteúdo" />}
      {tab === "students" && <ComingSoon title="Relatórios de Alunos" />}
    </div>
  );
}

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-gray-300 dark:border-gray-800 bg-white/40 dark:bg-gray-900/40 py-20 px-6">
      <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-4">
        <ClockIcon className="w-7 h-7" />
      </span>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Em breve</p>
    </div>
  );
}

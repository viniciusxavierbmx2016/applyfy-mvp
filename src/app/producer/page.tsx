"use client";

import { Suspense, useEffect, useState } from "react";
import { useCountUp } from "@/hooks/use-count-up";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserStore } from "@/stores/user-store";
import {
  DateRangeSelector,
  computeRange,
  type DateRangeValue,
} from "@/components/date-range-selector";
import { CustomSelect } from "@/components/custom-select";


interface SalesStats {
  totalRevenue: number;
  totalRefunds: number;
  netRevenue: number;
  transactionCount: number;
  averageTicket: number;
}

const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

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
      fetch("/api/student/workspace")
        .then((r) => r.ok ? r.json() : null)
        .then((d) => {
          if (d?.slug) router.replace(`/w/${d.slug}`);
          else router.replace("/login");
        })
        .catch(() => router.replace("/login"));
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
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-md w-full mx-4 text-center space-y-4 border border-gray-200 dark:border-white/10 shadow-2xl">
            <div className="mx-auto w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center text-3xl">
              <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition"
            >
              Começar agora
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4" data-tour="dashboard-header">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Visão geral do seu workspace
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div data-tour="dashboard-course-selector">
            <CustomSelect
              value={courseId}
              onChange={setCourseId}
              className="min-w-[180px]"
              options={[
                { value: "all", label: "Todos os cursos" },
                ...courses.map((c) => ({ value: c.id, label: c.title })),
              ]}
            />
          </div>
          <div data-tour="dashboard-date-selector">
            <DateRangeSelector value={range} onChange={setRange} />
          </div>
        </div>
      </div>

      <SalesKpis startDate={range.startDate} endDate={range.endDate} />

      <AnalyticsOverview
        courseId={courseId}
        startDate={range.startDate}
        endDate={range.endDate}
        rangeLabel={range.label}
      />
    </div>
  );
}

function SalesKpis({ startDate, endDate }: { startDate?: string; endDate?: string }) {
  const [data, setData] = useState<SalesStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (startDate) qs.set("startDate", startDate);
    if (endDate) qs.set("endDate", endDate);
    fetch(`/api/producer/sales/stats?${qs.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  const stats = data ?? { netRevenue: 0, transactionCount: 0, averageTicket: 0, totalRefunds: 0, totalRevenue: 0 };
  const noSales = stats.transactionCount === 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <SalesCard
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        }
        label="Receita líquida"
        value={fmt.format(stats.netRevenue)}
        numericValue={stats.netRevenue}
        format="currency"
        accent="emerald"
        hint={noSales ? "Nenhuma venda no período" : "no período"}
      />
      <SalesCard
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
        }
        label="Vendas"
        value={stats.transactionCount}
        numericValue={stats.transactionCount}
        format="integer"
        accent="blue"
        hint="transações"
      />
      <SalesCard
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
        }
        label="Ticket médio"
        value={fmt.format(stats.averageTicket)}
        numericValue={stats.averageTicket}
        format="currency"
        accent="purple"
        hint="por venda"
      />
      <SalesCard
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" />
          </svg>
        }
        label="Reembolsos"
        value={fmt.format(stats.totalRefunds)}
        numericValue={stats.totalRefunds}
        format="currency"
        accent="red"
        hint="devolvidos"
      />
    </div>
  );
}

const SALES_ACCENT: Record<string, { text: string; bg: string }> = {
  emerald: { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30" },
  blue: { text: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/30" },
  purple: { text: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/30" },
  red: { text: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/30" },
};

function SalesCard({
  icon,
  label,
  value,
  numericValue,
  format,
  accent,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  numericValue?: number;
  format?: "currency" | "integer";
  accent: keyof typeof SALES_ACCENT;
  hint?: string;
}) {
  const animated = useCountUp(numericValue ?? 0, {
    duration: 800,
    decimals: format === "currency" ? 2 : 0,
    prefix: format === "currency" ? "R$\u00A0" : "",
  });
  const displayValue = numericValue != null ? animated : value;
  const a = SALES_ACCENT[accent];
  return (
    <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl p-4 sm:p-5 hover:border-gray-300 dark:hover:border-white/10 transition-colors duration-200">
      <span className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${a.bg} ${a.text}`}>
        {icon}
      </span>
      <p className="mt-4 text-[11px] font-medium uppercase tracking-widest text-gray-500">
        {label}
      </p>
      <p className={`mt-1 text-2xl sm:text-3xl font-bold tabular-nums ${a.text}`}>{displayValue}</p>
      {hint && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
    </div>
  );
}

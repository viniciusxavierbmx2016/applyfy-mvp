"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserStore } from "@/stores/user-store";

const AdminRevenueChart = dynamic(
  () =>
    import("@/components/admin-revenue-chart").then((m) => m.AdminRevenueChart),
  {
    ssr: false,
    loading: () => <div className="w-full h-[220px] animate-pulse" />,
  }
);

interface DashboardData {
  metrics: {
    totalProducers: number;
    totalStudents: number;
    totalCourses: number;
    activeProducers: number;
  };
  revenue: {
    mrr: number;
    paidProducers: number;
    freeProducers: number;
    activeSubProducers: number;
  };
  monthlyRevenue: Array<{ month: string; revenue: number }>;
  recentProducers: Array<{
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    createdAt: string;
  }>;
  topProducers: Array<{
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    students: number;
  }>;
}

export default function AdminDashboardPage() {
  const { user } = useUserStore();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    if (user.role !== "ADMIN") {
      router.replace(
        user.role === "PRODUCER" || user.role === "COLLABORATOR"
          ? "/producer"
          : "/"
      );
      return;
    }
    fetch("/api/admin/dashboard")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [user, router]);

  if (!user || user.role !== "ADMIN" || loading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard Admin
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Visão global da plataforma.
        </p>
      </div>

      {/* Global metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          label="Produtores"
          value={data.metrics.totalProducers}
          accent="text-blue-500 dark:text-blue-400"
          href="/admin/producers"
        />
        <Card
          label="Alunos totais"
          value={data.metrics.totalStudents}
          accent="text-emerald-500 dark:text-emerald-400"
        />
        <Card
          label="Cursos totais"
          value={data.metrics.totalCourses}
          accent="text-amber-500 dark:text-amber-400"
        />
        <Card
          label="Produtores ativos (30d)"
          value={data.metrics.activeProducers}
          accent="text-pink-500 dark:text-pink-400"
        />
      </div>

      {/* Revenue section */}
      <section className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
          Receita da plataforma
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <MetricBlock
            label="MRR (receita recorrente)"
            value={formatMoney(data.revenue.mrr)}
            accent="text-emerald-500 dark:text-emerald-400"
          />
          <MetricBlock
            label="Produtores pagantes"
            value={data.revenue.paidProducers}
            accent="text-blue-500 dark:text-blue-400"
          />
          <MetricBlock
            label="Produtores Free"
            value={data.revenue.freeProducers}
            accent="text-gray-600 dark:text-gray-300"
          />
        </div>
        <AdminRevenueChart
          data={data.monthlyRevenue}
          formatMoney={formatMoney}
        />

      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent producers */}
        <section className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Últimos produtores cadastrados
            </h2>
            <Link
              href="/admin/producers"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Ver todos
            </Link>
          </div>
          {data.recentProducers.length === 0 ? (
            <p className="text-sm text-gray-500">Sem produtores ainda.</p>
          ) : (
            <ul>
              {data.recentProducers.map((p) => (
                <li key={p.id} className="border-b border-gray-100 dark:border-white/[0.04] last:border-0">
                  <Link
                    href={`/admin/producers/${p.id}`}
                    className="flex items-center gap-3 py-3 hover:bg-gray-50 dark:hover:bg-white/[0.02] -mx-2 px-2 rounded-lg transition-colors duration-150"
                  >
                    {p.avatarUrl ? (
                      <img
                        src={p.avatarUrl}
                        alt={p.name}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {p.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{p.email}</p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatDate(p.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Top producers */}
        <section className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
            Top 5 produtores (mais alunos)
          </h2>
          {data.topProducers.length === 0 ? (
            <p className="text-sm text-gray-500">Sem dados ainda.</p>
          ) : (
            <ul>
              {data.topProducers.map((p, i) => (
                <li key={p.id} className="border-b border-gray-100 dark:border-white/[0.04] last:border-0">
                  <Link
                    href={`/admin/producers/${p.id}`}
                    className="flex items-center gap-3 py-3 hover:bg-gray-50 dark:hover:bg-white/[0.02] -mx-2 px-2 rounded-lg transition-colors duration-150"
                  >
                    <span className="w-6 text-center text-xs font-semibold text-gray-500">
                      {i + 1}
                    </span>
                    {p.avatarUrl ? (
                      <img
                        src={p.avatarUrl}
                        alt={p.name}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {p.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{p.email}</p>
                    </div>
                    <span className="text-sm font-semibold text-amber-500 dark:text-amber-400">
                      {p.students}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Card({
  label,
  value,
  accent,
  href,
}: {
  label: string;
  value: number | string;
  accent: string;
  href?: string;
}) {
  const content = (
    <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-5 transition-all duration-200 hover:border-gray-300 dark:hover:border-white/[0.1] h-full">
      <p className="text-[11px] font-medium uppercase tracking-widest text-gray-500">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-bold ${accent}`}>{value}</p>
    </div>
  );
  return href ? (
    <Link href={href} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}

function MetricBlock({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-widest text-gray-500">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}

function formatDate(v: string) {
  try {
    return new Date(v).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
  } catch {
    return "—";
  }
}
function formatMoney(v: number) {
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(v);
  } catch {
    return `R$ ${v.toFixed(2)}`;
  }
}


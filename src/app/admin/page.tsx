"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/stores/user-store";
import {
  DateRangeSelector,
  computeRange,
  type DateRangeValue,
} from "@/components/date-range-selector";

interface DashboardData {
  kpis: {
    mrr: number;
    activeProducers: number;
    newProducers: number;
    churn: number;
    avgTicket: number;
    pastDue: number;
    totalProducers: number;
    suspended: number;
  };
  chart: Array<{ date: string; newProducers: number; cancellations: number }>;
  topProducers: Array<{
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    revenue: number;
  }>;
  planDistribution: Array<{
    planId: string;
    planName: string;
    price: number;
    count: number;
    percentage: number;
  }>;
  producers: Array<{ id: string; name: string; email: string }>;
}

const IconDollar = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 1v22m5-18H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H7" />
  </svg>
);
const IconUsers = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2m22-4a4 4 0 00-3-3.87M9 7a4 4 0 110-8 4 4 0 010 8zm7-1a4 4 0 110-8" />
  </svg>
);
const IconUserPlus = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2m19-2v6m3-3h-6M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);
const IconUserMinus = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2m19-4h-6M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

export default function AdminDashboardPage() {
  const { user } = useUserStore();
  const router = useRouter();
  const [range, setRange] = useState<DateRangeValue>(() =>
    computeRange("last_30_days")
  );
  const [producerId, setProducerId] = useState("");
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
    }
  }, [user, router]);

  useEffect(() => {
    if (!user || user.role !== "ADMIN") return;
    setLoading(true);
    const params = new URLSearchParams();
    params.set("startDate", range.startDate);
    params.set("endDate", range.endDate);
    if (producerId) params.set("producerId", producerId);

    fetch(`/api/admin/dashboard?${params}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [range, producerId, user]);

  if (!user || user.role !== "ADMIN") {
    return (
      <div className="space-y-6">
        <SkeletonCards count={8} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Visão geral da plataforma
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <select
            value={producerId}
            onChange={(e) => setProducerId(e.target.value)}
            className="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 min-w-[200px]"
          >
            <option value="">Todos os produtores</option>
            {data?.producers?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name || p.email}
              </option>
            ))}
          </select>
          <DateRangeSelector value={range} onChange={setRange} />
        </div>
      </div>

      {loading ? (
        <SkeletonCards count={8} />
      ) : data ? (
        <>
          {/* KPI Cards — linha 1 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiCard
              icon={<IconDollar />}
              iconBg="bg-emerald-500/10"
              iconColor="text-emerald-500"
              label="MRR"
              value={formatMoney(data.kpis.mrr)}
              valueColor="text-emerald-500"
              subtitle="Receita recorrente mensal"
            />
            <KpiCard
              icon={<IconUsers />}
              iconBg="bg-blue-500/10"
              iconColor="text-blue-500"
              label="PRODUTORES ATIVOS"
              value={data.kpis.activeProducers}
              subtitle="Assinaturas ativas"
            />
            <KpiCard
              icon={<IconUserPlus />}
              iconBg="bg-purple-500/10"
              iconColor="text-purple-500"
              label="NOVOS PRODUTORES"
              value={data.kpis.newProducers}
              subtitle="No período selecionado"
            />
            <KpiCard
              icon={<IconUserMinus />}
              iconBg="bg-red-500/10"
              iconColor="text-red-500"
              label="CHURN"
              value={data.kpis.churn}
              valueColor="text-red-500"
              subtitle="Cancelamentos no período"
            />
          </div>

          {/* KPI Cards — linha 2 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <SmallKpiCard
              label="TICKET MÉDIO"
              value={formatMoney(data.kpis.avgTicket)}
            />
            <SmallKpiCard
              label="TOTAL PRODUTORES"
              value={data.kpis.totalProducers}
            />
            <SmallKpiCard
              label="INADIMPLENTES"
              value={data.kpis.pastDue}
              valueColor="text-amber-500"
            />
            <SmallKpiCard
              label="SUSPENSOS"
              value={data.kpis.suspended}
              valueColor="text-red-400"
            />
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-500">Erro ao carregar dados.</p>
      )}
    </div>
  );
}

function KpiCard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  valueColor,
  subtitle,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: number | string;
  valueColor?: string;
  subtitle: string;
}) {
  return (
    <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}
        >
          <span className={iconColor}>{icon}</span>
        </div>
        <p className="text-[11px] text-gray-500 uppercase tracking-wider">
          {label}
        </p>
      </div>
      <p
        className={`text-2xl font-bold ${valueColor || "text-gray-900 dark:text-white"}`}
      >
        {value}
      </p>
      <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}

function SmallKpiCard({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: number | string;
  valueColor?: string;
}) {
  return (
    <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl p-4">
      <p className="text-[11px] text-gray-500 uppercase tracking-wider">
        {label}
      </p>
      <p
        className={`text-lg font-bold mt-1 ${valueColor || "text-gray-900 dark:text-white"}`}
      >
        {value}
      </p>
    </div>
  );
}

function SkeletonCards({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl p-5 animate-pulse"
        >
          <div className="h-4 w-24 bg-gray-200 dark:bg-white/10 rounded mb-3" />
          <div className="h-8 w-20 bg-gray-200 dark:bg-white/10 rounded" />
        </div>
      ))}
    </div>
  );
}

function formatMoney(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

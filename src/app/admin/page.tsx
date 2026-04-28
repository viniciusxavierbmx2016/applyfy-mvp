"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useUserStore } from "@/stores/user-store";
import {
  DateRangeSelector,
  computeRange,
  type DateRangeValue,
} from "@/components/date-range-selector";

const AdminGrowthChart = dynamic(
  () => import("@/components/admin-growth-chart").then((m) => m.AdminGrowthChart),
  { ssr: false, loading: () => <div className="w-full h-[300px] animate-pulse" /> }
);

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

          {/* Gráfico + Rankings */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Gráfico — 2/3 */}
            <div className="lg:col-span-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl p-5">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Crescimento</h2>
                <p className="text-xs text-gray-500 mt-0.5">Novos produtores e cancelamentos por dia</p>
              </div>
              {data.chart.length > 0 ? (
                <AdminGrowthChart data={data.chart} />
              ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-500 text-sm">
                  Sem dados para o período selecionado
                </div>
              )}
            </div>

            {/* Rankings — 1/3 */}
            <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Produtores mais rentáveis</h2>
              {data.topProducers.length > 0 ? (
                <div className="space-y-3">
                  {data.topProducers.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 dark:text-gray-600 w-4">{i + 1}</span>
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-xs font-bold text-blue-400 flex-shrink-0 overflow-hidden">
                        {p.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          (p.name?.[0] || "?").toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-white truncate">{p.name || p.email}</p>
                        <p className="text-[11px] text-gray-500 truncate">{p.email}</p>
                      </div>
                      <p className="text-sm font-semibold text-emerald-500 flex-shrink-0">
                        {formatMoney(p.revenue)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">Nenhum produtor ativo</p>
              )}

              {data.planDistribution.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-white/5">
                  <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Distribuição por plano</h3>
                  {data.planDistribution.map((plan) => (
                    <div key={plan.planId} className="mb-3 last:mb-0">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 dark:text-gray-300">{plan.planName}</span>
                        <span className="text-gray-500">{plan.count}</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 dark:bg-white/5 rounded-full mt-1">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-500"
                          style={{ width: `${plan.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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

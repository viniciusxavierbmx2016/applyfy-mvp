"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useUserStore } from "@/stores/user-store";
import { useCountUp } from "@/hooks/use-count-up";
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
    periodRevenue: number;
    periodTransactions: number;
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

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

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
            {getGreeting()}, Admin
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Painel de controle da plataforma Members Club
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
          {/* Faturamento do período */}
          <PeriodRevenueCard
            revenue={data.kpis.periodRevenue}
            transactions={data.kpis.periodTransactions}
            label={range.label}
          />

          {/* KPI Cards — linha 1 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <AnimatedKpiCard
              icon={<IconDollar />}
              iconBg="bg-emerald-500/10"
              iconColor="text-emerald-500"
              label="MRR"
              end={data.kpis.mrr}
              isMoney
              valueColor="text-emerald-500"
              subtitle="Receita recorrente mensal"
            />
            <AnimatedKpiCard
              icon={<IconUsers />}
              iconBg="bg-blue-500/10"
              iconColor="text-blue-500"
              label="PRODUTORES ATIVOS"
              end={data.kpis.activeProducers}
              subtitle="Assinaturas ativas"
            />
            <AnimatedKpiCard
              icon={<IconUserPlus />}
              iconBg="bg-purple-500/10"
              iconColor="text-purple-500"
              label="NOVOS PRODUTORES"
              end={data.kpis.newProducers}
              subtitle="No período selecionado"
            />
            <AnimatedKpiCard
              icon={<IconUserMinus />}
              iconBg="bg-red-500/10"
              iconColor="text-red-500"
              label="CHURN"
              end={data.kpis.churn}
              valueColor="text-red-500"
              subtitle="Cancelamentos no período"
            />
          </div>

          {/* KPI Cards — linha 2 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <AnimatedSmallKpiCard
              label="TICKET MÉDIO"
              end={data.kpis.avgTicket}
              isMoney
            />
            <AnimatedSmallKpiCard
              label="TOTAL PRODUTORES"
              end={data.kpis.totalProducers}
            />
            <AnimatedSmallKpiCard
              label="INADIMPLENTES"
              end={data.kpis.pastDue}
              valueColor="text-amber-500"
            />
            <AnimatedSmallKpiCard
              label="SUSPENSOS"
              end={data.kpis.suspended}
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
                <div className="flex flex-col items-center justify-center h-[300px] text-gray-400 dark:text-gray-600">
                  <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="mb-3 opacity-50">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                  <p className="text-sm">Sem dados para o período selecionado</p>
                  <p className="text-xs mt-1">Tente selecionar um período diferente</p>
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
                <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-600">
                  <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="mb-2 opacity-50">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                  <p className="text-sm">Nenhum produtor ativo</p>
                </div>
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

function AnimatedKpiCard({
  icon,
  iconBg,
  iconColor,
  label,
  end,
  isMoney,
  valueColor,
  subtitle,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  end: number;
  isMoney?: boolean;
  valueColor?: string;
  subtitle: string;
}) {
  const display = useCountUp(end, isMoney
    ? { prefix: "R$ ", decimals: 2, separator: ".", decimalSeparator: "," }
    : undefined
  );

  return (
    <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
          <span className={iconColor}>{icon}</span>
        </div>
        <p className="text-[11px] text-gray-500 uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${valueColor || "text-gray-900 dark:text-white"}`}>
        {display}
      </p>
      <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}

function AnimatedSmallKpiCard({
  label,
  end,
  isMoney,
  valueColor,
}: {
  label: string;
  end: number;
  isMoney?: boolean;
  valueColor?: string;
}) {
  const display = useCountUp(end, isMoney
    ? { prefix: "R$ ", decimals: 2, separator: ".", decimalSeparator: "," }
    : undefined
  );

  return (
    <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl p-4">
      <p className="text-[11px] text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-bold mt-1 ${valueColor || "text-gray-900 dark:text-white"}`}>
        {display}
      </p>
    </div>
  );
}

function PeriodRevenueCard({
  revenue,
  transactions,
  label,
}: {
  revenue: number;
  transactions: number;
  label: string;
}) {
  const display = useCountUp(revenue, {
    prefix: "R$ ",
    decimals: 2,
    separator: ".",
    decimalSeparator: ",",
  });

  return (
    <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
            Faturamento no período ({label})
          </p>
          <p className="text-3xl font-bold text-emerald-500 dark:text-emerald-400">
            {display}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {transactions} transaç{transactions === 1 ? "ão" : "ões"}
          </p>
        </div>
        <div className="w-14 h-14 rounded-xl bg-emerald-500/10 flex items-center justify-center">
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-emerald-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 1v22m5-18H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H7" />
          </svg>
        </div>
      </div>
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

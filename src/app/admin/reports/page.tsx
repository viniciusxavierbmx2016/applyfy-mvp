"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  DateRangeSelector,
  DateRangeValue,
  computeRange,
} from "@/components/date-range-selector";

const DistributionChart = dynamic(
  () =>
    import("@/components/admin-reports-charts").then(
      (m) => m.DistributionChart
    ),
  { ssr: false }
);
const FunnelChart = dynamic(
  () =>
    import("@/components/admin-reports-charts").then((m) => m.FunnelChart),
  { ssr: false }
);
const GrowthChart = dynamic(
  () =>
    import("@/components/admin-reports-charts").then((m) => m.GrowthChart),
  { ssr: false }
);
const FinancialCharts = dynamic(
  () =>
    import("@/components/admin-reports-charts").then(
      (m) => m.FinancialCharts
    ),
  { ssr: false }
);

type Tab = "onboarding" | "funnel" | "growth" | "financial";

interface DistItem {
  label: string;
  count: number;
}

interface ReportData {
  distributions: {
    byNiche: DistItem[];
    byBusinessType: DistItem[];
    byRevenue: DistItem[];
    bySource: DistItem[];
  };
  funnel: {
    registered: number;
    completedOnboarding: number;
    createdCourse: number;
    hasStudents: number;
  };
  growth: { month: string; count: number }[];
  financial?: {
    mrr: number;
    arr: number;
    arpu: number;
    churnRate: number;
    nrr: number;
    ltv: number;
    mrrGrowthRate: number;
    activeSubscriptions: number;
    cancelledInPeriod: number;
    newSubscriptions: number;
    revenueByPlan: {
      planName: string;
      price: number;
      count: number;
      mrr: number;
    }[];
    mrrHistory: { month: string; mrr: number; count: number }[];
  };
}

const NICHE_LABELS: Record<string, string> = {
  beleza: "Beleza",
  renda_extra: "Renda Extra",
  financas: "Finanças",
  saude: "Saúde",
  tecnologia: "Tecnologia",
  educacao: "Educação",
  marketing: "Marketing",
  fitness: "Fitness",
  culinaria: "Culinária",
  outro: "Outro",
  "Não informado": "Não informado",
};

const BUSINESS_LABELS: Record<string, string> = {
  infoprodutos: "Infoprodutos",
  ecommerce: "E-commerce",
  servicos: "Serviços",
  saas: "SaaS",
  consultoria: "Consultoria",
  outro: "Outro",
  "Não informado": "Não informado",
};

const REVENUE_LABELS: Record<string, string> = {
  "0_5k": "R$ 0 – 5 mil",
  "5k_10k": "R$ 5 – 10 mil",
  "10k_50k": "R$ 10 – 50 mil",
  "50k_100k": "R$ 50 – 100 mil",
  "100k_500k": "R$ 100 – 500 mil",
  "500k_1m": "R$ 500 mil – 1M",
  acima_1m: "Acima de R$ 1M",
  "Não informado": "Não informado",
};

const SOURCE_LABELS: Record<string, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  google: "Google",
  tiktok: "TikTok",
  facebook: "Facebook",
  indicacao: "Indicação",
  outro: "Outro",
  "Não informado": "Não informado",
};

const TABS: { id: Tab; label: string }[] = [
  { id: "onboarding", label: "Onboarding" },
  { id: "funnel", label: "Funil" },
  { id: "growth", label: "Crescimento" },
  { id: "financial", label: "Financeiro" },
];

export default function AdminReportsPage() {
  const [range, setRange] = useState<DateRangeValue>(() =>
    computeRange("total")
  );
  const [tab, setTab] = useState<Tab>("onboarding");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (r: DateRangeValue) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (r.option !== "total") {
        params.set("startDate", r.startDate);
        params.set("endDate", r.endDate);
      }
      const res = await fetch(`/api/admin/reports?${params}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(range);
  }, [range, fetchData]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Relatórios
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Análise de onboarding, funil e crescimento
          </p>
        </div>
        <DateRangeSelector value={range} onChange={setRange} />
      </div>

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800/50 rounded-lg p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition ${
              tab === t.id
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-white/[0.06] p-5 animate-pulse"
            >
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4" />
              <div className="flex items-center gap-6">
                <div className="w-[160px] h-[160px] rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1 space-y-3">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !data ? (
        <div className="text-center py-12 text-gray-500">
          Erro ao carregar dados
        </div>
      ) : (
        <>
          {tab === "onboarding" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DistributionChart
                title="Por Nicho"
                data={data.distributions.byNiche}
                labelMap={NICHE_LABELS}
              />
              <DistributionChart
                title="Por Tipo de Negócio"
                data={data.distributions.byBusinessType}
                labelMap={BUSINESS_LABELS}
              />
              <DistributionChart
                title="Por Faixa de Receita"
                data={data.distributions.byRevenue}
                labelMap={REVENUE_LABELS}
              />
              <DistributionChart
                title="Por Origem"
                data={data.distributions.bySource}
                labelMap={SOURCE_LABELS}
              />
            </div>
          )}

          {tab === "funnel" && <FunnelChart funnel={data.funnel} />}

          {tab === "growth" && <GrowthChart data={data.growth} />}

          {tab === "financial" && data.financial && (
            <FinancialCharts financial={data.financial} />
          )}
        </>
      )}
    </div>
  );
}

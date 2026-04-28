"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DateRangeSelector,
  DateRangeValue,
  computeRange,
} from "@/components/date-range-selector";

type Tab = "onboarding" | "funnel" | "growth";

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
];

function formatMonth(ym: string) {
  const [y, m] = ym.split("-");
  const months = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ];
  return `${months[Number(m) - 1]}/${y}`;
}

function DistributionTable({
  title,
  data,
  labelMap,
}: {
  title: string;
  data: DistItem[];
  labelMap: Record<string, string>;
}) {
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
        {title}
      </h3>
      {data.length === 0 ? (
        <p className="text-sm text-gray-500">Sem dados</p>
      ) : (
        <div className="space-y-2">
          {data.map((item) => {
            const pct = total > 0 ? (item.count / total) * 100 : 0;
            return (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 dark:text-gray-300">
                    {labelMap[item.label] || item.label}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    {item.count}{" "}
                    <span className="text-xs">({pct.toFixed(0)}%)</span>
                  </span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FunnelStep({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="flex items-center gap-4">
      <div className="w-36 text-sm text-gray-700 dark:text-gray-300 text-right">
        {label}
      </div>
      <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-8 relative overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-gray-900 dark:text-white">
          {value} ({pct.toFixed(0)}%)
        </span>
      </div>
    </div>
  );
}

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 animate-pulse"
            >
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4" />
              <div className="space-y-3">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DistributionTable
                title="Nicho"
                data={data.distributions.byNiche}
                labelMap={NICHE_LABELS}
              />
              <DistributionTable
                title="Tipo de Negócio"
                data={data.distributions.byBusinessType}
                labelMap={BUSINESS_LABELS}
              />
              <DistributionTable
                title="Faturamento Mensal"
                data={data.distributions.byRevenue}
                labelMap={REVENUE_LABELS}
              />
              <DistributionTable
                title="Origem"
                data={data.distributions.bySource}
                labelMap={SOURCE_LABELS}
              />
            </div>
          )}

          {tab === "funnel" && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-6">
                Funil de Conversão
              </h3>
              <div className="space-y-4">
                <FunnelStep
                  label="Cadastrados"
                  value={data.funnel.registered}
                  total={data.funnel.registered}
                  color="bg-blue-500"
                />
                <FunnelStep
                  label="Onboarding"
                  value={data.funnel.completedOnboarding}
                  total={data.funnel.registered}
                  color="bg-purple-500"
                />
                <FunnelStep
                  label="Criou curso"
                  value={data.funnel.createdCourse}
                  total={data.funnel.registered}
                  color="bg-emerald-500"
                />
                <FunnelStep
                  label="Tem alunos"
                  value={data.funnel.hasStudents}
                  total={data.funnel.registered}
                  color="bg-amber-500"
                />
              </div>
            </div>
          )}

          {tab === "growth" && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                Novos Produtores por Mês
              </h3>
              {data.growth.length === 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center">
                  Sem dados no período
                </p>
              ) : (
                <div className="space-y-2">
                  {data.growth.map((item) => {
                    const max = Math.max(...data.growth.map((g) => g.count));
                    const pct = max > 0 ? (item.count / max) * 100 : 0;
                    return (
                      <div key={item.month} className="flex items-center gap-3">
                        <span className="w-20 text-sm text-gray-500 dark:text-gray-400 text-right font-mono">
                          {formatMonth(item.month)}
                        </span>
                        <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-6 relative overflow-hidden">
                          <div
                            className="bg-blue-500 h-full rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-8 text-sm font-medium text-gray-700 dark:text-gray-300 text-right">
                          {item.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

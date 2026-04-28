"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#06b6d4",
  "#f97316",
  "#6366f1",
];

interface DistItem {
  label: string;
  count: number;
}

export function DistributionChart({
  title,
  data,
  labelMap,
}: {
  title: string;
  data: DistItem[];
  labelMap: Record<string, string>;
}) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const chartData = data.map((d) => ({
    name: labelMap[d.label] || d.label,
    value: d.count,
    percentage: total > 0 ? ((d.count / total) * 100).toFixed(1) : "0",
  }));

  return (
    <div className="bg-white dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-white/[0.06] p-5">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
        {title}
      </h3>
      {data.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">Sem dados</p>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="w-[180px] h-[180px] flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#1a1a2e",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#fff",
                  }}
                  formatter={(value) => [String(value), "Total"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2 min-w-0">
            {chartData.slice(0, 6).map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="text-gray-600 dark:text-gray-400 truncate flex-1">
                  {d.name}
                </span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {d.percentage}%
                </span>
              </div>
            ))}
            {chartData.length > 6 && (
              <p className="text-xs text-gray-500">
                +{chartData.length - 6} outros
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const FUNNEL_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b"];

export function FunnelChart({
  funnel,
}: {
  funnel: {
    registered: number;
    completedOnboarding: number;
    createdCourse: number;
    hasStudents: number;
  };
}) {
  const steps = [
    { label: "Cadastrados", value: funnel.registered, color: FUNNEL_COLORS[0] },
    {
      label: "Completou Onboarding",
      value: funnel.completedOnboarding,
      color: FUNNEL_COLORS[1],
    },
    { label: "Criou Curso", value: funnel.createdCourse, color: FUNNEL_COLORS[2] },
    { label: "Tem Alunos", value: funnel.hasStudents, color: FUNNEL_COLORS[3] },
  ];
  const total = funnel.registered;

  return (
    <div className="bg-white dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-white/[0.06] p-6">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-6">
        Funil de Conversão
      </h3>
      <div className="space-y-3">
        {steps.map((step, i) => {
          const pct = total > 0 ? (step.value / total) * 100 : 0;
          const convFromPrev =
            i > 0 && steps[i - 1].value > 0
              ? ((step.value / steps[i - 1].value) * 100).toFixed(0)
              : null;
          return (
            <div key={step.label}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: step.color }}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {step.label}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {convFromPrev && (
                    <span className="text-xs text-gray-500">
                      {convFromPrev}% da etapa anterior
                    </span>
                  )}
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {step.value}{" "}
                    <span className="text-xs font-normal text-gray-500">
                      ({pct.toFixed(0)}%)
                    </span>
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-8 relative overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(pct, 2)}%`,
                    backgroundColor: step.color,
                    opacity: 0.85,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatMonth(ym: string) {
  const [y, m] = ym.split("-");
  const months = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ];
  return `${months[Number(m) - 1]}/${y}`;
}

export function GrowthChart({
  data,
}: {
  data: { month: string; count: number }[];
}) {
  const chartData = data.map((d) => ({
    month: formatMonth(d.month),
    count: d.count,
  }));

  return (
    <div className="bg-white dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-white/[0.06] p-6">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
        Novos Produtores por Mês
      </h3>
      {data.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">
          Sem dados no período
        </p>
      ) : (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.06)"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: "#9ca3af" }}
                axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#1a1a2e",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#fff",
                }}
                formatter={(value) => [String(value), "Produtores"]}
              />
              <Bar
                dataKey="count"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

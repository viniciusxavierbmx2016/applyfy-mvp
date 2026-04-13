"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface AnalyticsData {
  kpis: {
    activeStudents: number;
    newStudents7d: number;
    avgCompletion: number;
    totalPosts: number;
  };
  newStudentsPerDay: Array<{ day: string; count: number }>;
  lessonsCompletedPerDay: Array<{ day: string; count: number }>;
  topCourses: Array<{ id: string; title: string; students: number }>;
  postsByType: Array<{ type: string; label: string; count: number }>;
}

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899"];

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-600 dark:text-gray-400">Erro ao carregar analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Visão geral do desempenho da plataforma.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Alunos ativos"
          value={data.kpis.activeStudents}
          accent="text-blue-400"
        />
        <KpiCard
          label="Novos alunos (7d)"
          value={data.kpis.newStudents7d}
          accent="text-emerald-400"
        />
        <KpiCard
          label="Taxa média de conclusão"
          value={`${data.kpis.avgCompletion}%`}
          accent="text-amber-400"
        />
        <KpiCard
          label="Posts na comunidade"
          value={data.kpis.totalPosts}
          accent="text-pink-400"
        />
      </div>

      {/* Line chart — new students */}
      <ChartCard title="Novos alunos por dia (últimos 30 dias)">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data.newStudentsPerDay}>
            <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
            <XAxis
              dataKey="day"
              stroke="#6b7280"
              fontSize={11}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis stroke="#6b7280" fontSize={11} allowDecimals={false} />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={{ color: "#d1d5db" }}
            />
            <Line
              type="monotone"
              dataKey="count"
              name="Novos alunos"
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: "#3b82f6" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Bar chart — lessons completed */}
      <ChartCard title="Aulas concluídas por dia (últimos 30 dias)">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data.lessonsCompletedPerDay}>
            <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
            <XAxis
              dataKey="day"
              stroke="#6b7280"
              fontSize={11}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis stroke="#6b7280" fontSize={11} allowDecimals={false} />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: "rgba(16, 185, 129, 0.08)" }}
              labelStyle={{ color: "#d1d5db" }}
            />
            <Bar dataKey="count" name="Aulas concluídas" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Horizontal bar — top courses */}
        <ChartCard title="Cursos mais populares">
          {data.topCourses.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={data.topCourses}
                layout="vertical"
                margin={{ left: 16, right: 16 }}
              >
                <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="#6b7280"
                  fontSize={11}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="title"
                  stroke="#6b7280"
                  fontSize={11}
                  width={120}
                  tickFormatter={(v: string) =>
                    v.length > 16 ? `${v.slice(0, 16)}…` : v
                  }
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: "rgba(245, 158, 11, 0.08)" }}
                  labelStyle={{ color: "#d1d5db" }}
                />
                <Bar dataKey="students" name="Alunos" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Pie — community engagement */}
        <ChartCard title="Engajamento na comunidade">
          {data.postsByType.every((p) => p.count === 0) ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={data.postsByType}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  stroke="#0f172a"
                  strokeWidth={2}
                >
                  {data.postsByType.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: "#d1d5db" }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  wrapperStyle={{ color: "#d1d5db", fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

const tooltipStyle = {
  backgroundColor: "#111827",
  border: "1px solid #1f2937",
  borderRadius: 8,
  fontSize: 12,
  color: "#fff",
};

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 sm:p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p className={`mt-2 text-2xl sm:text-3xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 sm:p-6">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Empty() {
  return (
    <div className="h-[280px] flex items-center justify-center text-sm text-gray-500">
      Sem dados ainda.
    </div>
  );
}

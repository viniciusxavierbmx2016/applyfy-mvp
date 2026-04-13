"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Button } from "@/components/ui/button";

function Download({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
function Star({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
function ArrowUpDown({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m21 16-4 4-4-4" />
      <path d="M17 20V4" />
      <path d="m3 8 4-4 4 4" />
      <path d="M7 4v16" />
    </svg>
  );
}

interface CourseOption {
  id: string;
  title: string;
}

interface Kpis {
  totalEnrolled: number;
  uniqueStudents: number;
  newStudents: number;
  avgCompletion: number;
  avgRating: number;
  ratingCount: number;
  activeStudents: number;
  inactiveStudents: number;
  neverAccessed: number;
}

interface TopStudent {
  userId: string;
  name: string;
  email: string;
  points: number;
  completed: number;
  total: number;
  progress: number;
  lastActive: string | null;
}

interface InactiveStudent extends TopStudent {
  enrollmentId: string | null;
  courseId: string | null;
}

interface NeverAccessed {
  userId: string;
  enrollmentId: string;
  courseId: string;
  name: string;
  email: string;
  enrolledAt: string;
}

interface AnalyticsData {
  courses: CourseOption[];
  selectedCourseId: string;
  window: number;
  kpis: Kpis;
  newEnrollmentsPerDay: Array<{ day: string; count: number }>;
  lessonsCompletedPerDay: Array<{ day: string; count: number }>;
  progressDistribution: Array<{ bucket: string; count: number }>;
  moduleAbandonment: Array<{ moduleId: string; title: string; count: number }>;
  topLessons: Array<{ id: string; title: string; views: number }>;
  postsByType: Array<{ type: string; label: string; count: number }>;
  topStudents: TopStudent[];
  inactiveStudentsList: InactiveStudent[];
  neverAccessedStudents: NeverAccessed[];
}

const PIE_COLORS = ["#60a5fa", "#34d399", "#fbbf24", "#f472b6"];
const DIST_COLORS = ["#f87171", "#fbbf24", "#60a5fa", "#34d399"];

export function AdminAnalyticsContent() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [courseId, setCourseId] = useState<string>("all");
  const [windowDays, setWindowDays] = useState<7 | 30>(7);
  const [topSort, setTopSort] = useState<{
    key: keyof TopStudent;
    dir: "asc" | "desc";
  }>({ key: "points", dir: "desc" });
  const [resending, setResending] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (courseId !== "all") qs.set("courseId", courseId);
    qs.set("window", String(windowDays));
    fetch(`/api/admin/analytics?${qs.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [courseId, windowDays]);

  const sortedTop = useMemo(() => {
    if (!data) return [];
    const rows = [...data.topStudents];
    const { key, dir } = topSort;
    rows.sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return dir === "asc" ? av - bv : bv - av;
      }
      return dir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return rows;
  }, [data, topSort]);

  function toggleSort(key: keyof TopStudent) {
    setTopSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "desc" }
    );
  }

  async function handleResend(
    userEnrollmentCourseId: string | null,
    enrollmentId: string | null
  ) {
    if (!userEnrollmentCourseId || !enrollmentId) {
      setToast("Não foi possível reenviar (matrícula ausente).");
      return;
    }
    setResending(enrollmentId);
    try {
      const res = await fetch(
        `/api/courses/${userEnrollmentCourseId}/students/${enrollmentId}/resend`,
        { method: "POST" }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Falha");
      }
      setToast("Link de acesso reenviado com sucesso.");
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Erro ao reenviar");
    } finally {
      setResending(null);
      setTimeout(() => setToast(null), 4000);
    }
  }

  function handleExport() {
    const qs = new URLSearchParams();
    if (courseId !== "all") qs.set("courseId", courseId);
    qs.set("format", "csv");
    window.location.href = `/api/admin/analytics?${qs.toString()}`;
  }

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-600 dark:text-gray-400">
          Erro ao carregar analytics
        </p>
      </div>
    );
  }

  const hasCourses = data.courses.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Analytics
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Desempenho detalhado dos seus cursos e alunos.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleExport}
          disabled={!hasCourses}
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar relatório
        </Button>
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center flex-1">
          <label className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Curso
          </label>
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="flex-1 sm:max-w-xs bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos os cursos</option>
            {data.courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Janela
          </span>
          <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
            {[7, 30].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setWindowDays(d as 7 | 30)}
                className={`px-3 py-1.5 text-sm font-medium transition ${
                  windowDays === d
                    ? "bg-blue-600 text-white"
                    : "bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          label="Alunos matriculados"
          value={data.kpis.uniqueStudents}
          accent="text-blue-500 dark:text-blue-400"
        />
        <KpiCard
          label={`Novos (${windowDays}d)`}
          value={data.kpis.newStudents}
          accent="text-emerald-500 dark:text-emerald-400"
        />
        <KpiCard
          label="Conclusão média"
          value={`${data.kpis.avgCompletion}%`}
          accent="text-amber-500 dark:text-amber-400"
        />
        <KpiCard
          label="Nota média"
          value={
            data.kpis.ratingCount > 0 ? (
              <span className="inline-flex items-center gap-1">
                {data.kpis.avgRating.toFixed(1)}
                <Star className="w-5 h-5" />
              </span>
            ) : (
              "—"
            )
          }
          accent="text-yellow-500 dark:text-yellow-400"
          hint={
            data.kpis.ratingCount > 0
              ? `${data.kpis.ratingCount} avaliações`
              : "Sem avaliações"
          }
        />
        <KpiCard
          label="Ativos (7d)"
          value={data.kpis.activeStudents}
          accent="text-green-500 dark:text-green-400"
        />
        <KpiCard
          label="Inativos (>30d)"
          value={data.kpis.inactiveStudents}
          accent="text-rose-500 dark:text-rose-400"
          hint={`${data.kpis.neverAccessed} nunca acessaram`}
        />
      </div>

      {/* New enrollments line */}
      <ChartCard title="Novas matrículas por dia (últimos 30 dias)">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data.newEnrollmentsPerDay}>
            <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
            <XAxis
              dataKey="day"
              stroke="#9ca3af"
              fontSize={11}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis stroke="#9ca3af" fontSize={11} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
            <Line
              type="monotone"
              dataKey="count"
              name="Matrículas"
              stroke="#60a5fa"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: "#60a5fa" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Lessons completed bar */}
      <ChartCard title="Aulas concluídas por dia (últimos 30 dias)">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data.lessonsCompletedPerDay}>
            <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
            <XAxis
              dataKey="day"
              stroke="#9ca3af"
              fontSize={11}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis stroke="#9ca3af" fontSize={11} allowDecimals={false} />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: "rgba(52, 211, 153, 0.08)" }}
              labelStyle={labelStyle}
            />
            <Bar
              dataKey="count"
              name="Aulas concluídas"
              fill="#34d399"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Progress distribution horizontal */}
        <ChartCard title="Distribuição de progresso dos alunos">
          {data.progressDistribution.every((b) => b.count === 0) ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={data.progressDistribution}
                layout="vertical"
                margin={{ left: 16, right: 16 }}
              >
                <CartesianGrid
                  stroke="#1f2937"
                  strokeDasharray="3 3"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  stroke="#9ca3af"
                  fontSize={11}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="bucket"
                  stroke="#9ca3af"
                  fontSize={12}
                  width={70}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: "rgba(96, 165, 250, 0.08)" }}
                  labelStyle={labelStyle}
                />
                <Bar
                  dataKey="count"
                  name="Alunos"
                  radius={[0, 4, 4, 0]}
                >
                  {data.progressDistribution.map((_, i) => (
                    <Cell key={i} fill={DIST_COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Community engagement pie */}
        <ChartCard title="Engajamento na comunidade">
          {data.postsByType.every((p) => p.count === 0) ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
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
                <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  wrapperStyle={{ color: "#9ca3af", fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module abandonment */}
        <ChartCard title="Módulos com maior abandono">
          {data.moduleAbandonment.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={data.moduleAbandonment}
                layout="vertical"
                margin={{ left: 16, right: 16 }}
              >
                <CartesianGrid
                  stroke="#1f2937"
                  strokeDasharray="3 3"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  stroke="#9ca3af"
                  fontSize={11}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="title"
                  stroke="#9ca3af"
                  fontSize={11}
                  width={140}
                  tickFormatter={(v: string) =>
                    v.length > 20 ? `${v.slice(0, 20)}…` : v
                  }
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: "rgba(244, 114, 182, 0.08)" }}
                  labelStyle={labelStyle}
                />
                <Bar
                  dataKey="count"
                  name="Alunos parados aqui"
                  fill="#f472b6"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Top lessons */}
        <ChartCard title="Aulas mais assistidas (top 10)">
          {data.topLessons.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={data.topLessons}
                layout="vertical"
                margin={{ left: 16, right: 16 }}
              >
                <CartesianGrid
                  stroke="#1f2937"
                  strokeDasharray="3 3"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  stroke="#9ca3af"
                  fontSize={11}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="title"
                  stroke="#9ca3af"
                  fontSize={11}
                  width={140}
                  tickFormatter={(v: string) =>
                    v.length > 20 ? `${v.slice(0, 20)}…` : v
                  }
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: "rgba(168, 85, 247, 0.08)" }}
                  labelStyle={labelStyle}
                />
                <Bar
                  dataKey="views"
                  name="Conclusões"
                  fill="#a855f7"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Top engaged students */}
      <SectionCard title="Top 10 alunos mais engajados">
        {sortedTop.length === 0 ? (
          <Empty />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-200 dark:border-gray-800 text-xs uppercase tracking-wider text-gray-500">
                  <Th label="Nome" k="name" sort={topSort} onClick={toggleSort} />
                  <Th label="Email" k="email" sort={topSort} onClick={toggleSort} />
                  <Th label="Pontos" k="points" sort={topSort} onClick={toggleSort} />
                  <Th
                    label="Aulas"
                    k="completed"
                    sort={topSort}
                    onClick={toggleSort}
                  />
                  <Th
                    label="Progresso"
                    k="progress"
                    sort={topSort}
                    onClick={toggleSort}
                  />
                  <Th
                    label="Último acesso"
                    k="lastActive"
                    sort={topSort}
                    onClick={toggleSort}
                  />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {sortedTop.map((s) => (
                  <tr
                    key={s.userId}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/40"
                  >
                    <td className="py-3 pr-4 text-gray-900 dark:text-white">
                      {s.name}
                    </td>
                    <td className="py-3 pr-4 text-gray-500">{s.email}</td>
                    <td className="py-3 pr-4 text-amber-500 dark:text-amber-400 font-medium">
                      {s.points}
                    </td>
                    <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                      {s.completed}/{s.total}
                    </td>
                    <td className="py-3 pr-4">
                      <ProgressBar value={s.progress} />
                    </td>
                    <td className="py-3 pr-4 text-gray-500">
                      {formatDate(s.lastActive)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Inactive */}
      <SectionCard title="Alunos inativos (sem acesso há mais de 30 dias)">
        {data.inactiveStudentsList.length === 0 ? (
          <Empty />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-200 dark:border-gray-800 text-xs uppercase tracking-wider text-gray-500">
                  <th className="py-2 pr-4 font-medium">Nome</th>
                  <th className="py-2 pr-4 font-medium">Email</th>
                  <th className="py-2 pr-4 font-medium">Último acesso</th>
                  <th className="py-2 pr-4 font-medium">Progresso</th>
                  <th className="py-2 pr-4 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {data.inactiveStudentsList.map((s) => (
                  <tr
                    key={s.userId}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/40"
                  >
                    <td className="py-3 pr-4 text-gray-900 dark:text-white">
                      {s.name}
                    </td>
                    <td className="py-3 pr-4 text-gray-500">{s.email}</td>
                    <td className="py-3 pr-4 text-gray-500">
                      {formatDate(s.lastActive)}
                    </td>
                    <td className="py-3 pr-4">
                      <ProgressBar value={s.progress} />
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          handleResend(s.courseId, s.enrollmentId)
                        }
                        disabled={
                          resending === s.enrollmentId || !s.enrollmentId
                        }
                      >
                        {resending === s.enrollmentId
                          ? "Enviando…"
                          : "Reenviar link"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Never accessed */}
      <SectionCard title="Alunos que nunca acessaram">
        {data.neverAccessedStudents.length === 0 ? (
          <Empty />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-200 dark:border-gray-800 text-xs uppercase tracking-wider text-gray-500">
                  <th className="py-2 pr-4 font-medium">Nome</th>
                  <th className="py-2 pr-4 font-medium">Email</th>
                  <th className="py-2 pr-4 font-medium">Matriculado em</th>
                  <th className="py-2 pr-4 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {data.neverAccessedStudents.map((s) => (
                  <tr
                    key={s.enrollmentId}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/40"
                  >
                    <td className="py-3 pr-4 text-gray-900 dark:text-white">
                      {s.name}
                    </td>
                    <td className="py-3 pr-4 text-gray-500">{s.email}</td>
                    <td className="py-3 pr-4 text-gray-500">
                      {formatDate(s.enrolledAt)}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          handleResend(s.courseId, s.enrollmentId)
                        }
                        disabled={resending === s.enrollmentId}
                      >
                        {resending === s.enrollmentId
                          ? "Enviando…"
                          : "Reenviar link"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-3 rounded-lg shadow-lg text-sm">
          {toast}
        </div>
      )}
    </div>
  );
}

const tooltipStyle = {
  backgroundColor: "#0f172a",
  border: "1px solid #1f2937",
  borderRadius: 8,
  fontSize: 12,
  color: "#fff",
};
const labelStyle = { color: "#d1d5db" };

function KpiCard({
  label,
  value,
  accent,
  hint,
}: {
  label: string;
  value: number | string | React.ReactNode;
  accent: string;
  hint?: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 sm:p-5">
      <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p className={`mt-2 text-2xl sm:text-3xl font-bold ${accent}`}>{value}</p>
      {hint && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>
      )}
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
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
        {title}
      </h2>
      {children}
    </section>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 sm:p-6">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Empty() {
  return (
    <div className="h-[240px] flex items-center justify-center text-sm text-gray-500">
      Sem dados ainda.
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  const clamp = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
        <div
          className="h-full bg-blue-500"
          style={{ width: `${clamp}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-gray-600 dark:text-gray-400 w-10 text-right">
        {clamp}%
      </span>
    </div>
  );
}

function Th({
  label,
  k,
  sort,
  onClick,
}: {
  label: string;
  k: keyof TopStudent;
  sort: { key: keyof TopStudent; dir: "asc" | "desc" };
  onClick: (k: keyof TopStudent) => void;
}) {
  const active = sort.key === k;
  return (
    <th className="py-2 pr-4 font-medium">
      <button
        type="button"
        onClick={() => onClick(k)}
        className={`inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white transition ${
          active ? "text-gray-900 dark:text-white" : ""
        }`}
      >
        {label}
        <ArrowUpDown className="w-3 h-3" />
      </button>
    </th>
  );
}

function formatDate(v: string | null) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

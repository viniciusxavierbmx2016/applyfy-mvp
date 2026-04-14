"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AreaChart,
  Area,
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
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

function Star({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
function ArrowUpDown({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m21 16-4 4-4-4" />
      <path d="M17 20V4" />
      <path d="m3 8 4-4 4 4" />
      <path d="M7 4v16" />
    </svg>
  );
}
function TrendUp({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}
function TrendDown({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
      <polyline points="16 17 22 17 22 11" />
    </svg>
  );
}
function UsersIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function SparkleIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    </svg>
  );
}
function CheckCircleIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
function ActivityIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
function MoonIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

interface CourseOption { id: string; title: string; }
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
interface KpiDeltas {
  newStudentsPrev: number;
  lessonsCompleted: number;
  lessonsCompletedPrev: number;
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
interface Diagnosis {
  hasData: boolean;
  positivePoint: string;
  engagementProblem: string;
  improvementOpportunity: string;
  monetizationOpportunity: string;
}

interface AnalyticsData {
  courses: CourseOption[];
  selectedCourseId: string;
  window: number;
  kpis: Kpis;
  kpiDeltas: KpiDeltas;
  newEnrollmentsPerDay: Array<{ day: string; count: number }>;
  lessonsCompletedPerDay: Array<{ day: string; count: number }>;
  progressDistribution: Array<{ bucket: string; count: number }>;
  moduleAbandonment: Array<{ moduleId: string; title: string; count: number }>;
  topLessons: Array<{ id: string; title: string; views: number }>;
  postsByType: Array<{ type: string; label: string; count: number }>;
  topStudents: TopStudent[];
  inactiveStudentsList: InactiveStudent[];
  neverAccessedStudents: NeverAccessed[];
  diagnosis?: Diagnosis;
}

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899"];
const DIST_COLORS = ["#f43f5e", "#f59e0b", "#3b82f6", "#10b981"];

interface AdminAnalyticsContentProps {
  courseId?: string;
  windowDays?: 7 | 30 | 90;
}

export function AdminAnalyticsContent({
  courseId: courseIdProp,
  windowDays: windowDaysProp,
}: AdminAnalyticsContentProps = {}) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const courseId = courseIdProp ?? "all";
  const windowDays = windowDaysProp ?? 30;
  const [topSort, setTopSort] = useState<{ key: keyof TopStudent; dir: "asc" | "desc" }>({ key: "points", dir: "desc" });
  const [resending, setResending] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (courseId !== "all") qs.set("courseId", courseId);
    qs.set("window", String(windowDays));
    qs.set("tab", "overview");
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

  async function handleResend(courseIdArg: string | null, enrollmentId: string | null) {
    if (!courseIdArg || !enrollmentId) {
      setToast("Não foi possível reenviar (matrícula ausente).");
      setTimeout(() => setToast(null), 4000);
      return;
    }
    setResending(enrollmentId);
    try {
      const res = await fetch(
        `/api/courses/${courseIdArg}/students/${enrollmentId}/resend`,
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

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
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

  const totalPosts = data.postsByType.reduce((s, p) => s + p.count, 0);

  const newDelta = pctDelta(data.kpis.newStudents, data.kpiDeltas.newStudentsPrev);
  const lessonsDelta = pctDelta(data.kpiDeltas.lessonsCompleted, data.kpiDeltas.lessonsCompletedPrev);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        <KpiCard
          icon={<UsersIcon className="w-4 h-4" />}
          label="Alunos totais"
          value={data.kpis.uniqueStudents}
          accent="blue"
          hint={`${data.kpis.totalEnrolled} matrículas`}
        />
        <KpiCard
          icon={<SparkleIcon className="w-4 h-4" />}
          label={`Novos (${windowDays}d)`}
          value={data.kpis.newStudents}
          accent="emerald"
          delta={newDelta}
        />
        <KpiCard
          icon={<CheckCircleIcon className="w-4 h-4" />}
          label="Conclusão média"
          value={`${data.kpis.avgCompletion}%`}
          accent="teal"
        />
        <KpiCard
          icon={<Star className="w-4 h-4" />}
          label="Nota média"
          value={
            data.kpis.ratingCount > 0 ? (
              <span className="inline-flex items-center gap-1.5">
                {data.kpis.avgRating.toFixed(1)}
                <Star className="w-5 h-5 text-amber-400" />
              </span>
            ) : "—"
          }
          accent="amber"
          hint={data.kpis.ratingCount > 0 ? `${data.kpis.ratingCount} avaliações` : "Sem avaliações"}
        />
        <KpiCard
          icon={<ActivityIcon className="w-4 h-4" />}
          label="Ativos (7d)"
          value={data.kpis.activeStudents}
          accent="purple"
          delta={lessonsDelta}
          deltaLabel="aulas"
        />
        <KpiCard
          icon={<MoonIcon className="w-4 h-4" />}
          label="Inativos (30d+)"
          value={data.kpis.inactiveStudents}
          accent="rose"
          hint={`${data.kpis.neverAccessed} nunca acessaram`}
        />
      </div>

      {/* Two-column charts: area + bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <ChartCard title="Novas matrículas" subtitle={`Últimos ${windowDays} dias`}>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.newEnrollmentsPerDay} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="enrollGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="currentColor" className="text-gray-200 dark:text-gray-800" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" stroke="currentColor" className="text-gray-400" fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={28} />
              <YAxis stroke="currentColor" className="text-gray-400" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip color="#3b82f6" />} />
              <Area type="monotone" dataKey="count" name="Matrículas" stroke="#3b82f6" strokeWidth={2.5} fill="url(#enrollGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Aulas concluídas" subtitle={`Últimos ${windowDays} dias`}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.lessonsCompletedPerDay} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="currentColor" className="text-gray-200 dark:text-gray-800" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" stroke="currentColor" className="text-gray-400" fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={28} />
              <YAxis stroke="currentColor" className="text-gray-400" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip cursor={{ fill: "rgba(16, 185, 129, 0.06)" }} content={<CustomTooltip color="#10b981" />} />
              <Bar dataKey="count" name="Concluídas" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Two-column: progress dist + community donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <ChartCard title="Distribuição de progresso" subtitle="Quantos alunos em cada faixa">
          {data.progressDistribution.every((b) => b.count === 0) ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.progressDistribution} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid stroke="currentColor" className="text-gray-200 dark:text-gray-800" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" stroke="currentColor" className="text-gray-400" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="bucket" stroke="currentColor" className="text-gray-400" fontSize={12} tickLine={false} axisLine={false} width={70} />
                <Tooltip cursor={{ fill: "rgba(59, 130, 246, 0.05)" }} content={<CustomTooltip color="#3b82f6" />} />
                <Bar dataKey="count" name="Alunos" radius={[0, 6, 6, 0]} maxBarSize={32}>
                  {data.progressDistribution.map((_, i) => (
                    <Cell key={i} fill={DIST_COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Engajamento na comunidade" subtitle="Posts por tipo">
          {totalPosts === 0 ? <Empty /> : (
            <div className="relative">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={data.postsByType} dataKey="count" nameKey="label" cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={3} stroke="none">
                    {data.postsByType.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold tabular-nums text-gray-900 dark:text-white">{totalPosts}</span>
                <span className="text-xs uppercase tracking-wider text-gray-500 mt-0.5">posts</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {data.postsByType.map((p, i) => (
                  <div key={p.type} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-gray-600 dark:text-gray-400">{p.label}</span>
                    <span className="ml-auto font-semibold text-gray-900 dark:text-white tabular-nums">{p.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Module abandonment + Top lessons (only when course selected) */}
      {data.selectedCourseId ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <SectionCard title="Módulos com maior abandono" subtitle="Onde os alunos param">
            {data.moduleAbandonment.length === 0 ? <Empty /> : (
              <RankedBars items={data.moduleAbandonment.map((m) => ({ label: m.title, value: m.count }))} colorHi="#f43f5e" colorLo="#10b981" suffix=" alunos" />
            )}
          </SectionCard>
          <SectionCard title="Top 10 aulas mais assistidas" subtitle="Por número de conclusões">
            {data.topLessons.length === 0 ? <Empty /> : (
              <RankedBars items={data.topLessons.map((l) => ({ label: l.title, value: l.views }))} colorHi="#a855f7" colorLo="#a855f7" suffix=" conclusões" />
            )}
          </SectionCard>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-800 p-6 text-center text-sm text-gray-500 dark:text-gray-400 bg-white/40 dark:bg-gray-900/40">
          Selecione um curso específico no filtro acima para ver módulos com maior abandono e aulas mais assistidas.
        </div>
      )}

      {/* Top engaged students */}
      <SectionCard title="Top 10 alunos mais engajados" subtitle="Ordene por qualquer coluna">
        {sortedTop.length === 0 ? <Empty /> : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-200 dark:border-gray-800 text-[11px] uppercase tracking-wider text-gray-500">
                  <Th label="Aluno" k="name" sort={topSort} onClick={toggleSort} />
                  <Th label="Pontos" k="points" sort={topSort} onClick={toggleSort} />
                  <Th label="Aulas" k="completed" sort={topSort} onClick={toggleSort} />
                  <Th label="Progresso" k="progress" sort={topSort} onClick={toggleSort} />
                  <Th label="Último acesso" k="lastActive" sort={topSort} onClick={toggleSort} />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                {sortedTop.map((s, i) => (
                  <tr key={s.userId} className={`${i % 2 === 1 ? "bg-gray-50/50 dark:bg-gray-900/30" : ""} hover:bg-blue-50/50 dark:hover:bg-blue-500/5 transition-colors`}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={s.name} />
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">{s.name}</p>
                          <p className="text-xs text-gray-500 truncate">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold text-xs tabular-nums">
                        <Star className="w-3 h-3" />
                        {s.points}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300 tabular-nums">
                      {s.completed}<span className="text-gray-400">/{s.total}</span>
                    </td>
                    <td className="py-3 px-4"><ProgressBar value={s.progress} /></td>
                    <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{formatDate(s.lastActive)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Inactive */}
      <SectionCard title="Alunos inativos" subtitle="Sem acesso há mais de 30 dias">
        {data.inactiveStudentsList.length === 0 ? <Empty /> : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-200 dark:border-gray-800 text-[11px] uppercase tracking-wider text-gray-500">
                  <th className="py-2 px-4 font-medium">Aluno</th>
                  <th className="py-2 px-4 font-medium">Inativo há</th>
                  <th className="py-2 px-4 font-medium">Progresso</th>
                  <th className="py-2 px-4 font-medium text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                {data.inactiveStudentsList.map((s, i) => {
                  const days = daysSince(s.lastActive);
                  return (
                    <tr key={s.userId} className={`${i % 2 === 1 ? "bg-gray-50/50 dark:bg-gray-900/30" : ""} hover:bg-rose-50/40 dark:hover:bg-rose-500/5 transition-colors`}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={s.name} />
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">{s.name}</p>
                            <p className="text-xs text-gray-500 truncate">{s.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                          {days != null ? `${days} dias` : "—"}
                        </span>
                      </td>
                      <td className="py-3 px-4"><ProgressBar value={s.progress} /></td>
                      <td className="py-3 px-4 text-right">
                        <Button size="sm" variant="secondary" onClick={() => handleResend(s.courseId, s.enrollmentId)} disabled={resending === s.enrollmentId || !s.enrollmentId}>
                          {resending === s.enrollmentId ? "Enviando…" : "Reenviar link"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Never accessed */}
      <SectionCard title="Nunca acessaram" subtitle="Matriculados que ainda não entraram no curso">
        {data.neverAccessedStudents.length === 0 ? <Empty /> : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-200 dark:border-gray-800 text-[11px] uppercase tracking-wider text-gray-500">
                  <th className="py-2 px-4 font-medium">Aluno</th>
                  <th className="py-2 px-4 font-medium">Matriculado em</th>
                  <th className="py-2 px-4 font-medium text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                {data.neverAccessedStudents.map((s, i) => (
                  <tr key={s.enrollmentId} className={`${i % 2 === 1 ? "bg-gray-50/50 dark:bg-gray-900/30" : ""} hover:bg-blue-50/40 dark:hover:bg-blue-500/5 transition-colors`}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={s.name} />
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">{s.name}</p>
                          <p className="text-xs text-gray-500 truncate">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{formatDate(s.enrolledAt)}</td>
                    <td className="py-3 px-4 text-right">
                      <Button size="sm" variant="secondary" onClick={() => handleResend(s.courseId, s.enrollmentId)} disabled={resending === s.enrollmentId}>
                        {resending === s.enrollmentId ? "Enviando…" : "Reenviar link"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Diagnosis */}
      {data.diagnosis && (
        <section className="space-y-4 pt-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden>🚀</span>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                Diagnóstico Geral
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Análise automática baseada nos seus dados
              </p>
            </div>
          </div>

          {data.diagnosis.hasData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DiagnosisCard
                icon="✅"
                title="Ponto positivo"
                text={data.diagnosis.positivePoint}
                tone="emerald"
              />
              <DiagnosisCard
                icon="⚠️"
                title="Problema de engajamento"
                text={data.diagnosis.engagementProblem}
                tone="amber"
              />
              <DiagnosisCard
                icon="💡"
                title="Oportunidade de melhoria"
                text={data.diagnosis.improvementOpportunity}
                tone="blue"
              />
              <DiagnosisCard
                icon="🚀"
                title="Oportunidade de monetização"
                text={data.diagnosis.monetizationOpportunity}
                tone="purple"
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-800 bg-white/40 dark:bg-gray-900/40 px-6 py-12 text-center">
              <span className="text-3xl block mb-2" aria-hidden>📊</span>
              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                Adicione mais alunos e conteúdo para gerar diagnósticos automáticos sobre seus cursos.
              </p>
            </div>
          )}
        </section>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-3 rounded-lg shadow-2xl text-sm font-medium animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}
    </div>
  );
}

const DIAG_TONE: Record<string, { border: string; bg: string; title: string }> = {
  emerald: {
    border: "border-l-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-500/5",
    title: "text-emerald-700 dark:text-emerald-400",
  },
  amber: {
    border: "border-l-amber-500",
    bg: "bg-amber-50 dark:bg-amber-500/5",
    title: "text-amber-700 dark:text-amber-400",
  },
  blue: {
    border: "border-l-blue-500",
    bg: "bg-blue-50 dark:bg-blue-500/5",
    title: "text-blue-700 dark:text-blue-400",
  },
  purple: {
    border: "border-l-purple-500",
    bg: "bg-purple-50 dark:bg-purple-500/5",
    title: "text-purple-700 dark:text-purple-400",
  },
};

function DiagnosisCard({
  icon,
  title,
  text,
  tone,
}: {
  icon: string;
  title: string;
  text: string;
  tone: "emerald" | "amber" | "blue" | "purple";
}) {
  const t = DIAG_TONE[tone];
  return (
    <div className={`flex items-start gap-4 rounded-xl border-l-[3px] ${t.border} ${t.bg} px-5 py-5`}>
      <span className="text-2xl leading-none shrink-0" aria-hidden>{icon}</span>
      <div className="min-w-0">
        <p className={`text-sm font-semibold ${t.title}`}>{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{text}</p>
      </div>
    </div>
  );
}

const ACCENT_MAP: Record<string, { text: string; bg: string; ring: string }> = {
  blue: { text: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10", ring: "ring-blue-500/20" },
  emerald: { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", ring: "ring-emerald-500/20" },
  teal: { text: "text-teal-600 dark:text-teal-400", bg: "bg-teal-50 dark:bg-teal-500/10", ring: "ring-teal-500/20" },
  amber: { text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10", ring: "ring-amber-500/20" },
  purple: { text: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-500/10", ring: "ring-purple-500/20" },
  rose: { text: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-500/10", ring: "ring-rose-500/20" },
};

function KpiCard({
  icon,
  label,
  value,
  accent,
  hint,
  delta,
  deltaLabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string | React.ReactNode;
  accent: keyof typeof ACCENT_MAP;
  hint?: string;
  delta?: number | null;
  deltaLabel?: string;
}) {
  const a = ACCENT_MAP[accent];
  const trendUp = delta != null && delta > 0;
  const trendDown = delta != null && delta < 0;
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700 transition">
      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${a.bg} ${a.text}`}>
          {icon}
        </span>
        {delta != null && (
          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold tabular-nums ${trendUp ? "text-emerald-600 dark:text-emerald-400" : trendDown ? "text-rose-600 dark:text-rose-400" : "text-gray-400"}`}>
            {trendUp ? <TrendUp className="w-3 h-3" /> : trendDown ? <TrendDown className="w-3 h-3" /> : null}
            {Math.abs(delta).toFixed(0)}%
            {deltaLabel ? <span className="font-normal text-gray-400 ml-0.5">{deltaLabel}</span> : null}
          </span>
        )}
      </div>
      <p className="mt-3 text-[11px] font-medium uppercase tracking-wider text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl sm:text-3xl font-bold ${a.text}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-6">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-6">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Empty() {
  return (
    <div className="h-[200px] flex items-center justify-center text-sm text-gray-500">
      Sem dados ainda.
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  const clamp = Math.max(0, Math.min(100, value));
  const color = clamp >= 75 ? "bg-emerald-500" : clamp >= 50 ? "bg-blue-500" : clamp >= 25 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="flex items-center gap-2 min-w-[140px]">
      <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${clamp}%` }} />
      </div>
      <span className="text-xs tabular-nums text-gray-600 dark:text-gray-400 w-9 text-right font-medium">{clamp}%</span>
    </div>
  );
}

function Th({ label, k, sort, onClick }: { label: string; k: keyof TopStudent; sort: { key: keyof TopStudent; dir: "asc" | "desc" }; onClick: (k: keyof TopStudent) => void; }) {
  const active = sort.key === k;
  return (
    <th className="py-2 px-4 font-medium">
      <button
        type="button"
        onClick={() => onClick(k)}
        className={`inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white transition ${active ? "text-gray-900 dark:text-white" : ""}`}
      >
        {label}
        <ArrowUpDown className="w-3 h-3 opacity-60" />
      </button>
    </th>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("") || "?";
  const palette = ["bg-blue-500/15 text-blue-600 dark:text-blue-300", "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300", "bg-amber-500/15 text-amber-600 dark:text-amber-300", "bg-purple-500/15 text-purple-600 dark:text-purple-300", "bg-rose-500/15 text-rose-600 dark:text-rose-300"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const cls = palette[h % palette.length];
  return (
    <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-xs font-semibold shrink-0 ${cls}`}>
      {initials}
    </span>
  );
}

function RankedBars({ items, colorHi, colorLo, suffix = "" }: { items: Array<{ label: string; value: number }>; colorHi: string; colorLo: string; suffix?: string }) {
  const max = items.reduce((m, it) => Math.max(m, it.value), 0) || 1;
  return (
    <ul className="space-y-3">
      {items.map((it, idx) => {
        const pct = (it.value / max) * 100;
        const color = colorHi === colorLo ? colorHi : interpColor(colorHi, colorLo, idx / Math.max(items.length - 1, 1));
        return (
          <li key={`${it.label}-${idx}`}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-700 dark:text-gray-300 truncate pr-3" title={it.label}>{it.label || "—"}</span>
              <span className="text-gray-500 tabular-nums whitespace-nowrap">{it.value}{suffix}</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function CustomTooltip({ active, payload, label, color }: { active?: boolean; payload?: Array<{ name?: string; value?: number; payload?: { label?: string } }>; label?: string; color?: string }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 shadow-lg text-xs">
      <p className="text-gray-500 mb-0.5">{label || p.payload?.label}</p>
      <p className="font-semibold tabular-nums" style={{ color: color || "#3b82f6" }}>
        {p.name}: {p.value}
      </p>
    </div>
  );
}

function formatDate(v: string | null) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "—";
  }
}

function daysSince(v: string | null): number | null {
  if (!v) return null;
  const t = new Date(v).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}

function pctDelta(curr: number, prev: number): number | null {
  if (prev === 0 && curr === 0) return null;
  if (prev === 0) return 100;
  return ((curr - prev) / prev) * 100;
}

function hexToRgb(hex: string) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return { r: 0, g: 0, b: 0 };
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}
function interpColor(a: string, b: string, t: number) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const r = Math.round(ca.r + (cb.r - ca.r) * t);
  const g = Math.round(ca.g + (cb.g - ca.g) * t);
  const bl = Math.round(ca.b + (cb.b - ca.b) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

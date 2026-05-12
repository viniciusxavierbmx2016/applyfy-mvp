"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Section,
  KpiCard,
  AlertRow,
  ProgressRow,
  EmptyState,
} from "@/components/reports-shared";

/* ─────────────────────────────────────────────────────────────
   Overview tab — composite of content + students analytics.
   Fetches both endpoints in parallel and aggregates into:
     - 4 KPIs (engagement / access / completion / 7-day return)
     - Retention alerts (never / inactive / expired)
     - Module progress + Conversion funnel (side-by-side)
───────────────────────────────────────────────────────────── */

interface OverviewUser {
  progressPercent: number;
  lastAccessedAt: string | null;
}

interface ContentData {
  modulesLeastCompleted: Array<{
    moduleId: string;
    moduleTitle: string;
    totalStudents: number;
    completedCount: number;
    completedPercent: number;
  }>;
}

interface StudentsData {
  topEngaged: OverviewUser[];
  inactiveGrouped: {
    "30-60": OverviewUser[];
    "60-90": OverviewUser[];
    "90+": OverviewUser[];
  };
  neverAccessed: OverviewUser[];
  expiredCount: number;
}

interface Props {
  courseId: string;
  startDate?: string;
  endDate?: string;
}

/* ─── Icons (inline SVG — codebase convention) ─── */

const ICON = "w-5 h-5";

const UsersIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={ICON}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const DoorIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={ICON}>
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <polyline points="10 17 15 12 10 7" />
    <line x1="15" y1="12" x2="3" y2="12" />
  </svg>
);

const TargetIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={ICON}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const RefreshIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={ICON}>
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const AlertIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={ICON}>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const LayersIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={ICON}>
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

const FunnelIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={ICON}>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

const InboxIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </svg>
);

export function ReportsOverviewTab({ courseId, startDate, endDate }: Props) {
  const [content, setContent] = useState<ContentData | null>(null);
  const [students, setStudents] = useState<StudentsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const base = new URLSearchParams();
    if (courseId !== "all") base.set("courseId", courseId);
    if (startDate) base.set("startDate", startDate);
    if (endDate) base.set("endDate", endDate);

    const contentQs = new URLSearchParams(base);
    contentQs.set("tab", "content");
    const studentsQs = new URLSearchParams(base);
    studentsQs.set("tab", "students");

    Promise.all([
      fetch(`/api/producer/analytics?${contentQs.toString()}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`/api/producer/analytics?${studentsQs.toString()}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([c, s]) => {
        setContent(c);
        setStudents(s);
      })
      .finally(() => setLoading(false));
  }, [courseId, startDate, endDate]);

  if (loading && !students && !content) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-56" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!students || !content) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Erro ao carregar visão geral</p>
      </div>
    );
  }

  // ─── Compute KPIs ───
  const engagedCount = students.topEngaged.length;
  const inactiveCount =
    (students.inactiveGrouped["30-60"]?.length ?? 0) +
    (students.inactiveGrouped["60-90"]?.length ?? 0) +
    (students.inactiveGrouped["90+"]?.length ?? 0);
  const neverAccessedCount = students.neverAccessed.length;
  const expiredCount = students.expiredCount;
  const totalStudents = engagedCount + inactiveCount + neverAccessedCount;

  const accessedCount = engagedCount + inactiveCount;
  const accessRate =
    totalStudents > 0 ? Math.round((accessedCount / totalStudents) * 100) : 0;

  const avgProgress =
    engagedCount > 0
      ? Math.round(
          students.topEngaged.reduce((s, e) => s + (e.progressPercent ?? 0), 0) /
            engagedCount
        )
      : 0;

  // Date.now() during render is intentional here — the "7-day return" metric
  // is read against wall-clock time and re-derives on every fetch via useEffect.
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const sevenDaysAgo = nowMs - 7 * 86400000;
  const recentlyActive = students.topEngaged.filter((s) => {
    if (!s.lastAccessedAt) return false;
    const t = new Date(s.lastAccessedAt).getTime();
    return !Number.isNaN(t) && t >= sevenDaysAgo;
  }).length;
  const returnRate =
    engagedCount > 0 ? Math.round((recentlyActive / engagedCount) * 100) : 0;

  // ─── Funnel ───
  const startedCount = accessedCount;
  const halfDoneCount = students.topEngaged.filter(
    (s) => (s.progressPercent ?? 0) >= 50
  ).length;
  const certifiedCount = students.topEngaged.filter(
    (s) => (s.progressPercent ?? 0) >= 100
  ).length;

  const modules = content.modulesLeastCompleted.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* ─── KPIs ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total de alunos"
          value={totalStudents}
          icon={UsersIcon}
          sub={`${engagedCount} no top engajamento`}
        />
        <KpiCard
          label="Taxa de acesso"
          value={`${accessRate}%`}
          icon={DoorIcon}
          sub={`${accessedCount} de ${totalStudents} acessaram`}
        />
        <KpiCard
          label="Conclusão média"
          value={`${avgProgress}%`}
          icon={TargetIcon}
          sub="média do top engajamento"
          valueColor="#3b82f6"
        />
        <KpiCard
          label="Retorno (7 dias)"
          value={`${returnRate}%`}
          icon={RefreshIcon}
          sub={`${recentlyActive} acessaram esta semana`}
          valueColor="#10b981"
        />
      </div>

      {/* ─── Retention alerts ─── */}
      <Section
        title="Alertas de retenção"
        description="Onde estão os alunos que pararam de avançar — priorize reativação"
        icon={AlertIcon}
        iconColor="#f59e0b"
      >
        <div className="space-y-3">
          <AlertRow
            label="Nunca acessaram"
            description="Matriculados que ainda não abriram o curso"
            count={neverAccessedCount}
            dotColor="#ef4444"
          />
          <AlertRow
            label="Inativos 30+ dias"
            description="Alunos engajados que sumiram nos últimos 30 dias"
            count={inactiveCount}
            dotColor="#f59e0b"
          />
          <AlertRow
            label="Acesso expirado"
            description="Oportunidade de reativação com oferta de renovação"
            count={expiredCount}
            dotColor="#3b82f6"
          />
        </div>
      </Section>

      {/* ─── Modules + Funnel side-by-side ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section
          title="Progresso por módulo"
          description="Top 5 módulos com menor taxa de conclusão"
          icon={LayersIcon}
          iconColor="#3b82f6"
        >
          {modules.length === 0 ? (
            <EmptyState
              icon={InboxIcon}
              message="Sem dados de módulos para este curso ou período."
            />
          ) : (
            <div className="space-y-5">
              {modules.map((m) => (
                <ProgressRow
                  key={m.moduleId}
                  label={m.moduleTitle}
                  value={m.completedCount}
                  max={m.totalStudents || 1}
                  color="#3b82f6"
                  displayValue={`${m.completedPercent}%`}
                />
              ))}
            </div>
          )}
        </Section>

        <Section
          title="Funil de conversão"
          description="Onde os alunos param no caminho até a conclusão"
          icon={FunnelIcon}
          iconColor="#a855f7"
        >
          {totalStudents === 0 ? (
            <EmptyState
              icon={InboxIcon}
              message="Sem matrículas para este curso ou período."
            />
          ) : (
            <div className="space-y-5">
              <ProgressRow
                label="Matriculados"
                value={totalStudents}
                max={totalStudents}
                color="#3b82f6"
                displayValue={String(totalStudents)}
              />
              <ProgressRow
                label="Iniciaram o curso"
                value={startedCount}
                max={totalStudents}
                color="#f59e0b"
                displayValue={String(startedCount)}
              />
              <ProgressRow
                label="50%+ concluído"
                value={halfDoneCount}
                max={totalStudents}
                color="#a855f7"
                displayValue={String(halfDoneCount)}
              />
              <ProgressRow
                label="Concluíram (certificados)"
                value={certifiedCount}
                max={totalStudents}
                color="#10b981"
                displayValue={String(certifiedCount)}
              />
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

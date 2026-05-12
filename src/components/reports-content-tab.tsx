"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Section,
  KpiCard,
  LessonRow,
  ProgressRow,
  AlertRow,
  EmptyState,
} from "@/components/reports-shared";

/* ─────────────────────────────────────────────────────────────
   Lessons tab (URL key "lessons" — API tab "content").
   3 sections:
     1. Ranking de aulas + Taxa de conclusão (2 cols)
     2. Reações dos alunos (3 KpiCards)
     3. Progresso por módulo + Pontos de abandono (2 cols)
   InsightCard is re-exported for backwards-compat with
   students-tab until phase 4 redesigns that file.
───────────────────────────────────────────────────────────── */

interface LessonStat {
  lessonId: string;
  lessonTitle: string;
  moduleTitle: string;
  totalStudents: number;
  viewedCount: number;
  viewedPercent: number;
  completedCount: number;
  completedPercent: number;
  likeCount: number;
  dislikeCount: number;
}

interface ModuleStat {
  moduleId: string;
  moduleTitle: string;
  totalStudents: number;
  completedCount: number;
  completedPercent: number;
}

interface ContentData {
  lessonsMostViewed: LessonStat[];
  lessonsLeastViewed: LessonStat[];
  lessonsMostCompleted: LessonStat[];
  lessonsLeastCompleted: LessonStat[];
  lessonsMostLiked: LessonStat[];
  lessonsMostDisliked: LessonStat[];
  modulesLeastCompleted: ModuleStat[];
  modulesAbandonment: Array<{
    moduleId: string;
    moduleTitle: string;
    count: number;
  }>;
}

interface Props {
  courseId: string;
  startDate?: string;
  endDate?: string;
}

/* ─── Icons (inline SVG — codebase convention) ─── */

const ICON = "w-5 h-5";

const TrendingUpIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={ICON}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const CircleCheckIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={ICON}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const ThumbUpIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={ICON}>
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3z" />
    <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
  </svg>
);

const ThumbDownIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3z" />
    <path d="M17 2h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" />
  </svg>
);

const ThumbUpSmall = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3z" />
    <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
  </svg>
);

const LayersIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={ICON}>
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

const AlertTriangleIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={ICON}>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const InboxIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </svg>
);

/* ─── Helpers ─── */

function mergeAndSort<T extends { lessonId: string }>(
  top: T[],
  bottom: T[],
  comparator: (a: T, b: T) => number,
  limit = 10
): T[] {
  const map = new Map<string, T>();
  for (const item of top) map.set(item.lessonId, item);
  for (const item of bottom) if (!map.has(item.lessonId)) map.set(item.lessonId, item);
  return Array.from(map.values()).sort(comparator).slice(0, limit);
}

function completionColor(pct: number): string {
  if (pct >= 50) return "#10b981"; // emerald
  if (pct >= 20) return "#f59e0b"; // amber
  return "#ef4444"; // rose
}

/* ─── Component ─── */

export function ReportsContentTab({ courseId, startDate, endDate }: Props) {
  const [data, setData] = useState<ContentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    qs.set("tab", "content");
    if (courseId !== "all") qs.set("courseId", courseId);
    if (startDate) qs.set("startDate", startDate);
    if (endDate) qs.set("endDate", endDate);
    fetch(`/api/producer/analytics?${qs.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [courseId, startDate, endDate]);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
        <Skeleton className="h-44" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Erro ao carregar relatório de aulas</p>
      </div>
    );
  }

  /* ─── Derive merged rankings ─── */

  const viewedList = mergeAndSort(
    data.lessonsMostViewed,
    data.lessonsLeastViewed,
    (a, b) => b.viewedPercent - a.viewedPercent
  );

  const completionList = mergeAndSort(
    data.lessonsMostCompleted,
    data.lessonsLeastCompleted,
    (a, b) => b.completedPercent - a.completedPercent
  );

  const mostLiked = data.lessonsMostLiked[0];
  const mostDisliked = data.lessonsMostDisliked[0];
  const totalReactions = [
    ...data.lessonsMostLiked,
    ...data.lessonsMostDisliked,
  ].reduce((sum, l) => sum + (l.likeCount ?? 0) + (l.dislikeCount ?? 0), 0);
  const hasReactions = !!(mostLiked || mostDisliked);

  const modules = data.modulesLeastCompleted.slice(0, 5);
  const abandonment = data.modulesAbandonment.slice(0, 5);

  return (
    <div className="space-y-6 motion-safe:animate-[fadeIn_0.4s_ease-out]">
      {/* ─── Section 1: Ranking + Taxa de conclusão ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section
          title="Ranking de aulas"
          description="Ordenado por % de visualizações"
          icon={TrendingUpIcon}
          iconColor="#10b981"
        >
          {viewedList.length === 0 ? (
            <EmptyState icon={InboxIcon} message="Sem dados de visualização ainda." />
          ) : (
            <div className="space-y-1">
              {viewedList.map((l) => (
                <LessonRow
                  key={l.lessonId}
                  title={l.lessonTitle}
                  moduleName={l.moduleTitle}
                  percentage={l.viewedPercent}
                  barColor="#10b981"
                />
              ))}
            </div>
          )}
        </Section>

        <Section
          title="Taxa de conclusão"
          description="Quem acessou vs quem concluiu cada aula"
          icon={CircleCheckIcon}
          iconColor="#3b82f6"
        >
          {completionList.length === 0 ? (
            <EmptyState icon={InboxIcon} message="Sem dados de conclusão ainda." />
          ) : (
            <div className="space-y-1">
              {completionList.map((l) => (
                <LessonRow
                  key={l.lessonId}
                  title={l.lessonTitle}
                  moduleName={l.moduleTitle}
                  percentage={l.completedPercent}
                  barColor={completionColor(l.completedPercent)}
                />
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* ─── Section 2: Reações dos alunos ─── */}
      <Section
        title="Reações dos alunos"
        description="Feedback direto nas aulas"
        icon={ThumbUpIcon}
        iconColor="#a855f7"
      >
        {!hasReactions ? (
          <EmptyState
            icon={InboxIcon}
            message="Nenhuma reação registrada nas aulas ainda."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KpiCard
              label="Mais curtida"
              value={mostLiked?.likeCount ?? 0}
              icon={ThumbUpSmall}
              sub={mostLiked?.lessonTitle ?? "—"}
              valueColor="#10b981"
            />
            <KpiCard
              label="Total de reações"
              value={totalReactions}
              icon={ThumbUpSmall}
              sub="likes + dislikes somados"
            />
            <KpiCard
              label="Mais não-curtida"
              value={mostDisliked?.dislikeCount ?? 0}
              icon={ThumbDownIcon}
              sub={mostDisliked?.lessonTitle ?? "—"}
              valueColor="#ef4444"
            />
          </div>
        )}
      </Section>

      {/* ─── Section 3: Módulos ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section
          title="Progresso por módulo"
          description="Top 5 módulos com menor taxa de conclusão"
          icon={LayersIcon}
          iconColor="#3b82f6"
        >
          {modules.length === 0 ? (
            <EmptyState icon={InboxIcon} message="Sem dados de módulos." />
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
          title="Pontos de abandono"
          description="Onde os alunos pararam e não voltaram"
          icon={AlertTriangleIcon}
          iconColor="#ef4444"
        >
          {abandonment.length === 0 ? (
            <EmptyState
              icon={InboxIcon}
              message="Sem padrões de abandono detectados."
            />
          ) : (
            <div className="space-y-3">
              {abandonment.map((m) => (
                <AlertRow
                  key={m.moduleId}
                  label={m.moduleTitle}
                  description={`${m.count} aluno${m.count === 1 ? "" : "s"} parou neste módulo`}
                  count={m.count}
                  dotColor="#ef4444"
                />
              ))}
            </div>
          )}
        </Section>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

/* ─── InsightCard (kept for backwards-compat with students-tab) ─── */

type Tone = "emerald" | "amber" | "red" | "blue";

const TONE_TEXT: Record<Tone, string> = {
  emerald: "text-emerald-700 dark:text-emerald-300",
  amber: "text-amber-700 dark:text-amber-300",
  red: "text-rose-700 dark:text-rose-300",
  blue: "text-blue-700 dark:text-blue-300",
};

const TONE_BG: Record<Tone, string> = {
  emerald: "bg-emerald-50 dark:bg-emerald-500/5 border-l-emerald-500",
  amber: "bg-amber-50 dark:bg-amber-500/5 border-l-amber-500",
  red: "bg-rose-50 dark:bg-rose-500/5 border-l-rose-500",
  blue: "bg-blue-50 dark:bg-blue-500/5 border-l-blue-500",
};

export function InsightCard({
  tone,
  text,
  icon = "💡",
}: {
  tone: Tone;
  text: string;
  icon?: string;
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border-l-[3px] px-5 py-4 ${TONE_BG[tone]}`}
    >
      <span className="text-xl leading-none shrink-0 mt-0.5">{icon}</span>
      <p className={`text-sm leading-relaxed ${TONE_TEXT[tone]}`}>{text}</p>
    </div>
  );
}

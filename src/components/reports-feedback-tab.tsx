"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Section, KpiCard, EmptyState, formatDate } from "@/components/reports-shared";

interface ReasonStat {
  reason: string;
  label: string;
  count: number;
}

interface TopLesson {
  lessonTitle: string;
  moduleTitle: string;
  courseTitle: string;
  dislikeCount: number;
  topReason: string;
}

interface FeedbackComment {
  userName: string;
  userEmail: string;
  lessonTitle: string;
  moduleTitle: string;
  reason: string;
  reasonLabel: string;
  comment: string;
  createdAt: string;
}

interface FeedbackData {
  totalDislikes: number;
  byReason: ReasonStat[];
  topLessons: TopLesson[];
  comments: FeedbackComment[];
}

interface Props {
  courseId: string;
  startDate: string;
  endDate: string;
}

function ThumbDownIcon() {
  return (
    <svg className="w-5 h-5 rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

export function ReportsFeedbackTab({ courseId, startDate, endDate }: Props) {
  const [data, setData] = useState<FeedbackData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    qs.set("tab", "feedback");
    if (courseId !== "all") qs.set("courseId", courseId);
    if (startDate) qs.set("startDate", startDate);
    if (endDate) qs.set("endDate", endDate);
    fetch(`/api/producer/feedback?${qs.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [courseId, startDate, endDate]);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (!data) {
    return (
      <Section title="Feedback" description="Motivos e comentários dos dislikes">
        <EmptyState icon={<InboxIcon />} message="Não foi possível carregar o feedback." />
      </Section>
    );
  }

  const topReason = data.byReason[0];
  const topReasonPct =
    topReason && data.totalDislikes > 0
      ? Math.round((topReason.count / data.totalDislikes) * 100)
      : 0;
  const topLesson = data.topLessons[0];

  return (
    <div className="space-y-6">
      {/* ── Seção 1: KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Total de dislikes"
          value={data.totalDislikes}
          icon={<ThumbDownIcon />}
          sub="no período"
          valueColor="#ef4444"
        />
        <KpiCard
          label="Motivo mais frequente"
          value={topReason ? `${topReasonPct}%` : "—"}
          sub={topReason ? topReason.label : "Nenhum motivo registrado"}
        />
        <KpiCard
          label="Aula mais dislikada"
          value={topLesson ? topLesson.dislikeCount : 0}
          sub={topLesson ? topLesson.lessonTitle : "—"}
          valueColor="#ef4444"
        />
      </div>

      {/* ── Seção 2: Ranking de aulas ── */}
      <Section
        title="Aulas com mais feedback negativo"
        description="Ranking por número de dislikes no período"
        icon={<ThumbDownIcon />}
        iconColor="#ef4444"
      >
        {data.topLessons.length === 0 ? (
          <EmptyState icon={<InboxIcon />} message="Nenhum feedback negativo no período." />
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-[11px] text-gray-500 uppercase tracking-wider text-left">
                  <th className="font-medium pb-3 px-2">Módulo</th>
                  <th className="font-medium pb-3 px-2">Aula</th>
                  <th className="font-medium pb-3 px-2">Curso</th>
                  <th className="font-medium pb-3 px-2 text-right">Dislikes</th>
                  <th className="font-medium pb-3 px-2">Motivo principal</th>
                </tr>
              </thead>
              <tbody>
                {data.topLessons.map((l, i) => (
                  <tr key={i} className="border-t border-gray-100 dark:border-white/[0.06]">
                    <td className="py-3 px-2 text-gray-500 dark:text-gray-400">{l.moduleTitle}</td>
                    <td className="py-3 px-2 text-gray-900 dark:text-white">{l.lessonTitle}</td>
                    <td className="py-3 px-2 text-gray-500 dark:text-gray-400">{l.courseTitle}</td>
                    <td className="py-3 px-2 text-right tabular-nums font-medium text-red-600 dark:text-red-400">{l.dislikeCount}</td>
                    <td className="py-3 px-2 text-gray-700 dark:text-gray-300">{l.topReason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* ── Seção 3: Comentários recentes ── */}
      <Section
        title="Comentários dos alunos"
        description="Comentários escritos junto aos dislikes"
      >
        {data.comments.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">
            Nenhum comentário escrito pelos alunos no período.
          </p>
        ) : (
          <ul className="space-y-3">
            {data.comments.map((c, i) => (
              <li
                key={i}
                className="rounded-xl border border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02] p-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.userName}</p>
                    <p className="text-xs text-gray-500 truncate">{c.userEmail}</p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(c.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">&ldquo;{c.comment}&rdquo;</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400">{c.reasonLabel}</span>
                  <span>·</span>
                  <span>{c.moduleTitle} › {c.lessonTitle}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

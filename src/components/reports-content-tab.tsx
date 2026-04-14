"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface LessonStat {
  lessonId: string;
  lessonTitle: string;
  moduleTitle: string;
  totalStudents: number;
  viewedCount: number;
  viewedPercent: number;
  completedCount: number;
  completedPercent: number;
}

interface ModuleStat {
  moduleId: string;
  moduleTitle: string;
  totalStudents: number;
  completedCount: number;
  completedPercent: number;
}

interface ContentData {
  selectedCourseId: string;
  lessonsMostViewed: LessonStat[];
  lessonsLeastViewed: LessonStat[];
  lessonsMostCompleted: LessonStat[];
  lessonsLeastCompleted: LessonStat[];
  modulesLeastCompleted: ModuleStat[];
  modulesAbandonment: Array<{ moduleId: string; moduleTitle: string; count: number }>;
}

interface Props {
  courseId: string;
  startDate?: string;
  endDate?: string;
}

type Tone = "emerald" | "amber" | "red" | "blue";

const TONE_MAP: Record<
  Tone,
  { border: string; bg: string; text: string; bar: string; ring: string }
> = {
  emerald: {
    border: "border-l-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-500/5",
    text: "text-emerald-700 dark:text-emerald-300",
    bar: "bg-emerald-500",
    ring: "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  amber: {
    border: "border-l-amber-500",
    bg: "bg-amber-50 dark:bg-amber-500/5",
    text: "text-amber-700 dark:text-amber-300",
    bar: "bg-amber-500",
    ring: "bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  red: {
    border: "border-l-rose-500",
    bg: "bg-rose-50 dark:bg-rose-500/5",
    text: "text-rose-700 dark:text-rose-300",
    bar: "bg-rose-500",
    ring: "bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
  blue: {
    border: "border-l-blue-500",
    bg: "bg-blue-50 dark:bg-blue-500/5",
    text: "text-blue-700 dark:text-blue-300",
    bar: "bg-blue-500",
    ring: "bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
};

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
    fetch(`/api/admin/analytics?${qs.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [courseId, startDate, endDate]);

  if (loading && !data) {
    return (
      <div className="space-y-8">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Erro ao carregar relatório de conteúdo</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <LessonSection
        title="Aulas mais assistidas"
        subtitle="As 5 aulas que mais alunos acessaram"
        items={data.lessonsMostViewed}
        metric="viewed"
        tone="emerald"
        insight="Indicam conteúdos de entrada fortes, alto interesse do aluno e promessas claras e diretas."
      />

      <LessonSection
        title="Aulas menos assistidas"
        subtitle="As 5 aulas que menos alunos acessaram"
        items={data.lessonsLeastViewed}
        metric="viewed"
        tone="red"
        insight="Aulas com baixa visualização podem indicar títulos pouco atrativos, posicionamento ruim dentro do módulo ou baixa percepção de valor."
      />

      <LessonSection
        title="Aulas mais concluídas"
        subtitle="As 5 aulas com maior taxa de conclusão"
        items={data.lessonsMostCompleted}
        metric="completed"
        tone="emerald"
        insight="Indicam boa didática, conteúdo alinhado com a expectativa e tempo adequado de aula."
      />

      <LessonSection
        title="Aulas menos concluídas"
        subtitle="Foram acessadas, mas poucos alunos terminaram"
        items={data.lessonsLeastCompleted}
        metric="completed"
        tone="amber"
        insight="Aulas iniciadas e não concluídas podem indicar conteúdo longo demais, explicação complexa ou falta de retenção."
      />

      <ModuleSection
        title="Módulos menos concluídos"
        subtitle="% de alunos que terminaram todas as aulas do módulo"
        items={data.modulesLeastCompleted}
        tone="amber"
        insight="Quedas progressivas são naturais. Quedas abruptas indicam problema estrutural no módulo ou desalinhamento entre expectativa e conteúdo."
      />

      <AbandonmentSection
        title="Módulos com maior abandono"
        subtitle="Onde os alunos estão parando e não voltam"
        items={data.modulesAbandonment}
        tone="red"
        insight="Módulos com muito abandono merecem revisão urgente: cheque duração, promessa e transições entre aulas."
      />
    </div>
  );
}

function LessonSection({
  title,
  subtitle,
  items,
  metric,
  tone,
  insight,
}: {
  title: string;
  subtitle: string;
  items: LessonStat[];
  metric: "viewed" | "completed";
  tone: Tone;
  insight: string;
}) {
  const t = TONE_MAP[tone];
  return (
    <section className="space-y-4">
      <SectionHeader title={title} subtitle={subtitle} />
      <div className={`rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden`}>
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800/60">
            {items.map((item, i) => {
              const pct = metric === "viewed" ? item.viewedPercent : item.completedPercent;
              const count = metric === "viewed" ? item.viewedCount : item.completedCount;
              return (
                <li key={item.lessonId} className="flex items-center gap-4 px-5 py-4">
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold shrink-0 ${t.ring}`}>
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {item.lessonTitle}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{item.moduleTitle}</p>
                    <div className="mt-2 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <div
                        className={`h-full ${t.bar} transition-all`}
                        style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-2xl font-bold tabular-nums ${t.text}`}>{pct}%</p>
                    <p className="text-[11px] text-gray-400">{count}/{item.totalStudents}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <InsightCard tone={tone} text={insight} />
    </section>
  );
}

function ModuleSection({
  title,
  subtitle,
  items,
  tone,
  insight,
}: {
  title: string;
  subtitle: string;
  items: ModuleStat[];
  tone: Tone;
  insight: string;
}) {
  const t = TONE_MAP[tone];
  return (
    <section className="space-y-4">
      <SectionHeader title={title} subtitle={subtitle} />
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800/60">
            {items.map((m, i) => (
              <li key={m.moduleId} className="flex items-center gap-4 px-5 py-4">
                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold shrink-0 ${t.ring}`}>
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {m.moduleTitle}
                  </p>
                  <p className="text-xs text-gray-400">
                    {m.completedCount}/{m.totalStudents} concluíram
                  </p>
                  <div className="mt-2 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div
                      className={`h-full ${t.bar} transition-all`}
                      style={{ width: `${Math.max(2, Math.min(100, m.completedPercent))}%` }}
                    />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-2xl font-bold tabular-nums ${t.text}`}>{m.completedPercent}%</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <InsightCard tone={tone} text={insight} />
    </section>
  );
}

function AbandonmentSection({
  title,
  subtitle,
  items,
  tone,
  insight,
}: {
  title: string;
  subtitle: string;
  items: Array<{ moduleId: string; moduleTitle: string; count: number }>;
  tone: Tone;
  insight: string;
}) {
  const t = TONE_MAP[tone];
  const max = items.reduce((m, it) => Math.max(m, it.count), 0) || 1;
  return (
    <section className="space-y-4">
      <SectionHeader title={title} subtitle={subtitle} />
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800/60">
            {items.map((m, i) => (
              <li key={m.moduleId} className="flex items-center gap-4 px-5 py-4">
                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold shrink-0 ${t.ring}`}>
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {m.moduleTitle}
                  </p>
                  <p className="text-xs text-gray-400">
                    {m.count} aluno{m.count === 1 ? "" : "s"} parou aqui
                  </p>
                  <div className="mt-2 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div
                      className={`h-full ${t.bar} transition-all`}
                      style={{ width: `${(m.count / max) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-2xl font-bold tabular-nums ${t.text}`}>{m.count}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <InsightCard tone={tone} text={insight} />
    </section>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
        {title}
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
    </div>
  );
}

export function InsightCard({
  tone,
  text,
  icon = "💡",
}: {
  tone: Tone;
  text: string;
  icon?: string;
}) {
  const t = TONE_MAP[tone];
  return (
    <div className={`flex items-start gap-3 rounded-xl border-l-[3px] ${t.border} ${t.bg} px-5 py-4`}>
      <span className="text-xl leading-none shrink-0 mt-0.5">{icon}</span>
      <p className={`text-sm leading-relaxed ${t.text}`}>{text}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-12 px-6 text-center">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Ainda não há dados suficientes. Adicione mais conteúdo e alunos para ver métricas aqui.
      </p>
    </div>
  );
}

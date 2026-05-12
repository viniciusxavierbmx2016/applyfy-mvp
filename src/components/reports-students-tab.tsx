"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Section,
  StudentRow,
  AlertRow,
  EmptyState,
  daysSince,
  getAvatarColor,
} from "@/components/reports-shared";

/* ─────────────────────────────────────────────────────────────
   Students tab — 4 sections:
     1. Destaques de engajamento  (topEngaged)
     2. Alunos inativos           (inactiveGrouped + flat list)
     3. Nunca acessaram           (neverAccessed)
     4. Acesso expirado           (expiredStudents)
   Each section has its own CSV export and (where applicable)
   a "Reenviar acesso" action per row.
───────────────────────────────────────────────────────────── */

interface UserRow {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  points: number;
  lessonsCompleted: number;
  totalLessons: number;
  progressPercent: number;
  lastAccessedAt: string | null;
  enrollmentId: string | null;
  courseId: string | null;
  courseTitle: string;
}

interface ExpiredRow {
  userId: string;
  enrollmentId: string;
  courseId: string;
  courseTitle: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  expiresAt: string;
  lessonsCompleted: number;
  totalLessons: number;
  progressPercent: number;
}

interface StudentsData {
  topEngaged: UserRow[];
  inactiveGrouped: {
    "30-60": UserRow[];
    "60-90": UserRow[];
    "90+": UserRow[];
  };
  neverAccessed: UserRow[];
  expiredStudents: ExpiredRow[];
  expiredCount: number;
}

interface Props {
  courseId: string;
  startDate?: string;
  endDate?: string;
}

interface ToastMsg {
  message: string;
  type: "success" | "error";
}

/* ─── Icons ─── */

const ICON = "w-5 h-5";

const TrophyIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={ICON}>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <line x1="4" y1="22" x2="20" y2="22" />
    <line x1="10" y1="14.66" x2="10" y2="22" />
    <line x1="14" y1="14.66" x2="14" y2="22" />
    <path d="M18 2v6c0 3.31-2.69 6-6 6s-6-2.69-6-6V2z" />
  </svg>
);

const ClockIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={ICON}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const UserXIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={ICON}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <line x1="18" y1="8" x2="23" y2="13" />
    <line x1="23" y1="8" x2="18" y2="13" />
  </svg>
);

const ClockPauseIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={ICON}>
    <circle cx="12" cy="12" r="10" />
    <line x1="10" y1="9" x2="10" y2="15" />
    <line x1="14" y1="9" x2="14" y2="15" />
  </svg>
);

const InboxIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </svg>
);

/* ─── Resend button (small, dark) ─── */

function ResendButton({
  loading,
  disabled,
  onClick,
}: {
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.04] hover:text-gray-900 dark:hover:text-white hover:border-blue-500/30 dark:hover:border-blue-500/40 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
    >
      {loading ? "Enviando…" : "Reenviar acesso"}
    </button>
  );
}

/* ─── Component ─── */

export function ReportsStudentsTab({ courseId, startDate, endDate }: Props) {
  const [data, setData] = useState<StudentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMsg | null>(null);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    qs.set("tab", "students");
    if (courseId !== "all") qs.set("courseId", courseId);
    if (startDate) qs.set("startDate", startDate);
    if (endDate) qs.set("endDate", endDate);
    fetch(`/api/producer/analytics?${qs.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [courseId, startDate, endDate]);

  function handleExport(section: string) {
    const qs = new URLSearchParams();
    qs.set("tab", "students");
    qs.set("format", "csv");
    qs.set("section", section);
    if (courseId !== "all") qs.set("courseId", courseId);
    if (startDate) qs.set("startDate", startDate);
    if (endDate) qs.set("endDate", endDate);
    window.location.href = `/api/producer/analytics?${qs.toString()}`;
  }

  async function handleResend(
    enrollmentCourseId: string | null,
    enrollmentId: string | null
  ) {
    if (!enrollmentCourseId || !enrollmentId) {
      setToast({ message: "Matrícula ausente", type: "error" });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setResending(enrollmentId);
    try {
      const res = await fetch(
        `/api/courses/${enrollmentCourseId}/students/${enrollmentId}/resend`,
        { method: "POST" }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao reenviar");
      }
      setToast({ message: "Link reenviado com sucesso", type: "success" });
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : "Erro ao reenviar",
        type: "error",
      });
    } finally {
      setResending(null);
      setTimeout(() => setToast(null), 3000);
    }
  }

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-80" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
        <Skeleton className="h-56" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Erro ao carregar relatório de alunos</p>
      </div>
    );
  }

  /* ─── Derive lists ─── */

  const topEngaged = data.topEngaged.slice(0, 10);

  const inactive3060 = data.inactiveGrouped["30-60"] ?? [];
  const inactive6090 = data.inactiveGrouped["60-90"] ?? [];
  const inactive90 = data.inactiveGrouped["90+"] ?? [];
  const inactiveFlat = [...inactive3060, ...inactive6090, ...inactive90].slice(0, 5);

  const neverAccessed = data.neverAccessed.slice(0, 10);
  const expired = data.expiredStudents.slice(0, 10);

  return (
    <div className="space-y-6 motion-safe:animate-[fadeIn_0.4s_ease-out]">
      {/* ─── Section 1: Destaques de engajamento ─── */}
      <Section
        title="Destaques de engajamento"
        description="Alunos com maior atividade no período"
        icon={TrophyIcon}
        iconColor="#f59e0b"
        onExport={topEngaged.length > 0 ? () => handleExport("engaged") : undefined}
      >
        {topEngaged.length === 0 ? (
          <EmptyState
            icon={InboxIcon}
            message="Ainda não há dados de engajamento neste curso ou período."
          />
        ) : (
          <div className="space-y-2">
            {topEngaged.map((s, i) => (
              <StudentRow
                key={s.userId}
                name={s.name}
                email={s.email}
                avatarColor={getAvatarColor(i)}
                stats={[
                  { label: "Pontos", value: String(s.points) },
                  { label: "Aulas", value: `${s.lessonsCompleted}/${s.totalLessons}` },
                  { label: "Progresso", value: `${s.progressPercent}%` },
                ]}
                badge={topRankBadge(i)}
              />
            ))}
          </div>
        )}
      </Section>

      {/* ─── Section 2 + 3: Inativos / Nunca acessaram (lado a lado) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section
          title="Alunos inativos"
          description="Agrupados por tempo sem acesso"
          icon={ClockIcon}
          iconColor="#ef4444"
          onExport={
            inactiveFlat.length > 0 ? () => handleExport("inactive") : undefined
          }
        >
          {inactive3060.length + inactive6090.length + inactive90.length === 0 ? (
            <EmptyState
              icon={InboxIcon}
              message="Todos os alunos estão ativos — bom sinal!"
            />
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <AlertRow
                  label="30 a 60 dias"
                  description="Inativos no primeiro mês"
                  count={inactive3060.length}
                  dotColor="#f59e0b"
                />
                <AlertRow
                  label="60 a 90 dias"
                  description="Atenção: risco de churn"
                  count={inactive6090.length}
                  dotColor="#ef4444"
                />
                <AlertRow
                  label="90+ dias"
                  description="Provavelmente perdidos sem reativação"
                  count={inactive90.length}
                  dotColor="#6b7280"
                />
              </div>

              {inactiveFlat.length > 0 ? (
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-2 mt-6">
                    Primeiros {inactiveFlat.length} para reengajar
                  </div>
                  <div className="space-y-2">
                    {inactiveFlat.map((s, i) => {
                      const days = daysSince(s.lastAccessedAt);
                      return (
                        <StudentRow
                          key={s.userId + (s.enrollmentId ?? "")}
                          name={s.name}
                          email={s.email}
                          avatarColor={getAvatarColor(i + 3)}
                          badge={{
                            text: days > 0 ? `${days}d inativo` : "Inativo",
                            variant: "warning",
                          }}
                          actions={
                            <ResendButton
                              loading={resending === s.enrollmentId}
                              disabled={!s.enrollmentId}
                              onClick={() =>
                                handleResend(s.courseId, s.enrollmentId)
                              }
                            />
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </Section>

        <Section
          title="Nunca acessaram"
          description="Matriculados que não entraram no curso"
          icon={UserXIcon}
          iconColor="#f59e0b"
          onExport={
            neverAccessed.length > 0 ? () => handleExport("never") : undefined
          }
        >
          {neverAccessed.length === 0 ? (
            <EmptyState
              icon={InboxIcon}
              message="Todos os alunos já acessaram ao menos uma vez."
            />
          ) : (
            <div className="space-y-2">
              {neverAccessed.map((s, i) => (
                <StudentRow
                  key={s.userId + (s.enrollmentId ?? "")}
                  name={s.name}
                  email={s.email}
                  avatarColor={getAvatarColor(i + 1)}
                  badge={{ text: "Nunca acessou", variant: "warning" }}
                  actions={
                    <ResendButton
                      loading={resending === s.enrollmentId}
                      disabled={!s.enrollmentId}
                      onClick={() => handleResend(s.courseId, s.enrollmentId)}
                    />
                  }
                />
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* ─── Section 4: Acesso expirado ─── */}
      <Section
        title="Acesso expirado"
        description="Oportunidade de reativação com oferta de renovação"
        icon={ClockPauseIcon}
        iconColor="#3b82f6"
        onExport={expired.length > 0 ? () => handleExport("expired") : undefined}
      >
        {data.expiredCount === 0 ? (
          <EmptyState
            icon={InboxIcon}
            message="Nenhum aluno com acesso expirado."
          />
        ) : (
          <div className="space-y-2">
            <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400" />
              {data.expiredCount} aluno{data.expiredCount === 1 ? "" : "s"} no total
            </div>
            {expired.map((s) => {
              const days = daysSince(s.expiresAt);
              return (
                <StudentRow
                  key={s.enrollmentId}
                  name={s.name}
                  email={s.email}
                  avatarColor="bg-blue-500/20 text-blue-700 dark:text-blue-300"
                  stats={[
                    { label: "Progresso", value: `${s.progressPercent}%` },
                    { label: "Aulas", value: `${s.lessonsCompleted}/${s.totalLessons}` },
                  ]}
                  badge={{
                    text: days > 0 ? `Expirou há ${days}d` : "Expirado",
                    variant: "neutral",
                  }}
                />
              );
            })}
          </div>
        )}
      </Section>

      {/* ─── Toast ─── */}
      {toast ? (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-2xl text-sm font-medium border ${
            toast.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
          }`}
        >
          {toast.message}
        </div>
      ) : null}

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

/* ─── Helpers ─── */

function topRankBadge(
  index: number
): { text: string; variant: "success" | "warning" | "neutral" } | undefined {
  if (index === 0) return { text: "🥇 Top 1", variant: "success" };
  if (index === 1) return { text: "🥈 Top 2", variant: "neutral" };
  if (index === 2) return { text: "🥉 Top 3", variant: "warning" };
  return undefined;
}

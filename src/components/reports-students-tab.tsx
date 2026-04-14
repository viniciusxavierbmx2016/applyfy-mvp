"use client";

import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { InsightCard } from "@/components/reports-content-tab";

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
  selectedCourseId: string;
  topEngaged: UserRow[];
  inactiveGrouped: { "30-60": UserRow[]; "60-90": UserRow[]; "90+": UserRow[] };
  neverAccessed: UserRow[];
  expiredStudents: ExpiredRow[];
  expiredCount: number;
}

interface Props {
  courseId: string;
  startDate?: string;
  endDate?: string;
}

function DownloadIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
function ChevronDown({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="6 9 12 15 18 9" />
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
function MoonIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function ReportsStudentsTab({ courseId, startDate, endDate }: Props) {
  const [data, setData] = useState<StudentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<keyof UserRow>("points");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    qs.set("tab", "students");
    if (courseId !== "all") qs.set("courseId", courseId);
    if (startDate) qs.set("startDate", startDate);
    if (endDate) qs.set("endDate", endDate);
    fetch(`/api/admin/analytics?${qs.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [courseId, startDate, endDate]);

  const sortedEngaged = useMemo(() => {
    if (!data) return [];
    const rows = [...data.topEngaged];
    rows.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return rows;
  }, [data, sortKey, sortDir]);

  function toggleSort(k: keyof UserRow) {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  }

  async function handleResend(cId: string | null, eId: string | null) {
    if (!cId || !eId) {
      setToast("Matrícula ausente");
      setTimeout(() => setToast(null), 4000);
      return;
    }
    setResending(eId);
    try {
      const res = await fetch(
        `/api/courses/${cId}/students/${eId}/resend`,
        { method: "POST" }
      );
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error || "Falha");
      }
      setToast("Link reenviado com sucesso");
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Erro ao reenviar");
    } finally {
      setResending(null);
      setTimeout(() => setToast(null), 4000);
    }
  }

  function handleExport(section: string) {
    const qs = new URLSearchParams();
    qs.set("tab", "students");
    qs.set("format", "csv");
    qs.set("section", section);
    if (courseId !== "all") qs.set("courseId", courseId);
    if (startDate) qs.set("startDate", startDate);
    if (endDate) qs.set("endDate", endDate);
    window.location.href = `/api/admin/analytics?${qs.toString()}`;
  }

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
        <p className="text-gray-500">Erro ao carregar relatório de alunos</p>
      </div>
    );
  }

  const inactive3060 = data.inactiveGrouped["30-60"] || [];
  const inactive6090 = data.inactiveGrouped["60-90"] || [];
  const inactive90 = data.inactiveGrouped["90+"] || [];
  const totalInactive = inactive3060.length + inactive6090.length + inactive90.length;

  return (
    <div className="space-y-10">
      {/* Top engaged */}
      <section className="space-y-4">
        <SectionHeader
          title="Top 10 alunos mais engajados"
          subtitle="Ordenados por pontos, conclusões e participação"
          onExport={() => handleExport("engaged")}
          exportDisabled={sortedEngaged.length === 0}
        />
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
          {sortedEngaged.length === 0 ? (
            <EmptyState text="Ainda não há dados de engajamento." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-200 dark:border-gray-800 text-[11px] uppercase tracking-wider text-gray-500">
                    <th className="py-3 px-4 font-medium">#</th>
                    <Th label="Aluno" k="name" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                    <Th label="Pontos" k="points" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                    <Th label="Aulas" k="lessonsCompleted" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                    <Th label="Progresso" k="progressPercent" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                    <Th label="Último acesso" k="lastAccessedAt" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                  {sortedEngaged.map((s, i) => (
                    <tr key={s.userId} className={`${i % 2 === 1 ? "bg-gray-50/60 dark:bg-gray-900/40" : ""} hover:bg-blue-50/40 dark:hover:bg-blue-500/5 transition-colors`}>
                      <td className="py-3 px-4 text-base">{medalFor(i)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={s.name} url={s.avatarUrl} />
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">{s.name}</p>
                            <p className="text-xs text-gray-500 truncate">{s.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold text-xs tabular-nums">
                          {s.points}
                        </span>
                      </td>
                      <td className="py-3 px-4 tabular-nums text-gray-700 dark:text-gray-300">
                        {s.lessonsCompleted}<span className="text-gray-400">/{s.totalLessons}</span>
                      </td>
                      <td className="py-3 px-4"><ProgressBar value={s.progressPercent} /></td>
                      <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{formatDate(s.lastAccessedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Inactive */}
      <section className="space-y-4">
        <SectionHeader
          title="Alunos inativos"
          subtitle={`${totalInactive} alunos não acessam há 30 dias ou mais`}
          onExport={() => handleExport("inactive")}
          exportDisabled={totalInactive === 0}
        />

        <div className="space-y-3">
          <InactiveAccordion
            label="30 a 60 dias sem acesso"
            count={inactive3060.length}
            tone="amber"
            students={inactive3060}
            resending={resending}
            onResend={handleResend}
          />
          <InactiveAccordion
            label="60 a 90 dias sem acesso"
            count={inactive6090.length}
            tone="orange"
            students={inactive6090}
            resending={resending}
            onResend={handleResend}
          />
          <InactiveAccordion
            label="Mais de 90 dias sem acesso"
            count={inactive90.length}
            tone="red"
            students={inactive90}
            resending={resending}
            onResend={handleResend}
          />
        </div>

        <InsightCard
          tone="amber"
          text="Alunos inativos afetam diretamente retenção, engajamento e percepção de valor do seu curso. Considere enviar um email de reengajamento ou criar conteúdo novo para trazê-los de volta."
        />
      </section>

      {/* Never accessed */}
      <section className="space-y-4">
        <SectionHeader
          title="Alunos que nunca acessaram"
          subtitle="Matriculados que ainda não entraram no curso"
          onExport={() => handleExport("never")}
          exportDisabled={data.neverAccessed.length === 0}
        />
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
          {data.neverAccessed.length === 0 ? (
            <EmptyState text="Todos os alunos já acessaram — ótimo sinal!" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-200 dark:border-gray-800 text-[11px] uppercase tracking-wider text-gray-500">
                    <th className="py-3 px-4 font-medium">Aluno</th>
                    <th className="py-3 px-4 font-medium">Curso</th>
                    <th className="py-3 px-4 font-medium">Matrícula</th>
                    <th className="py-3 px-4 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                  {data.neverAccessed.map((s, i) => {
                    const days = daysSince(s.lastAccessedAt);
                    return (
                      <tr key={s.enrollmentId || s.userId} className={`${i % 2 === 1 ? "bg-gray-50/60 dark:bg-gray-900/40" : ""} hover:bg-blue-50/40 dark:hover:bg-blue-500/5 transition-colors`}>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={s.name} url={s.avatarUrl} />
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white truncate">{s.name}</p>
                              <p className="text-xs text-gray-500 truncate">{s.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400 truncate max-w-[200px]">{s.courseTitle}</td>
                        <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                          {days != null ? `há ${days} dias` : "—"}
                        </td>
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
        </div>
        <InsightCard
          tone="blue"
          text="Esses alunos compraram mas nunca abriram o curso. Verifique se o email de acesso chegou corretamente e considere enviar uma mensagem de boas-vindas personalizada."
        />
      </section>

      {/* Expired */}
      <section className="space-y-4">
        <SectionHeader
          title="Alunos com acesso expirado"
          subtitle="Não entram nas métricas ativas — oportunidade de reativação"
          onExport={() => handleExport("expired")}
          exportDisabled={data.expiredStudents.length === 0}
        />

        <div className="rounded-2xl border border-rose-200 dark:border-rose-500/30 bg-gradient-to-br from-rose-50 to-white dark:from-rose-500/10 dark:to-gray-900 p-6 flex items-center gap-4">
          <span className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
            <MoonIcon className="w-7 h-7" />
          </span>
          <div>
            <p className="text-4xl font-bold text-rose-600 dark:text-rose-400 tabular-nums leading-none">
              {data.expiredCount}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              aluno{data.expiredCount === 1 ? "" : "s"} com acesso expirado
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
          {data.expiredStudents.length === 0 ? (
            <EmptyState text="Nenhum aluno com acesso expirado." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-200 dark:border-gray-800 text-[11px] uppercase tracking-wider text-gray-500">
                    <th className="py-3 px-4 font-medium">Aluno</th>
                    <th className="py-3 px-4 font-medium">Curso</th>
                    <th className="py-3 px-4 font-medium">Expirou em</th>
                    <th className="py-3 px-4 font-medium">Progresso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                  {data.expiredStudents.map((s, i) => (
                    <tr key={s.enrollmentId} className={`${i % 2 === 1 ? "bg-gray-50/60 dark:bg-gray-900/40" : ""} hover:bg-rose-50/30 dark:hover:bg-rose-500/5 transition-colors`}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={s.name} url={s.avatarUrl} />
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">{s.name}</p>
                            <p className="text-xs text-gray-500 truncate">{s.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400 truncate max-w-[200px]">{s.courseTitle}</td>
                      <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{formatDate(s.expiresAt)}</td>
                      <td className="py-3 px-4"><ProgressBar value={s.progressPercent} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <InsightCard
          tone="red"
          icon="🚀"
          text="Esses alunos não entram nas métricas ativas. Representam uma oportunidade de reativação — considere criar uma oferta especial de renovação."
        />
      </section>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-3 rounded-lg shadow-2xl text-sm font-medium">
          {toast}
        </div>
      )}
    </div>
  );
}

function InactiveAccordion({
  label,
  count,
  tone,
  students,
  resending,
  onResend,
}: {
  label: string;
  count: number;
  tone: "amber" | "orange" | "red";
  students: UserRow[];
  resending: string | null;
  onResend: (courseId: string | null, enrollmentId: string | null) => void;
}) {
  const [open, setOpen] = useState(count > 0 && count <= 20);
  const badgeCls =
    tone === "amber"
      ? "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400"
      : tone === "orange"
        ? "bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400"
        : "bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400";
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition"
      >
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center justify-center min-w-[2rem] h-7 px-2 rounded-full text-xs font-semibold tabular-nums ${badgeCls}`}>
            {count}
          </span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">{label}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-gray-100 dark:border-gray-800/60">
          {students.length === 0 ? (
            <EmptyState text="Nenhum aluno nesta faixa." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-100 dark:border-gray-800/60 text-[11px] uppercase tracking-wider text-gray-500">
                    <th className="py-2.5 px-4 font-medium">Aluno</th>
                    <th className="py-2.5 px-4 font-medium">Inativo há</th>
                    <th className="py-2.5 px-4 font-medium">Curso</th>
                    <th className="py-2.5 px-4 font-medium">Progresso</th>
                    <th className="py-2.5 px-4 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                  {students.map((s, i) => {
                    const days = daysSince(s.lastAccessedAt);
                    return (
                      <tr key={s.userId + (s.enrollmentId || "")} className={`${i % 2 === 1 ? "bg-gray-50/60 dark:bg-gray-900/40" : ""} hover:bg-amber-50/30 dark:hover:bg-amber-500/5 transition-colors`}>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={s.name} url={s.avatarUrl} />
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white truncate">{s.name}</p>
                              <p className="text-xs text-gray-500 truncate">{s.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${badgeCls}`}>
                            há {days} dias
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400 truncate max-w-[200px]">{s.courseTitle}</td>
                        <td className="py-3 px-4"><ProgressBar value={s.progressPercent} /></td>
                        <td className="py-3 px-4 text-right">
                          <Button size="sm" variant="secondary" onClick={() => onResend(s.courseId, s.enrollmentId)} disabled={resending === s.enrollmentId || !s.enrollmentId}>
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
        </div>
      )}
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  onExport,
  exportDisabled,
}: {
  title: string;
  subtitle: string;
  onExport: () => void;
  exportDisabled?: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">{title}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
      </div>
      <Button variant="secondary" size="sm" onClick={onExport} disabled={exportDisabled}>
        <DownloadIcon className="w-4 h-4 mr-2" />
        Exportar CSV
      </Button>
    </div>
  );
}

function Th({
  label,
  k,
  sortKey,
  sortDir,
  onClick,
}: {
  label: string;
  k: keyof UserRow;
  sortKey: keyof UserRow;
  sortDir: "asc" | "desc";
  onClick: (k: keyof UserRow) => void;
}) {
  const active = sortKey === k;
  return (
    <th className="py-3 px-4 font-medium">
      <button
        type="button"
        onClick={() => onClick(k)}
        className={`inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white transition ${active ? "text-gray-900 dark:text-white" : ""}`}
      >
        {label}
        <ArrowUpDown className="w-3 h-3 opacity-60" />
        {active && <span className="text-[9px]">{sortDir === "asc" ? "▲" : "▼"}</span>}
      </button>
    </th>
  );
}

function Avatar({ name, url }: { name: string; url?: string | null }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || "")
      .join("") || "?";
  const palette = [
    "bg-blue-500/15 text-blue-600 dark:text-blue-300",
    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
    "bg-amber-500/15 text-amber-600 dark:text-amber-300",
    "bg-purple-500/15 text-purple-600 dark:text-purple-300",
    "bg-rose-500/15 text-rose-600 dark:text-rose-300",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const cls = palette[h % palette.length];
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className="w-9 h-9 rounded-full object-cover shrink-0" />;
  }
  return (
    <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-xs font-semibold shrink-0 ${cls}`}>
      {initials}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  const clamp = Math.max(0, Math.min(100, value));
  const color =
    clamp >= 75 ? "bg-emerald-500" : clamp >= 50 ? "bg-blue-500" : clamp >= 25 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="flex items-center gap-2 min-w-[130px]">
      <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${clamp}%` }} />
      </div>
      <span className="text-xs tabular-nums text-gray-600 dark:text-gray-400 w-9 text-right font-medium">{clamp}%</span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-12 px-6 text-center">
      <p className="text-sm text-gray-500 dark:text-gray-400">{text}</p>
    </div>
  );
}

function medalFor(index: number) {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return <span className="text-xs text-gray-400 tabular-nums">{index + 1}</span>;
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

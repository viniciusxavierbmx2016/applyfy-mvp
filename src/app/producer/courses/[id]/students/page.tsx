"use client";

import { useCallback, useEffect, useState } from "react";
import { useConfirm } from "@/hooks/use-confirm";

interface TagInfo {
  id: string;
  name: string;
  color: string;
}

interface Student {
  enrollmentId: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  enrolledAt: string;
  expiresAt: string | null;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  isExpired: boolean;
  progress: number;
  lessonsCompleted: number;
  totalLessons: number;
  lastViewedAt: string | null;
  tags?: TagInfo[];
}

interface PageData {
  students: Student[];
  page: number;
  totalPages: number;
  total: number;
}

interface AccessResult {
  email: string;
  password: string | null;
  workspaceUrl: string;
  isMaster: boolean;
}

const DURATION_OPTIONS = [
  { label: "Vitalício", days: null as number | null },
  { label: "30 dias", days: 30 },
  { label: "90 dias", days: 90 },
  { label: "180 dias", days: 180 },
  { label: "365 dias", days: 365 },
  { label: "Personalizado", days: -1 }, // sentinel
];

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatExpiry(iso: string | null) {
  if (!iso) return { text: "Vitalício", color: "text-gray-500" };
  const date = new Date(iso).getTime();
  const diffMs = date - Date.now();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffMs < 0)
    return { text: "Expirado", color: "text-red-500 font-medium" };
  if (diffDays <= 7)
    return {
      text: `Expira em ${diffDays}d`,
      color: "text-amber-600 dark:text-amber-400",
    };
  return {
    text: `Expira em ${diffDays}d`,
    color: "text-gray-600 dark:text-gray-400",
  };
}

function formatRelative(iso: string | null) {
  if (!iso) return "Nunca";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Hoje";
  if (days === 1) return "Ontem";
  if (days < 30) return `${days} dias atrás`;
  if (days < 365) return `${Math.floor(days / 30)} meses atrás`;
  return `${Math.floor(days / 365)} anos atrás`;
}

export default function CourseStudentsPage({
  params,
}: {
  params: { id: string };
}) {
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [accessResult, setAccessResult] = useState<AccessResult | null>(null);
  const [editTarget, setEditTarget] = useState<Student | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    const url = new URL(
      `/api/courses/${params.id}/students`,
      window.location.origin
    );
    if (debouncedQ) url.searchParams.set("q", debouncedQ);
    url.searchParams.set("page", String(page));
    const res = await fetch(url.toString());
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [params.id, debouncedQ, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRemove(enrollmentId: string) {
    if (!(await confirm({ title: "Remover acesso", message: "Remover acesso deste aluno ao curso?", variant: "danger", confirmText: "Remover" }))) return;
    const url = `/api/courses/${params.id}/students/${enrollmentId}`;
    try {
      const res = await fetch(url, { method: "DELETE" });
      if (res.ok) {
        await load();
      } else {
        const data = await res.json().catch(() => ({}));
        console.error("[handleRemove] failed:", url, res.status, data);
        showToast("Erro ao remover acesso: " + (data.error || `Status ${res.status}`));
      }
    } catch (err) {
      console.error("[handleRemove] network error:", err);
      showToast("Erro de rede ao remover acesso");
    }
  }

  function patchStudent(enrollmentId: string, patch: Partial<Student>) {
    setData((prev) =>
      prev
        ? {
            ...prev,
            students: prev.students.map((s) =>
              s.enrollmentId === enrollmentId ? { ...s, ...patch } : s
            ),
          }
        : prev
    );
  }

  async function handleResend(enrollmentId: string) {
    const res = await fetch(
      `/api/courses/${params.id}/students/${enrollmentId}/resend`,
      { method: "POST" }
    );
    if (res.ok) showToast("Link reenviado por email");
    else showToast("Erro ao reenviar");
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-4">
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-sm transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Enviar acesso
        </button>
      </div>

      <div className="mb-4">
        <input
          type="search"
          placeholder="Buscar por nome ou email..."
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          className="w-full sm:max-w-sm px-4 py-2.5 bg-white dark:bg-[#0f1320] border border-gray-300 dark:border-[#1a1e2e] rounded-xl text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-colors duration-200"
        />
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data || data.students.length === 0 ? (
        <div className="bg-white dark:bg-[#0a0e19] border border-gray-200 dark:border-[#1a1e2e] rounded-xl p-12 text-center">
          <p className="text-gray-500">
            {debouncedQ
              ? "Nenhum aluno encontrado"
              : "Nenhum aluno matriculado ainda"}
          </p>
          {!debouncedQ && (
            <button
              onClick={() => setModalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-sm transition"
            >
              Enviar primeiro acesso
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white dark:bg-[#0a0e19] border border-gray-200 dark:border-[#1a1e2e] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-[#1a1e2e]">
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-widest text-gray-500 font-medium">Aluno</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-widest text-gray-500 font-medium">Matrícula</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-widest text-gray-500 font-medium">Progresso</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-widest text-gray-500 font-medium">Aulas</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-widest text-gray-500 font-medium">Último acesso</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-widest text-gray-500 font-medium">Acesso</th>
                  <th className="text-right px-4 py-3 text-[11px] uppercase tracking-widest text-gray-500 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {data.students.map((s) => {
                  const exp = formatExpiry(s.expiresAt);
                  return (
                    <tr key={s.enrollmentId} className="border-b border-gray-100 dark:border-[#1a1e2e] last:border-0 hover:bg-gray-50 dark:hover:bg-[#0f1320] transition-colors duration-150">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center flex-shrink-0">
                            {s.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={s.avatarUrl}
                                alt={s.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                {s.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">
                              {s.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {s.email}
                            </p>
                            {s.tags && s.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {s.tags.map((t) => (
                                  <span
                                    key={t.id}
                                    className="text-[9px] font-medium px-1.5 py-0.5 rounded-full border"
                                    style={{
                                      backgroundColor: `${t.color}15`,
                                      color: t.color,
                                      borderColor: `${t.color}40`,
                                    }}
                                  >
                                    {t.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {formatDate(s.enrolledAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-[80px] h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full"
                              style={{ width: `${s.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 dark:text-gray-400 w-9 text-right">
                            {s.progress}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {s.lessonsCompleted} de {s.totalLessons}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {formatRelative(s.lastViewedAt)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className={exp.color}>{exp.text}</span>
                          <button
                            onClick={() => setEditTarget(s)}
                            className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded"
                            aria-label="Editar tempo de acesso"
                            title="Editar tempo de acesso"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => handleResend(s.enrollmentId)}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-transparent dark:bg-[#1a1e2e] hover:bg-gray-100 dark:hover:bg-[#1f2335] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#1f2335] transition"
                          >
                            Reenviar
                          </button>
                          <button
                            onClick={() => handleRemove(s.enrollmentId)}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 transition"
                          >
                            Remover
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {data.students.map((s) => {
              const exp = formatExpiry(s.expiresAt);
              return (
                <div
                  key={s.enrollmentId}
                  className="bg-white dark:bg-[#0a0e19] border border-gray-200 dark:border-[#1a1e2e] rounded-xl p-4"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center flex-shrink-0">
                      {s.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={s.avatarUrl}
                          alt={s.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                          {s.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {s.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {s.email}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs mb-3">
                    <div>
                      <p className="text-gray-500">Matrícula</p>
                      <p className="text-gray-900 dark:text-white">
                        {formatDate(s.enrolledAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Aulas</p>
                      <p className="text-gray-900 dark:text-white">
                        {s.lessonsCompleted}/{s.totalLessons}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Último acesso</p>
                      <p className="text-gray-900 dark:text-white">
                        {formatRelative(s.lastViewedAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Acesso</p>
                      <div className="flex items-center gap-1.5">
                        <p className={exp.color}>{exp.text}</p>
                        <button
                          onClick={() => setEditTarget(s)}
                          className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded"
                          aria-label="Editar tempo de acesso"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${s.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {s.progress}%
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResend(s.enrollmentId)}
                      className="flex-1 px-3 py-2 text-xs rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                    >
                      Reenviar link
                    </button>
                    <button
                      onClick={() => handleRemove(s.enrollmentId)}
                      className="flex-1 px-3 py-2 text-xs rounded bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {data.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between text-sm">
              <p className="text-gray-600 dark:text-gray-400">
                Página {data.page} de {data.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded bg-gray-100 dark:bg-gray-800 disabled:opacity-50 text-gray-700 dark:text-gray-200"
                >
                  Anterior
                </button>
                <button
                  onClick={() =>
                    setPage((p) => Math.min(data.totalPages, p + 1))
                  }
                  disabled={page >= data.totalPages}
                  className="px-3 py-1.5 rounded bg-gray-100 dark:bg-gray-800 disabled:opacity-50 text-gray-700 dark:text-gray-200"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {modalOpen && (
        <SendAccessModal
          courseId={params.id}
          onClose={() => setModalOpen(false)}
          onSent={(access) => {
            setModalOpen(false);
            if (access?.password) setAccessResult(access);
            load();
          }}
        />
      )}

      {accessResult && (
        <AccessSuccessModal
          access={accessResult}
          onClose={() => setAccessResult(null)}
        />
      )}

      {editTarget && (
        <EditAccessModal
          courseId={params.id}
          student={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={(patch) => {
            patchStudent(editTarget.enrollmentId, patch);
            setEditTarget(null);
          }}
        />
      )}
      <ConfirmDialog />
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-lg shadow-lg">
          {toast}
        </div>
      )}
    </>
  );
}

interface ModuleNode {
  id: string;
  title: string;
  daysToRelease: number;
  lessons: Array<{ id: string; title: string; daysToRelease: number }>;
}

interface OverrideRow {
  id: string;
  moduleId: string | null;
  lessonId: string | null;
  released: boolean;
}

function EditAccessModal({
  courseId,
  student,
  onClose,
  onSaved,
}: {
  courseId: string;
  student: Student;
  onClose: () => void;
  onSaved: (patch: Partial<Student>) => void;
}) {
  const [tab, setTab] = useState<"access" | "release">("access");
  const [durationIdx, setDurationIdx] = useState(0);
  const [customDays, setCustomDays] = useState(30);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modules, setModules] = useState<ModuleNode[] | null>(null);
  const [moduleOverrides, setModuleOverrides] = useState<Set<string>>(
    new Set()
  );
  const [lessonOverrides, setLessonOverrides] = useState<Set<string>>(
    new Set()
  );
  const [releaseBusy, setReleaseBusy] = useState(false);
  const { confirm: confirmReset, ConfirmDialog: ConfirmDialogReset } = useConfirm();

  useEffect(() => {
    fetch(`/api/courses/${courseId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.course) return;
        setModules(
          (d.course.modules as ModuleNode[]).map((m) => ({
            id: m.id,
            title: m.title,
            daysToRelease: m.daysToRelease ?? 0,
            lessons: (m.lessons || []).map((l) => ({
              id: l.id,
              title: l.title,
              daysToRelease: l.daysToRelease ?? 0,
            })),
          }))
        );
      });
    fetch(
      `/api/courses/${courseId}/students/${student.enrollmentId}/overrides`
    )
      .then((r) => (r.ok ? r.json() : { overrides: [] }))
      .then((d) => {
        const mods = new Set<string>();
        const less = new Set<string>();
        for (const o of (d.overrides as OverrideRow[]) || []) {
          if (!o.released) continue;
          if (o.moduleId) mods.add(o.moduleId);
          if (o.lessonId) less.add(o.lessonId);
        }
        setModuleOverrides(mods);
        setLessonOverrides(less);
      });
  }, [courseId, student.enrollmentId]);

  const opt = DURATION_OPTIONS[durationIdx];
  const isCustom = opt.days === -1;
  const isLifetime = opt.days === null && !isCustom;

  async function toggleOverride(
    target: { moduleId?: string; lessonId?: string },
    next: boolean
  ) {
    setReleaseBusy(true);
    setError("");
    try {
      const res = await fetch(
        `/api/courses/${courseId}/students/${student.enrollmentId}/overrides`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...target, released: next }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Erro ao salvar liberação");
        return;
      }
      if (target.moduleId) {
        setModuleOverrides((prev) => {
          const s = new Set(prev);
          if (next) s.add(target.moduleId!);
          else s.delete(target.moduleId!);
          return s;
        });
      } else if (target.lessonId) {
        setLessonOverrides((prev) => {
          const s = new Set(prev);
          if (next) s.add(target.lessonId!);
          else s.delete(target.lessonId!);
          return s;
        });
      }
    } finally {
      setReleaseBusy(false);
    }
  }

  async function handleReleaseAll() {
    setReleaseBusy(true);
    setError("");
    try {
      const res = await fetch(
        `/api/courses/${courseId}/students/${student.enrollmentId}/overrides/release-all`,
        { method: "POST" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Erro ao liberar tudo");
        return;
      }
      const mods = new Set<string>();
      for (const o of (data.overrides as OverrideRow[]) || []) {
        if (o.moduleId && o.released) mods.add(o.moduleId);
      }
      setModuleOverrides(mods);
      setLessonOverrides(new Set());
    } finally {
      setReleaseBusy(false);
    }
  }

  async function handleResetOverrides() {
    if (!(await confirmReset({ title: "Restaurar liberação", message: "Restaurar a liberação padrão para este aluno?", variant: "warning", confirmText: "Restaurar" }))) return;
    setReleaseBusy(true);
    setError("");
    try {
      const res = await fetch(
        `/api/courses/${courseId}/students/${student.enrollmentId}/overrides`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Erro ao restaurar");
        return;
      }
      setModuleOverrides(new Set());
      setLessonOverrides(new Set());
    } finally {
      setReleaseBusy(false);
    }
  }

  function defaultLabel(days: number) {
    if (!days || days <= 0) return "Imediato";
    return `Libera em ${days}d`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    let expiresAt: string | null = null;
    if (!isLifetime) {
      const days = isCustom ? customDays : (opt.days as number);
      expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    }
    try {
      const res = await fetch(
        `/api/courses/${courseId}/students/${student.enrollmentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expiresAt }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Erro ao salvar");
        setSaving(false);
        return;
      }
      onSaved({
        expiresAt,
        status: data.enrollment?.status ?? student.status,
        isExpired: false,
      });
    } catch {
      setError("Erro ao conectar com o servidor");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div
        className={`bg-white dark:bg-gray-900 rounded-2xl w-full ${
          tab === "release" ? "max-w-2xl" : "max-w-md"
        } p-6 border border-gray-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Editar acesso
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 dark:hover:text-white"
            aria-label="Fechar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-800">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {student.name}
          </p>
          <p className="text-xs text-gray-500 truncate">{student.email}</p>
          <p className="text-xs text-gray-500 mt-2">
            Atual:{" "}
            <span className="text-gray-700 dark:text-gray-300">
              {student.expiresAt
                ? new Date(student.expiresAt).toLocaleDateString("pt-BR")
                : "Vitalício"}
            </span>
          </p>
        </div>

        <div className="mb-4 flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <button
            type="button"
            onClick={() => setTab("access")}
            className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition ${
              tab === "access"
                ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Tempo de acesso
          </button>
          <button
            type="button"
            onClick={() => setTab("release")}
            className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition ${
              tab === "release"
                ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Liberação de conteúdo
          </button>
        </div>

        {error && (
          <div className="mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
            {error}
          </div>
        )}

        {tab === "access" && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Novo tempo de acesso
            </label>
            <div className="grid grid-cols-3 gap-2">
              {DURATION_OPTIONS.map((o, i) => (
                <button
                  key={o.label}
                  type="button"
                  onClick={() => setDurationIdx(i)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition ${
                    durationIdx === i
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {isCustom && (
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={3650}
                  value={customDays}
                  onChange={(e) =>
                    setCustomDays(Math.max(1, Number(e.target.value) || 1))
                  }
                  className="w-28 px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  dias
                </span>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">
              {isLifetime
                ? "Acesso permanente, sem data de expiração."
                : `Nova expiração: ${new Date(
                    Date.now() +
                      (isCustom ? customDays : (opt.days as number)) *
                        86400000
                  ).toLocaleDateString("pt-BR")}`}
            </p>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
        )}

        {tab === "release" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleReleaseAll}
                disabled={releaseBusy}
                className="flex-1 px-3 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg"
              >
                Liberar tudo
              </button>
              <button
                type="button"
                onClick={handleResetOverrides}
                disabled={releaseBusy}
                className="flex-1 px-3 py-2 text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 text-gray-700 dark:text-gray-200 rounded-lg"
              >
                Restaurar padrão
              </button>
            </div>

            {!modules ? (
              <div className="text-center py-8 text-sm text-gray-500">
                Carregando módulos...
              </div>
            ) : modules.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-500">
                Este curso ainda não tem módulos.
              </div>
            ) : (
              <ul className="space-y-3">
                {modules.map((m) => {
                  const modOn = moduleOverrides.has(m.id);
                  return (
                    <li
                      key={m.id}
                      className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40"
                    >
                      <div className="flex items-center gap-3 p-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {m.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {defaultLabel(m.daysToRelease)}
                          </p>
                        </div>
                        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                          <span
                            className={`text-xs ${
                              modOn
                                ? "text-blue-600 dark:text-blue-400 font-medium"
                                : "text-gray-500"
                            }`}
                          >
                            {modOn ? "Liberado" : "Liberar agora"}
                          </span>
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={modOn}
                            disabled={releaseBusy}
                            onChange={(e) =>
                              toggleOverride(
                                { moduleId: m.id },
                                e.target.checked
                              )
                            }
                          />
                          <span className="relative inline-block w-9 h-5 bg-gray-300 dark:bg-gray-700 rounded-full peer-checked:bg-blue-600 transition">
                            <span className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-4" />
                          </span>
                        </label>
                      </div>
                      {m.lessons.length > 0 && (
                        <ul className="divide-y divide-gray-200 dark:divide-gray-800 border-t border-gray-200 dark:border-gray-800">
                          {m.lessons.map((l) => {
                            const lOn =
                              modOn || lessonOverrides.has(l.id);
                            return (
                              <li
                                key={l.id}
                                className="flex items-center gap-3 px-3 py-2"
                              >
                                <div className="flex-1 min-w-0 pl-3">
                                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                                    {l.title}
                                  </p>
                                  <p className="text-[11px] text-gray-500">
                                    {defaultLabel(l.daysToRelease)}
                                  </p>
                                </div>
                                <label
                                  className={`inline-flex items-center gap-2 ${
                                    modOn
                                      ? "opacity-50 cursor-not-allowed"
                                      : "cursor-pointer"
                                  } select-none`}
                                >
                                  <span
                                    className={`text-xs ${
                                      lOn
                                        ? "text-blue-600 dark:text-blue-400"
                                        : "text-gray-500"
                                    }`}
                                  >
                                    {lOn ? "Liberada" : "Liberar"}
                                  </span>
                                  <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={lOn}
                                    disabled={releaseBusy || modOn}
                                    onChange={(e) =>
                                      toggleOverride(
                                        { lessonId: l.id },
                                        e.target.checked
                                      )
                                    }
                                  />
                                  <span className="relative inline-block w-9 h-5 bg-gray-300 dark:bg-gray-700 rounded-full peer-checked:bg-blue-600 transition">
                                    <span className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-4" />
                                  </span>
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>
      <ConfirmDialogReset />
    </div>
  );
}

function AccessSuccessModal({
  access,
  onClose,
}: {
  access: AccessResult;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const fullText =
    `Acesse: ${access.workspaceUrl}\n` +
    `Email: ${access.email}\n` +
    `Senha: ${access.password ?? ""}`;

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 1800);
    } catch {}
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6 border border-gray-200 dark:border-gray-800">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-5 h-5 text-green-600 dark:text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Acesso enviado com sucesso!
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {access.isMaster
                ? "Senha master do workspace"
                : "Senha temporária gerada"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 dark:hover:text-white -mr-1 -mt-1"
            aria-label="Fechar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-2.5">
          <CredentialRow
            label="Link do workspace"
            value={access.workspaceUrl}
            copied={copied === "url"}
            onCopy={() => copy(access.workspaceUrl, "url")}
          />
          <CredentialRow
            label="Email"
            value={access.email}
            copied={copied === "email"}
            onCopy={() => copy(access.email, "email")}
          />
          <CredentialRow
            label="Senha"
            value={access.password ?? ""}
            copied={copied === "pwd"}
            onCopy={() => copy(access.password ?? "", "pwd")}
            mono
          />
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
          Envie essas informações para o aluno.
        </p>

        <div className="mt-5 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => copy(fullText, "all")}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
          >
            {copied === "all" ? "Copiado!" : "Copiar tudo"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

function CredentialRow({
  label,
  value,
  copied,
  onCopy,
  mono,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
        {label}
      </p>
      <div className="flex items-stretch gap-2">
        <input
          type="text"
          readOnly
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          className={`flex-1 min-w-0 px-3 py-2 text-xs ${mono ? "font-mono" : ""} bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500`}
        />
        <button
          type="button"
          onClick={onCopy}
          className="px-3 py-2 text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg flex-shrink-0"
        >
          {copied ? "✓" : "Copiar"}
        </button>
      </div>
    </div>
  );
}

function SendAccessModal({
  courseId,
  onClose,
  onSent,
}: {
  courseId: string;
  onClose: () => void;
  onSent: (access: AccessResult | null) => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [durationIdx, setDurationIdx] = useState(0);
  const [customDays, setCustomDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const opt = DURATION_OPTIONS[durationIdx];
  const isCustom = opt.days === -1;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const days = isCustom ? customDays : opt.days;
    try {
      const res = await fetch(`/api/courses/${courseId}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: name || undefined, days }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Erro ao enviar acesso");
        setLoading(false);
        return;
      }
      onSent((data && data.access) || null);
    } catch {
      setError("Erro ao conectar com o servidor");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6 border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Enviar acesso
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 dark:hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email do aluno
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="aluno@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nome (opcional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nome do aluno"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tempo de acesso
            </label>
            <div className="grid grid-cols-3 gap-2">
              {DURATION_OPTIONS.map((o, i) => (
                <button
                  key={o.label}
                  type="button"
                  onClick={() => setDurationIdx(i)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition ${
                    durationIdx === i
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {isCustom && (
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={3650}
                  value={customDays}
                  onChange={(e) =>
                    setCustomDays(Math.max(1, Number(e.target.value) || 1))
                  }
                  className="w-28 px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  dias
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
            >
              {loading ? "Enviando..." : "Enviar acesso"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

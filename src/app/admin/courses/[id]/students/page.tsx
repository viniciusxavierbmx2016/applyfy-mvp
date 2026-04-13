"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

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
}

interface PageData {
  students: Student[];
  page: number;
  totalPages: number;
  total: number;
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
  const [courseTitle, setCourseTitle] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    fetch(`/api/courses/${params.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setCourseTitle(d.course.title));
  }, [params.id]);

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
    if (!confirm("Remover acesso deste aluno ao curso?")) return;
    const res = await fetch(
      `/api/courses/${params.id}/students/${enrollmentId}`,
      { method: "DELETE" }
    );
    if (res.ok) load();
    else alert("Erro ao remover acesso");
  }

  async function handleResend(enrollmentId: string) {
    const res = await fetch(
      `/api/courses/${params.id}/students/${enrollmentId}/resend`,
      { method: "POST" }
    );
    if (res.ok) alert("Link reenviado por email");
    else alert("Erro ao reenviar");
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/admin/courses/${params.id}/edit`}
          className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar ao curso
        </Link>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Alunos
            </h1>
            {courseTitle && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {courseTitle}
              </p>
            )}
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Enviar acesso
          </button>
        </div>
      </div>

      {/* Tabs (match course edit) */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-800">
        <Link
          href={`/admin/courses/${params.id}/edit`}
          className="px-4 py-2.5 text-sm font-medium border-b-2 border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          Informações
        </Link>
        <Link
          href={`/admin/courses/${params.id}/edit`}
          className="px-4 py-2.5 text-sm font-medium border-b-2 border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          Conteúdo
        </Link>
        <span className="px-4 py-2.5 text-sm font-medium border-b-2 border-blue-500 text-gray-900 dark:text-white">
          Alunos {data ? `(${data.total})` : ""}
        </span>
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
          className="w-full sm:max-w-sm px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data || data.students.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-500">
            {debouncedQ
              ? "Nenhum aluno encontrado"
              : "Nenhum aluno matriculado ainda"}
          </p>
          {!debouncedQ && (
            <button
              onClick={() => setModalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition"
            >
              Enviar primeiro acesso
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/60 text-left text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3">Aluno</th>
                  <th className="px-4 py-3">Matrícula</th>
                  <th className="px-4 py-3">Progresso</th>
                  <th className="px-4 py-3">Aulas</th>
                  <th className="px-4 py-3">Último acesso</th>
                  <th className="px-4 py-3">Acesso</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {data.students.map((s) => {
                  const exp = formatExpiry(s.expiresAt);
                  return (
                    <tr key={s.enrollmentId}>
                      <td className="px-4 py-3">
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
                              className="h-full bg-blue-500 rounded-full"
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
                      <td className={`px-4 py-3 whitespace-nowrap ${exp.color}`}>
                        {exp.text}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => handleResend(s.enrollmentId)}
                            className="px-2.5 py-1.5 text-xs rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                          >
                            Reenviar
                          </button>
                          <button
                            onClick={() => handleRemove(s.enrollmentId)}
                            className="px-2.5 py-1.5 text-xs rounded bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400"
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
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4"
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
                      <p className={exp.color}>{exp.text}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
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
          onSent={() => {
            setModalOpen(false);
            load();
          }}
        />
      )}
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
  onSent: () => void;
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
      onSent();
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

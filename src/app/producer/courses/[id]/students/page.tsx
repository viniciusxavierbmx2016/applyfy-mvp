"use client";

import { useCallback, useEffect, useState, use } from "react";
import { useConfirm } from "@/hooks/use-confirm";
import { Student, PageData, AccessResult } from "./_types";
import { formatDate, formatExpiry, formatRelative } from "./_lib/format";
import { formatWhatsAppUrl } from "./_components/whatsapp-link";
import { SendAccessModal } from "./_components/send-access-modal";
import { AccessSuccessModal } from "./_components/access-success-modal";
import { EditAccessModal } from "./_components/edit-access-modal";

export default function CourseStudentsPage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = use(props.params);
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [accessResult, setAccessResult] = useState<AccessResult | null>(null);
  const [editTarget, setEditTarget] = useState<Student | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
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

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await fetch(`/api/producer/students/export?courseId=${params.id}`);
      if (!res.ok) throw new Error("fail");
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = /filename="([^"]+)"/.exec(disposition);
      const filename = match?.[1] || "alunos.csv";
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
      showToast("CSV exportado");
    } catch {
      showToast("Erro ao exportar CSV");
    } finally {
      setExporting(false);
    }
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
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-3 py-2 bg-primary hover:bg-primary text-white font-medium rounded-lg text-sm transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Enviar acesso
        </button>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting || loading}
          className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline strokeLinecap="round" strokeLinejoin="round" points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          )}
          {exporting ? "Exportando..." : "Exportar CSV"}
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
          className="w-full sm:max-w-sm px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors"
        />
      </div>
      {loading && !data ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data || data.students.length === 0 ? (
        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl p-12 text-center">
          <p className="text-gray-500">
            {debouncedQ
              ? "Nenhum aluno encontrado"
              : "Nenhum aluno matriculado ainda"}
          </p>
          {!debouncedQ && (
            <button
              onClick={() => setModalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary text-white font-medium rounded-lg text-sm transition"
            >
              Enviar primeiro acesso
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/5">
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
                    <tr key={s.enrollmentId} className="border-b border-gray-100 dark:border-white/5 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors duration-150">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center flex-shrink-0">
                            {s.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              (<img
                                src={s.avatarUrl}
                                alt={s.name}
                                className="w-full h-full object-cover"
                              />)
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
                            <p className="text-xs text-gray-500 truncate">{s.email}</p>
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
                              className="h-full bg-primary rounded-full"
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
                            className="p-1 text-gray-400 hover:text-primary dark:hover:text-primary rounded"
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
                          {s.phone ? (
                            <a
                              href={formatWhatsAppUrl(s.phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 transition-colors"
                              title={`WhatsApp: ${s.phone}`}
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                              </svg>
                            </a>
                          ) : (
                            <button
                              type="button"
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-500/10 text-gray-400 cursor-not-allowed"
                              title="WhatsApp não cadastrado"
                              onClick={() => showToast("Este aluno não possui WhatsApp cadastrado")}
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => handleResend(s.enrollmentId)}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-transparent dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 transition"
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
                  className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl p-4"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center flex-shrink-0">
                      {s.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        (<img
                          src={s.avatarUrl}
                          alt={s.name}
                          className="w-full h-full object-cover"
                        />)
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
                      <p className="text-xs text-gray-500 truncate">{s.email}</p>
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
                          className="p-1 text-gray-400 hover:text-primary dark:hover:text-primary rounded"
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
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${s.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {s.progress}%
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {s.phone ? (
                      <a
                        href={formatWhatsAppUrl(s.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 transition-colors flex-shrink-0"
                        title={`WhatsApp: ${s.phone}`}
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </a>
                    ) : (
                      <button
                        type="button"
                        className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-gray-500/10 text-gray-400 cursor-not-allowed flex-shrink-0"
                        title="WhatsApp não cadastrado"
                        onClick={() => showToast("Este aluno não possui WhatsApp cadastrado")}
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </button>
                    )}
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

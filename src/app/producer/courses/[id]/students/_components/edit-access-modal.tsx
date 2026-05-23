"use client";

import React, { useState, useEffect } from "react";
import { useConfirm } from "@/hooks/use-confirm";
import { Student } from "../_types";
import { DURATION_OPTIONS } from "../_lib/format";
import { WhatsAppLink } from "./whatsapp-link";

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

export function EditAccessModal({
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
        className={`bg-white dark:bg-card rounded-2xl w-full ${
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
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-500 truncate">{student.email}</p>
            <WhatsAppLink phone={student.phone} name={student.name} onNoPhone={() => alert("Este aluno não possui WhatsApp cadastrado")} />
          </div>
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
                ? "bg-white dark:bg-card text-gray-900 dark:text-white shadow-sm"
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
                ? "bg-white dark:bg-card text-gray-900 dark:text-white shadow-sm"
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
                      ? "bg-primary text-white border-primary"
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
                  className="w-28 px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
                    // eslint-disable-next-line react-hooks/purity -- preview date based on time of render; intentional, not memoized
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
              className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-medium rounded-lg"
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
                className="flex-1 px-3 py-2 text-xs font-medium bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-lg"
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
                                ? "text-primary font-medium"
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
                          <span className="relative inline-block w-9 h-5 bg-gray-300 dark:bg-gray-700 rounded-full peer-checked:bg-primary transition">
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
                                        ? "text-primary"
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
                                  <span className="relative inline-block w-9 h-5 bg-gray-300 dark:bg-gray-700 rounded-full peer-checked:bg-primary transition">
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

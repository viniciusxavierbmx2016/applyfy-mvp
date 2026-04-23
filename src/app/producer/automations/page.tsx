"use client";

import { useEffect, useState } from "react";
import { useConfirm } from "@/hooks/use-confirm";

interface AutomationItem {
  id: string;
  name: string;
  active: boolean;
  triggerType: string;
  triggerConfig: string;
  actionType: string;
  actionConfig: string;
  courseId: string | null;
  executionCount: number;
  lastExecutedAt: string | null;
  createdAt: string;
}

interface CourseOption {
  id: string;
  title: string;
  modules: { id: string; title: string; lessons: { id: string; title: string }[] }[];
}

const TRIGGER_LABELS: Record<string, string> = {
  LESSON_COMPLETED: "Aluno completar uma aula",
  MODULE_COMPLETED: "Aluno completar um módulo",
  COURSE_COMPLETED: "Aluno completar o curso",
  QUIZ_PASSED: "Aluno passar no quiz",
  STUDENT_ENROLLED: "Aluno se matricular",
};

const ACTION_LABELS: Record<string, string> = {
  UNLOCK_MODULE: "Liberar um módulo",
  SEND_EMAIL: "Enviar email",
  GRANT_CERTIFICATE: "Gerar certificado",
  ENROLL_COURSE: "Matricular em outro curso",
  ADD_TAG: "Adicionar tag",
};

const TRIGGER_ICONS: Record<string, string> = {
  LESSON_COMPLETED: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  MODULE_COMPLETED: "M5 13l4 4L19 7",
  COURSE_COMPLETED: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z",
  QUIZ_PASSED: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  STUDENT_ENROLLED: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z",
};

const ACTION_ICONS: Record<string, string> = {
  UNLOCK_MODULE: "M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z",
  SEND_EMAIL: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  GRANT_CERTIFICATE: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z",
  ENROLL_COURSE: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  ADD_TAG: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z",
};

function describeAutomation(auto: AutomationItem): string {
  const trigger = TRIGGER_LABELS[auto.triggerType] || auto.triggerType;
  const action = ACTION_LABELS[auto.actionType] || auto.actionType;
  return `Quando: ${trigger} → ${action}`;
}

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<AutomationItem[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<AutomationItem | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/producer/automations");
      if (res.ok) {
        const data = await res.json();
        setAutomations(data.automations);
        setCourses(data.courses || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(auto: AutomationItem) {
    const res = await fetch(`/api/producer/automations/${auto.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !auto.active }),
    });
    if (res.ok) {
      setAutomations((prev) =>
        prev.map((a) => (a.id === auto.id ? { ...a, active: !a.active } : a))
      );
    }
  }

  async function deleteAutomation(id: string) {
    if (!(await confirm({ title: "Excluir automação", message: "Essa ação não pode ser desfeita.", variant: "danger", confirmText: "Excluir" }))) return;
    const res = await fetch(`/api/producer/automations/${id}`, { method: "DELETE" });
    if (res.ok) {
      setAutomations((prev) => prev.filter((a) => a.id !== id));
    }
  }

  function openEdit(auto: AutomationItem) {
    setEditing(auto);
    setModal(true);
  }

  function openCreate() {
    setEditing(null);
    setModal(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Automações
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure ações automáticas para seus alunos
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nova automação
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-5 animate-pulse">
              <div className="h-4 w-48 bg-gray-200 dark:bg-white/[0.06] rounded mb-3" />
              <div className="h-3 w-72 bg-gray-200 dark:bg-white/[0.06] rounded" />
            </div>
          ))}
        </div>
      ) : automations.length === 0 ? (
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-10 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-indigo-500/10 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p className="text-gray-900 dark:text-white font-medium mb-1">Nenhuma automação criada</p>
          <p className="text-gray-500 text-sm mb-4">Automatize tarefas repetitivas!</p>
          <button
            type="button"
            onClick={openCreate}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition"
          >
            Criar primeira automação
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {automations.map((auto) => (
            <div
              key={auto.id}
              className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-5"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                      {auto.name}
                    </h3>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        auto.active
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-gray-500/20 text-gray-400"
                      }`}
                    >
                      {auto.active ? "Ativa" : "Inativa"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">
                    {describeAutomation(auto)}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Executou {auto.executionCount} {auto.executionCount === 1 ? "vez" : "vezes"}</span>
                    {auto.lastExecutedAt && (
                      <span>Última: {new Date(auto.lastExecutedAt).toLocaleDateString("pt-BR")}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleActive(auto)}
                    title={auto.active ? "Desativar" : "Ativar"}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      auto.active ? "bg-emerald-500" : "bg-gray-600"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        auto.active ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(auto)}
                    className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.06] rounded-lg transition"
                    title="Editar"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteAutomation(auto.id)}
                    className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] rounded-lg transition"
                    title="Excluir"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <AutomationModal
          editing={editing}
          courses={courses}
          onClose={() => { setModal(false); setEditing(null); }}
          onSaved={() => { setModal(false); setEditing(null); load(); }}
        />
      )}
      <ConfirmDialog />
    </div>
  );
}

function AutomationModal({
  editing,
  courses,
  onClose,
  onSaved,
}: {
  editing: AutomationItem | null;
  courses: CourseOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = !!editing;

  const [name, setName] = useState(editing?.name || "");
  const [courseId, setCourseId] = useState(editing?.courseId || "");
  const [triggerType, setTriggerType] = useState(editing?.triggerType || "LESSON_COMPLETED");
  const [triggerConfig, setTriggerConfig] = useState<Record<string, string>>(() => {
    if (editing) {
      try { return JSON.parse(editing.triggerConfig); } catch { return {}; }
    }
    return {};
  });
  const [actionType, setActionType] = useState(editing?.actionType || "UNLOCK_MODULE");
  const [actionConfig, setActionConfig] = useState<Record<string, string>>(() => {
    if (editing) {
      try { return JSON.parse(editing.actionConfig); } catch { return {}; }
    }
    return {};
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedCourse = courses.find((c) => c.id === courseId);
  const allLessons = selectedCourse?.modules.flatMap((m) =>
    m.lessons.map((l) => ({ ...l, moduleTitle: m.title }))
  ) || [];

  async function handleSave() {
    if (!name.trim()) { setError("Nome é obrigatório"); return; }
    setSaving(true);
    setError("");

    const payload = {
      name,
      courseId: courseId || null,
      triggerType,
      triggerConfig,
      actionType,
      actionConfig,
    };

    try {
      const url = isEditing
        ? `/api/producer/automations/${editing.id}`
        : "/api/producer/automations";
      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erro ao salvar"); return; }
      onSaved();
    } catch {
      setError("Erro de conexão");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] overflow-y-auto" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative bg-white dark:bg-[#141416] border border-gray-200 dark:border-[#28282e] rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl mb-10"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">
          {isEditing ? "Editar automação" : "Nova automação"}
        </h3>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Nome da automação
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Liberar módulo 2 após completar módulo 1"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1320] border border-gray-300 dark:border-[#1a1e2e] rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500/50"
            />
          </div>

          {/* Course */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Curso (opcional)
            </label>
            <select
              value={courseId}
              onChange={(e) => { setCourseId(e.target.value); setTriggerConfig({}); setActionConfig({}); }}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1320] border border-gray-300 dark:border-[#1a1e2e] rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500/50"
            >
              <option value="">Todos os cursos</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>

          {/* Trigger */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <span className="inline-flex items-center gap-1.5">
                <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Quando (Trigger)
              </span>
            </label>
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(TRIGGER_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setTriggerType(key); setTriggerConfig({}); }}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left text-sm transition ${
                    triggerType === key
                      ? "border-indigo-500 bg-indigo-500/5 dark:bg-indigo-500/10"
                      : "border-gray-200 dark:border-[#28282e] hover:border-gray-300 dark:hover:border-[#363640]"
                  }`}
                >
                  <svg className="w-5 h-5 text-indigo-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={TRIGGER_ICONS[key]} />
                  </svg>
                  <span className="text-gray-900 dark:text-white">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Trigger config */}
          {triggerType === "LESSON_COMPLETED" && selectedCourse && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Aula específica (opcional)</label>
              <select
                value={triggerConfig.lessonId || ""}
                onChange={(e) => setTriggerConfig({ ...triggerConfig, lessonId: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1320] border border-gray-300 dark:border-[#1a1e2e] rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500/50"
              >
                <option value="">Qualquer aula</option>
                {allLessons.map((l) => (
                  <option key={l.id} value={l.id}>{l.moduleTitle} → {l.title}</option>
                ))}
              </select>
            </div>
          )}

          {triggerType === "MODULE_COMPLETED" && selectedCourse && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Módulo específico (opcional)</label>
              <select
                value={triggerConfig.moduleId || ""}
                onChange={(e) => setTriggerConfig({ ...triggerConfig, moduleId: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1320] border border-gray-300 dark:border-[#1a1e2e] rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500/50"
              >
                <option value="">Qualquer módulo</option>
                {selectedCourse.modules.map((m) => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
            </div>
          )}

          {/* Arrow */}
          <div className="flex justify-center py-1">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>

          {/* Action */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <span className="inline-flex items-center gap-1.5">
                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Fazer (Ação)
              </span>
            </label>
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(ACTION_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setActionType(key); setActionConfig({}); }}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left text-sm transition ${
                    actionType === key
                      ? "border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10"
                      : "border-gray-200 dark:border-[#28282e] hover:border-gray-300 dark:hover:border-[#363640]"
                  }`}
                >
                  <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={ACTION_ICONS[key]} />
                  </svg>
                  <span className="text-gray-900 dark:text-white">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Action config */}
          {actionType === "UNLOCK_MODULE" && selectedCourse && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Módulo para liberar</label>
              <select
                value={actionConfig.moduleId || ""}
                onChange={(e) => setActionConfig({ ...actionConfig, moduleId: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1320] border border-gray-300 dark:border-[#1a1e2e] rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500/50"
              >
                <option value="">Selecione...</option>
                {selectedCourse.modules.map((m) => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
            </div>
          )}

          {actionType === "SEND_EMAIL" && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Assunto do email</label>
                <input
                  type="text"
                  value={actionConfig.subject || ""}
                  onChange={(e) => setActionConfig({ ...actionConfig, subject: e.target.value })}
                  placeholder="Parabéns pela conclusão!"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1320] border border-gray-300 dark:border-[#1a1e2e] rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Corpo do email</label>
                <textarea
                  value={actionConfig.body || ""}
                  onChange={(e) => setActionConfig({ ...actionConfig, body: e.target.value })}
                  placeholder="Olá! Parabéns por completar..."
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1320] border border-gray-300 dark:border-[#1a1e2e] rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500/50 resize-y"
                />
              </div>
            </div>
          )}

          {actionType === "ENROLL_COURSE" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Curso para matricular</label>
              <select
                value={actionConfig.courseId || ""}
                onChange={(e) => setActionConfig({ ...actionConfig, courseId: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1320] border border-gray-300 dark:border-[#1a1e2e] rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500/50"
              >
                <option value="">Selecione...</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-[#1d1d21] hover:bg-gray-200 dark:hover:bg-[#28282e] text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl border border-gray-200 dark:border-[#28282e] transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl disabled:opacity-40 transition"
          >
            {saving ? "Salvando..." : isEditing ? "Salvar" : "Criar automação"}
          </button>
        </div>
      </div>
    </div>
  );
}

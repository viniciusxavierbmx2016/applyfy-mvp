"use client";

import { useEffect, useState, useRef } from "react";
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

const TRIGGER_META: Record<string, { label: string; short: string; icon: string }> = {
  LESSON_COMPLETED: { label: "Aluno completar uma aula", short: "Completar aula", icon: "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  MODULE_COMPLETED: { label: "Aluno completar um módulo", short: "Completar módulo", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
  COURSE_COMPLETED: { label: "Aluno completar o curso", short: "Completar curso", icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" },
  QUIZ_PASSED: { label: "Aluno passar no quiz", short: "Passar no quiz", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
  STUDENT_ENROLLED: { label: "Aluno se matricular", short: "Se matricular", icon: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" },
};

const ACTION_META: Record<string, { label: string; short: string; icon: string }> = {
  UNLOCK_MODULE: { label: "Liberar um módulo", short: "Liberar módulo", icon: "M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" },
  SEND_EMAIL: { label: "Enviar email", short: "Enviar email", icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
  GRANT_CERTIFICATE: { label: "Gerar certificado", short: "Gerar certificado", icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" },
  ENROLL_COURSE: { label: "Matricular em outro curso", short: "Matricular curso", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  ADD_TAG: { label: "Adicionar tag", short: "Adicionar tag", icon: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" },
};

function getTriggerDetail(auto: AutomationItem, courses: CourseOption[]): string | null {
  try {
    const cfg = JSON.parse(auto.triggerConfig);
    const course = courses.find((c) => c.id === auto.courseId);
    if (cfg.moduleId && course) {
      const mod = course.modules.find((m) => m.id === cfg.moduleId);
      return mod?.title || null;
    }
    if (cfg.lessonId && course) {
      for (const m of course.modules) {
        const l = m.lessons.find((l) => l.id === cfg.lessonId);
        if (l) return l.title;
      }
    }
  } catch {}
  return null;
}

function getActionDetail(auto: AutomationItem, courses: CourseOption[]): string | null {
  try {
    const cfg = JSON.parse(auto.actionConfig);
    if (cfg.moduleId) {
      const course = courses.find((c) => c.id === auto.courseId);
      const mod = course?.modules.find((m) => m.id === cfg.moduleId);
      return mod?.title || null;
    }
    if (cfg.subject) return `"${cfg.subject}"`;
    if (cfg.courseId) {
      const c = courses.find((c) => c.id === cfg.courseId);
      return c?.title || null;
    }
  } catch {}
  return null;
}

function FlowArrow() {
  return (
    <div className="flex items-center justify-center px-1 sm:px-3 py-2 sm:py-0">
      <div className="hidden sm:flex items-center">
        <div className="w-8 h-0.5 bg-gray-600" />
        <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[8px] border-l-gray-600" />
      </div>
      <div className="sm:hidden flex flex-col items-center">
        <div className="w-0.5 h-6 bg-gray-600" />
        <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[8px] border-t-gray-600" />
      </div>
    </div>
  );
}

function FlowNode({
  type,
  label,
  description,
  detail,
  iconPath,
}: {
  type: "trigger" | "action";
  label: string;
  description: string;
  detail?: string | null;
  iconPath: string;
}) {
  const isTrigger = type === "trigger";
  return (
    <div
      className={`flex-1 min-w-[140px] max-w-[220px] rounded-xl p-4 border ${
        isTrigger
          ? "bg-blue-950/30 border-blue-500/30"
          : "bg-emerald-950/30 border-emerald-500/30"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isTrigger ? "bg-blue-500/20" : "bg-emerald-500/20"}`}>
          <svg className={`w-4 h-4 ${isTrigger ? "text-blue-400" : "text-emerald-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
          </svg>
        </div>
        <span className={`text-[10px] uppercase tracking-widest font-semibold ${isTrigger ? "text-blue-400" : "text-emerald-400"}`}>
          {label}
        </span>
      </div>
      <p className="text-sm font-medium text-gray-200 leading-snug">{description}</p>
      {detail && (
        <p className="text-xs text-gray-500 mt-1 truncate">{detail}</p>
      )}
    </div>
  );
}

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<AutomationItem[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<AutomationItem | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
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

  useEffect(() => { load(); }, []);

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
    setMenuOpen(null);
    if (!(await confirm({ title: "Excluir automação", message: "Essa ação não pode ser desfeita.", variant: "danger", confirmText: "Excluir" }))) return;
    const res = await fetch(`/api/producer/automations/${id}`, { method: "DELETE" });
    if (res.ok) {
      setAutomations((prev) => prev.filter((a) => a.id !== id));
    }
  }

  async function duplicateAutomation(auto: AutomationItem) {
    setMenuOpen(null);
    const res = await fetch("/api/producer/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${auto.name} (cópia)`,
        courseId: auto.courseId,
        triggerType: auto.triggerType,
        triggerConfig: JSON.parse(auto.triggerConfig),
        actionType: auto.actionType,
        actionConfig: JSON.parse(auto.actionConfig),
      }),
    });
    if (res.ok) load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Automações</h1>
          <p className="text-sm text-gray-500 mt-1">Crie fluxos que executam ações automaticamente</p>
        </div>
        <button type="button" onClick={() => { setEditing(null); setModal(true); }} className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Nova automação
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6 animate-pulse">
              <div className="h-4 w-48 bg-gray-200 dark:bg-white/[0.06] rounded mb-4" />
              <div className="flex gap-8 items-center">
                <div className="h-24 w-40 bg-gray-200 dark:bg-white/[0.06] rounded-xl" />
                <div className="h-1 w-12 bg-gray-200 dark:bg-white/[0.06] rounded" />
                <div className="h-24 w-40 bg-gray-200 dark:bg-white/[0.06] rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : automations.length === 0 ? (
        <div className="bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.06] rounded-2xl p-12 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-5">
            <svg className="w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p className="text-gray-900 dark:text-white font-semibold text-lg mb-2">Automatize tarefas repetitivas</p>
          <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">Crie fluxos que executam ações automaticamente quando seus alunos avançam</p>
          <button type="button" onClick={() => { setEditing(null); setModal(true); }} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition">
            + Criar primeira automação
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {automations.map((auto) => {
            const trigger = TRIGGER_META[auto.triggerType];
            const action = ACTION_META[auto.actionType];
            const triggerDetail = getTriggerDetail(auto, courses);
            const actionDetail = getActionDetail(auto, courses);

            return (
              <div key={auto.id} className="bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.06] rounded-2xl p-5 sm:p-6 transition hover:border-white/[0.1]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <svg className="w-4 h-4 text-indigo-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate">{auto.name}</h3>
                    <button
                      type="button"
                      onClick={() => toggleActive(auto)}
                      className={`flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full font-medium transition cursor-pointer ${
                        auto.active ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25" : "bg-gray-500/15 text-gray-400 hover:bg-gray-500/25"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${auto.active ? "bg-emerald-400" : "bg-gray-500"}`} />
                      {auto.active ? "Ativo" : "Inativo"}
                    </button>
                  </div>
                  <div className="relative flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setMenuOpen(menuOpen === auto.id ? null : auto.id)}
                      className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] rounded-lg transition"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>
                    {menuOpen === auto.id && (
                      <DropdownMenu
                        onEdit={() => { setMenuOpen(null); setEditing(auto); setModal(true); }}
                        onDuplicate={() => duplicateAutomation(auto)}
                        onDelete={() => deleteAutomation(auto.id)}
                        onClose={() => setMenuOpen(null)}
                      />
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-0 sm:gap-0">
                  <FlowNode
                    type="trigger"
                    label="Quando"
                    description={trigger?.short || auto.triggerType}
                    detail={triggerDetail}
                    iconPath={trigger?.icon || "M13 10V3L4 14h7v7l9-11h-7z"}
                  />
                  <FlowArrow />
                  <FlowNode
                    type="action"
                    label="Fazer"
                    description={action?.short || auto.actionType}
                    detail={actionDetail}
                    iconPath={action?.icon || "M13 10V3L4 14h7v7l9-11h-7z"}
                  />
                </div>

                <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
                  <span>Executou {auto.executionCount} {auto.executionCount === 1 ? "vez" : "vezes"}</span>
                  {auto.lastExecutedAt && (
                    <span>Última: {new Date(auto.lastExecutedAt).toLocaleDateString("pt-BR")}</span>
                  )}
                </div>
              </div>
            );
          })}
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

function DropdownMenu({ onEdit, onDuplicate, onDelete, onClose }: {
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose]);

  const item = "w-full text-left px-3 py-2 text-sm hover:bg-white/[0.06] transition rounded-lg flex items-center gap-2";

  return (
    <div ref={ref} className="absolute right-0 top-8 z-20 w-44 bg-white dark:bg-[#1a1a1e] border border-gray-200 dark:border-[#2a2a30] rounded-xl shadow-xl p-1">
      <button type="button" onClick={onEdit} className={`${item} text-gray-700 dark:text-gray-300`}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
        Editar
      </button>
      <button type="button" onClick={onDuplicate} className={`${item} text-gray-700 dark:text-gray-300`}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
        Duplicar
      </button>
      <div className="h-px bg-gray-200 dark:bg-[#2a2a30] my-1" />
      <button type="button" onClick={onDelete} className={`${item} text-red-400`}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        Excluir
      </button>
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
    if (editing) { try { return JSON.parse(editing.triggerConfig); } catch { return {}; } }
    return {};
  });
  const [actionType, setActionType] = useState(editing?.actionType || "UNLOCK_MODULE");
  const [actionConfig, setActionConfig] = useState<Record<string, string>>(() => {
    if (editing) { try { return JSON.parse(editing.actionConfig); } catch { return {}; } }
    return {};
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedCourse = courses.find((c) => c.id === courseId);
  const allLessons = selectedCourse?.modules.flatMap((m) =>
    m.lessons.map((l) => ({ ...l, moduleTitle: m.title }))
  ) || [];

  const trigger = TRIGGER_META[triggerType];
  const action = ACTION_META[actionType];

  async function handleSave() {
    if (!name.trim()) { setError("Nome é obrigatório"); return; }
    setSaving(true);
    setError("");
    try {
      const url = isEditing ? `/api/producer/automations/${editing.id}` : "/api/producer/automations";
      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, courseId: courseId || null, triggerType, triggerConfig, actionType, actionConfig }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erro ao salvar"); return; }
      onSaved();
    } catch { setError("Erro de conexão"); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] sm:pt-[8vh] overflow-y-auto" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative bg-white dark:bg-[#141416] border border-gray-200 dark:border-[#28282e] rounded-2xl p-6 max-w-2xl w-full mx-4 shadow-2xl mb-10" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">
          {isEditing ? "Editar automação" : "Nova automação"}
        </h3>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
        )}

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nome da automação</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Liberar módulo 2 após completar módulo 1" className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1320] border border-gray-300 dark:border-[#1a1e2e] rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500/50" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Curso</label>
            <select value={courseId} onChange={(e) => { setCourseId(e.target.value); setTriggerConfig({}); setActionConfig({}); }} className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1320] border border-gray-300 dark:border-[#1a1e2e] rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500/50">
              <option value="">Todos os cursos</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>

          {/* Live flow preview */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-0 sm:gap-0 py-2">
            <FlowNode type="trigger" label="Quando" description={trigger?.short || triggerType} iconPath={trigger?.icon || "M13 10V3L4 14h7v7l9-11h-7z"} />
            <FlowArrow />
            <FlowNode type="action" label="Fazer" description={action?.short || actionType} iconPath={action?.icon || "M13 10V3L4 14h7v7l9-11h-7z"} />
          </div>

          {/* Trigger selection */}
          <div>
            <label className="block text-sm font-medium text-blue-400 mb-2 uppercase tracking-wider text-[11px]">Quando (Trigger)</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(TRIGGER_META).map(([key, meta]) => (
                <button key={key} type="button" onClick={() => { setTriggerType(key); setTriggerConfig({}); }}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 text-center transition ${
                    triggerType === key ? "border-blue-500 bg-blue-500/10" : "border-gray-200 dark:border-[#28282e] hover:border-gray-400 dark:hover:border-[#363640]"
                  }`}
                >
                  <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={meta.icon} />
                  </svg>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-tight">{meta.short}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Trigger config */}
          {triggerType === "LESSON_COMPLETED" && selectedCourse && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Aula específica (opcional)</label>
              <select value={triggerConfig.lessonId || ""} onChange={(e) => setTriggerConfig({ ...triggerConfig, lessonId: e.target.value })} className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1320] border border-gray-300 dark:border-[#1a1e2e] rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500/50">
                <option value="">Qualquer aula</option>
                {allLessons.map((l) => <option key={l.id} value={l.id}>{l.moduleTitle} → {l.title}</option>)}
              </select>
            </div>
          )}
          {triggerType === "MODULE_COMPLETED" && selectedCourse && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Módulo específico (opcional)</label>
              <select value={triggerConfig.moduleId || ""} onChange={(e) => setTriggerConfig({ ...triggerConfig, moduleId: e.target.value })} className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1320] border border-gray-300 dark:border-[#1a1e2e] rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500/50">
                <option value="">Qualquer módulo</option>
                {selectedCourse.modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
            </div>
          )}

          {/* Action selection */}
          <div>
            <label className="block text-sm font-medium text-emerald-400 mb-2 uppercase tracking-wider text-[11px]">Fazer (Ação)</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(ACTION_META).map(([key, meta]) => (
                <button key={key} type="button" onClick={() => { setActionType(key); setActionConfig({}); }}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 text-center transition ${
                    actionType === key ? "border-emerald-500 bg-emerald-500/10" : "border-gray-200 dark:border-[#28282e] hover:border-gray-400 dark:hover:border-[#363640]"
                  }`}
                >
                  <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={meta.icon} />
                  </svg>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-tight">{meta.short}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Action config */}
          {actionType === "UNLOCK_MODULE" && selectedCourse && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Módulo para liberar</label>
              <select value={actionConfig.moduleId || ""} onChange={(e) => setActionConfig({ ...actionConfig, moduleId: e.target.value })} className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1320] border border-gray-300 dark:border-[#1a1e2e] rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500/50">
                <option value="">Selecione...</option>
                {selectedCourse.modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
            </div>
          )}
          {actionType === "SEND_EMAIL" && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Assunto do email</label>
                <input type="text" value={actionConfig.subject || ""} onChange={(e) => setActionConfig({ ...actionConfig, subject: e.target.value })} placeholder="Parabéns pela conclusão!" className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1320] border border-gray-300 dark:border-[#1a1e2e] rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Corpo do email</label>
                <textarea value={actionConfig.body || ""} onChange={(e) => setActionConfig({ ...actionConfig, body: e.target.value })} placeholder="Olá! Parabéns por completar..." rows={4} className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1320] border border-gray-300 dark:border-[#1a1e2e] rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500/50 resize-y" />
              </div>
            </div>
          )}
          {actionType === "ENROLL_COURSE" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Curso para matricular</label>
              <select value={actionConfig.courseId || ""} onChange={(e) => setActionConfig({ ...actionConfig, courseId: e.target.value })} className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1320] border border-gray-300 dark:border-[#1a1e2e] rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500/50">
                <option value="">Selecione...</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-[#1d1d21] hover:bg-gray-200 dark:hover:bg-[#28282e] text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl border border-gray-200 dark:border-[#28282e] transition">Cancelar</button>
          <button type="button" onClick={handleSave} disabled={saving || !name.trim()} className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl disabled:opacity-40 transition">
            {saving ? "Salvando..." : isEditing ? "Salvar" : "Criar automação"}
          </button>
        </div>
      </div>
    </div>
  );
}

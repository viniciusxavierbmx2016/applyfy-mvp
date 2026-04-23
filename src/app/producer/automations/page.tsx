"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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

interface CanvasNode {
  id: string;
  type: "start" | "trigger" | "action";
  x: number;
  y: number;
}

const TRIGGER_META: Record<string, { label: string; short: string; icon: string; desc: string }> = {
  LESSON_COMPLETED: { label: "Aluno completar uma aula", short: "Completar aula", desc: "Quando um aluno finalizar uma aula", icon: "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  MODULE_COMPLETED: { label: "Aluno completar um módulo", short: "Completar módulo", desc: "Quando todas as aulas do módulo forem concluídas", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
  COURSE_COMPLETED: { label: "Aluno completar o curso", short: "Completar curso", desc: "Quando o aluno finalizar todas as aulas do curso", icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" },
  QUIZ_PASSED: { label: "Aluno passar no quiz", short: "Passar no quiz", desc: "Quando o aluno atingir a nota mínima", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
  STUDENT_ENROLLED: { label: "Aluno se matricular", short: "Se matricular", desc: "Quando um aluno for matriculado no curso", icon: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" },
};

const ACTION_META: Record<string, { label: string; short: string; icon: string; desc: string }> = {
  UNLOCK_MODULE: { label: "Liberar um módulo", short: "Liberar módulo", desc: "Desbloqueia um módulo específico para o aluno", icon: "M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" },
  SEND_EMAIL: { label: "Enviar email", short: "Enviar email", desc: "Envia um email personalizado ao aluno", icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
  GRANT_CERTIFICATE: { label: "Gerar certificado", short: "Gerar certificado", desc: "Gera um certificado de conclusão", icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" },
  ENROLL_COURSE: { label: "Matricular em outro curso", short: "Matricular curso", desc: "Matricula o aluno automaticamente em outro curso", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  ADD_TAG: { label: "Adicionar tag", short: "Adicionar tag", desc: "Adiciona uma tag ao perfil do aluno", icon: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" },
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
        const l = m.lessons.find((les) => les.id === cfg.lessonId);
        if (l) return l.title;
      }
    }
  } catch { /* ignore */ }
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
      const c = courses.find((cr) => cr.id === cfg.courseId);
      return c?.title || null;
    }
  } catch { /* ignore */ }
  return null;
}

const NODE_W = 240;
const NODE_H = 120;
const START_R = 24;

function defaultNodes(): CanvasNode[] {
  return [
    { id: "start", type: "start", x: 80, y: 250 },
    { id: "trigger", type: "trigger", x: 220, y: 220 },
    { id: "action", type: "action", x: 540, y: 220 },
  ];
}

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<AutomationItem[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorAuto, setEditorAuto] = useState<AutomationItem | null>(null);
  const [editorNew, setEditorNew] = useState(false);
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

  async function toggleActive(e: React.MouseEvent, auto: AutomationItem) {
    e.stopPropagation();
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
    if (res.ok) setAutomations((prev) => prev.filter((a) => a.id !== id));
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

  if (editorAuto || editorNew) {
    return (
      <FlowEditor
        editing={editorAuto}
        courses={courses}
        onBack={() => { setEditorAuto(null); setEditorNew(false); load(); }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Automações</h1>
          <p className="text-sm text-gray-500 mt-1">Crie fluxos visuais que executam ações automaticamente</p>
        </div>
        <button type="button" onClick={() => setEditorNew(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Nova automação
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.06] rounded-2xl p-5 animate-pulse">
              <div className="h-4 w-32 bg-gray-200 dark:bg-white/[0.06] rounded mb-4" />
              <div className="h-16 bg-gray-200 dark:bg-white/[0.06] rounded-xl mb-3" />
              <div className="h-3 w-20 bg-gray-200 dark:bg-white/[0.06] rounded" />
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
          <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">Crie fluxos visuais que executam ações automaticamente quando seus alunos avançam</p>
          <button type="button" onClick={() => setEditorNew(true)} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition">
            + Criar primeira automação
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {automations.map((auto) => {
            const trigger = TRIGGER_META[auto.triggerType];
            const action = ACTION_META[auto.actionType];
            const triggerDetail = getTriggerDetail(auto, courses);
            const actionDetail = getActionDetail(auto, courses);

            return (
              <div
                key={auto.id}
                onClick={() => setEditorAuto(auto)}
                className="bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.06] rounded-2xl p-5 cursor-pointer transition hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5 group"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate pr-2">{auto.name}</h3>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => toggleActive(e, auto)}
                      className={`flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full font-medium transition ${
                        auto.active ? "bg-emerald-500/15 text-emerald-400" : "bg-gray-500/15 text-gray-400"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${auto.active ? "bg-emerald-400" : "bg-gray-500"}`} />
                      {auto.active ? "Ativo" : "Inativo"}
                    </button>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === auto.id ? null : auto.id); }}
                        className="p-1 text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] rounded-lg transition"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>
                      {menuOpen === auto.id && (
                        <CardMenu
                          onEdit={() => { setMenuOpen(null); setEditorAuto(auto); }}
                          onDuplicate={() => duplicateAutomation(auto)}
                          onDelete={() => deleteAutomation(auto.id)}
                          onClose={() => setMenuOpen(null)}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-[#0a0a0b] rounded-xl p-3 mb-3 overflow-hidden" style={{ backgroundImage: "radial-gradient(circle, #1d1d23 1px, transparent 1px)", backgroundSize: "16px 16px" }}>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    </div>
                    <div className="w-4 h-px bg-[#3b3b44]" />
                    <div className="flex-1 min-w-0 bg-[#141416] border border-[#28282e] rounded-lg px-2 py-1.5">
                      <div className="text-[8px] uppercase tracking-wider text-blue-400 font-semibold">Quando</div>
                      <div className="text-[10px] text-gray-300 truncate">{trigger?.short || auto.triggerType}</div>
                      {triggerDetail && <div className="text-[8px] text-gray-500 truncate">{triggerDetail}</div>}
                    </div>
                    <div className="w-4 h-px bg-[#3b3b44]" />
                    <div className="flex-1 min-w-0 bg-[#141416] border border-[#28282e] rounded-lg px-2 py-1.5">
                      <div className="text-[8px] uppercase tracking-wider text-emerald-400 font-semibold">Fazer</div>
                      <div className="text-[10px] text-gray-300 truncate">{action?.short || auto.actionType}</div>
                      {actionDetail && <div className="text-[8px] text-gray-500 truncate">{actionDetail}</div>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{auto.executionCount} {auto.executionCount === 1 ? "execução" : "execuções"}</span>
                  {auto.lastExecutedAt && (
                    <span>· {new Date(auto.lastExecutedAt).toLocaleDateString("pt-BR")}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <ConfirmDialog />
    </div>
  );
}

function CardMenu({ onEdit, onDuplicate, onDelete, onClose }: {
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
    <div ref={ref} className="absolute right-0 top-7 z-20 w-40 bg-white dark:bg-[#1a1a1e] border border-gray-200 dark:border-[#2a2a30] rounded-xl shadow-xl p-1" onClick={(e) => e.stopPropagation()}>
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

function FlowEditor({ editing, courses, onBack }: {
  editing: AutomationItem | null;
  courses: CourseOption[];
  onBack: () => void;
}) {
  const isEditing = !!editing;
  const [name, setName] = useState(editing?.name || "");
  const [active, setActive] = useState(editing?.active ?? true);
  const [courseId, setCourseId] = useState(editing?.courseId || "");
  const [triggerType, setTriggerType] = useState(editing?.triggerType || "");
  const [triggerConfig, setTriggerConfig] = useState<Record<string, string>>(() => {
    if (editing) { try { return JSON.parse(editing.triggerConfig); } catch { return {}; } }
    return {};
  });
  const [actionType, setActionType] = useState(editing?.actionType || "");
  const [actionConfig, setActionConfig] = useState<Record<string, string>>(() => {
    if (editing) { try { return JSON.parse(editing.actionConfig); } catch { return {}; } }
    return {};
  });

  const [nodes, setNodes] = useState<CanvasNode[]>(defaultNodes);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [editingNode, setEditingNode] = useState<"trigger" | "action" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<{ nodeId: string; offsetX: number; offsetY: number } | null>(null);
  const panning = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);

  const selectedCourse = courses.find((c) => c.id === courseId);
  const allLessons = selectedCourse?.modules.flatMap((m) =>
    m.lessons.map((l) => ({ ...l, moduleTitle: m.title }))
  ) || [];

  const screenToCanvas = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  }, [pan, zoom]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-node-id]")) return;
    panning.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging.current) {
      const pos = screenToCanvas(e.clientX, e.clientY);
      setNodes((prev) =>
        prev.map((n) =>
          n.id === dragging.current!.nodeId
            ? { ...n, x: pos.x - dragging.current!.offsetX, y: pos.y - dragging.current!.offsetY }
            : n
        )
      );
      return;
    }
    if (panning.current) {
      const dx = e.clientX - panning.current.startX;
      const dy = e.clientY - panning.current.startY;
      setPan({ x: panning.current.panX + dx, y: panning.current.panY + dy });
    }
  }, [screenToCanvas]);

  const handleMouseUp = useCallback(() => {
    dragging.current = null;
    panning.current = null;
  }, []);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (nodeId === "start") return;
    e.stopPropagation();
    const pos = screenToCanvas(e.clientX, e.clientY);
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    dragging.current = { nodeId, offsetX: pos.x - node.x, offsetY: pos.y - node.y };
  }, [nodes, screenToCanvas]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.3, Math.min(2.5, zoom * delta));
    const ratio = newZoom / zoom;
    setPan({ x: mouseX - ratio * (mouseX - pan.x), y: mouseY - ratio * (mouseY - pan.y) });
    setZoom(newZoom);
  }, [zoom, pan]);

  function centerCanvas() {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const allX = nodes.map((n) => n.x);
    const allY = nodes.map((n) => n.y);
    const minX = Math.min(...allX);
    const maxX = Math.max(...allX) + NODE_W;
    const minY = Math.min(...allY);
    const maxY = Math.max(...allY) + NODE_H;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    setZoom(1);
    setPan({ x: rect.width / 2 - cx, y: rect.height / 2 - cy });
  }

  const startNode = nodes.find((n) => n.id === "start")!;
  const triggerNode = nodes.find((n) => n.id === "trigger")!;
  const actionNode = nodes.find((n) => n.id === "action")!;

  const conn1 = {
    x1: startNode.x + START_R, y1: startNode.y + START_R,
    x2: triggerNode.x, y2: triggerNode.y + NODE_H / 2,
  };
  const conn2 = {
    x1: triggerNode.x + NODE_W, y1: triggerNode.y + NODE_H / 2,
    x2: actionNode.x, y2: actionNode.y + NODE_H / 2,
  };

  function bezierPath(x1: number, y1: number, x2: number, y2: number) {
    const dx = x2 - x1;
    return `M ${x1} ${y1} C ${x1 + dx * 0.5} ${y1}, ${x2 - dx * 0.5} ${y2}, ${x2} ${y2}`;
  }

  async function handleSave() {
    if (!name.trim()) { setError("Nome é obrigatório"); return; }
    if (!triggerType) { setError("Selecione um trigger"); return; }
    if (!actionType) { setError("Selecione uma ação"); return; }
    setSaving(true);
    setError("");
    try {
      const url = isEditing ? `/api/producer/automations/${editing.id}` : "/api/producer/automations";
      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, active, courseId: courseId || null, triggerType, triggerConfig, actionType, actionConfig }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erro ao salvar"); return; }
      onBack();
    } catch { setError("Erro de conexão"); } finally { setSaving(false); }
  }

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  if (isMobile) {
    return (
      <MobileFlowEditor
        name={name} setName={setName} active={active} setActive={setActive}
        courseId={courseId} setCourseId={setCourseId} courses={courses}
        triggerType={triggerType} setTriggerType={setTriggerType}
        triggerConfig={triggerConfig} setTriggerConfig={setTriggerConfig}
        actionType={actionType} setActionType={setActionType}
        actionConfig={actionConfig} setActionConfig={setActionConfig}
        saving={saving} error={error}
        onSave={handleSave} onBack={onBack}
        allLessons={allLessons} selectedCourse={selectedCourse || null}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0a0a0b]">
      {/* Editor header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#111113] border-b border-[#28282e]">
        <div className="flex items-center gap-4">
          <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Voltar
          </button>
          <div className="h-5 w-px bg-[#28282e]" />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome da automação..."
            className="bg-transparent text-white text-sm font-medium border-none outline-none w-64 placeholder-gray-600"
          />
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-xs text-red-400">{error}</span>}
          <button
            type="button"
            onClick={() => setActive(!active)}
            className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full font-medium transition ${
              active ? "bg-emerald-500/15 text-emerald-400" : "bg-gray-500/15 text-gray-400"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-400" : "bg-gray-500"}`} />
            {active ? "Ativo" : "Inativo"}
          </button>
          <select
            value={courseId}
            onChange={(e) => { setCourseId(e.target.value); setTriggerConfig({}); setActionConfig({}); }}
            className="bg-[#1a1a1e] border border-[#28282e] text-gray-300 text-xs rounded-lg px-3 py-1.5 outline-none"
          >
            <option value="">Todos os cursos</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg disabled:opacity-40 transition"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={canvasRef}
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
          style={{
            backgroundImage: "radial-gradient(circle, #1d1d23 1px, transparent 1px)",
            backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          {/* Transform layer */}
          <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0" }}>
            {/* SVG connections */}
            <svg className="absolute inset-0 pointer-events-none" style={{ width: 2000, height: 2000, overflow: "visible" }}>
              <defs>
                <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                  <path d="M 0 0 L 8 3 L 0 6 Z" fill="#3b3b44" />
                </marker>
              </defs>
              <path d={bezierPath(conn1.x1, conn1.y1, conn1.x2, conn1.y2)} stroke="#3b3b44" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" strokeDasharray="6 3" className="animate-dash" />
              <path d={bezierPath(conn2.x1, conn2.y1, conn2.x2, conn2.y2)} stroke="#3b3b44" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" strokeDasharray="6 3" className="animate-dash" />
            </svg>

            {/* Start node */}
            <div
              data-node-id="start"
              className="absolute flex flex-col items-center gap-2"
              style={{ transform: `translate(${startNode.x}px, ${startNode.y}px)`, width: START_R * 2 }}
            >
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              </div>
              <span className="text-[10px] text-gray-500 font-medium">Início</span>
            </div>

            {/* Trigger node */}
            <div
              data-node-id="trigger"
              className={`absolute cursor-move select-none ${editingNode === "trigger" ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-[#0a0a0b]" : ""}`}
              style={{ transform: `translate(${triggerNode.x}px, ${triggerNode.y}px)`, width: NODE_W }}
              onMouseDown={(e) => handleNodeMouseDown(e, "trigger")}
              onClick={(e) => { e.stopPropagation(); if (!dragging.current) setEditingNode("trigger"); }}
            >
              <div className="bg-[#141416] border border-[#28282e] rounded-xl overflow-hidden shadow-lg hover:border-blue-500/40 transition">
                <div className="px-3 py-2 bg-blue-600/10 flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={triggerType ? TRIGGER_META[triggerType]?.icon || "M13 10V3L4 14h7v7l9-11h-7z" : "M13 10V3L4 14h7v7l9-11h-7z"} />
                  </svg>
                  <span className="text-[10px] uppercase tracking-widest font-semibold text-blue-400">Quando</span>
                </div>
                <div className="px-3 py-3">
                  {triggerType ? (
                    <>
                      <p className="text-sm font-medium text-gray-200">{TRIGGER_META[triggerType]?.short}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{TRIGGER_META[triggerType]?.desc}</p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Clique para configurar</p>
                  )}
                </div>
              </div>
              {/* Port out */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 rounded-full bg-[#28282e] border-2 border-[#3b3b44]" />
            </div>

            {/* Action node */}
            <div
              data-node-id="action"
              className={`absolute cursor-move select-none ${editingNode === "action" ? "ring-2 ring-emerald-500 ring-offset-2 ring-offset-[#0a0a0b]" : ""}`}
              style={{ transform: `translate(${actionNode.x}px, ${actionNode.y}px)`, width: NODE_W }}
              onMouseDown={(e) => handleNodeMouseDown(e, "action")}
              onClick={(e) => { e.stopPropagation(); if (!dragging.current) setEditingNode("action"); }}
            >
              {/* Port in */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#28282e] border-2 border-[#3b3b44]" />
              <div className="bg-[#141416] border border-[#28282e] rounded-xl overflow-hidden shadow-lg hover:border-emerald-500/40 transition">
                <div className="px-3 py-2 bg-emerald-600/10 flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={actionType ? ACTION_META[actionType]?.icon || "M13 10V3L4 14h7v7l9-11h-7z" : "M13 10V3L4 14h7v7l9-11h-7z"} />
                  </svg>
                  <span className="text-[10px] uppercase tracking-widest font-semibold text-emerald-400">Fazer</span>
                </div>
                <div className="px-3 py-3">
                  {actionType ? (
                    <>
                      <p className="text-sm font-medium text-gray-200">{ACTION_META[actionType]?.short}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{ACTION_META[actionType]?.desc}</p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Clique para configurar</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Zoom controls */}
        <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-[#141416] border border-[#28282e] rounded-xl p-1 shadow-xl">
          <button type="button" onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>
          </button>
          <span className="text-xs text-gray-500 w-10 text-center font-mono">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => setZoom((z) => Math.min(2.5, z + 0.1))} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          </button>
          <div className="w-px h-5 bg-[#28282e]" />
          <button type="button" onClick={centerCanvas} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition" title="Centralizar">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
          </button>
        </div>

        {/* Side panel */}
        {editingNode && (
          <SidePanel
            type={editingNode}
            courses={courses}
            selectedCourse={selectedCourse || null}
            allLessons={allLessons}
            triggerType={triggerType}
            setTriggerType={(v) => { setTriggerType(v); setTriggerConfig({}); }}
            triggerConfig={triggerConfig}
            setTriggerConfig={setTriggerConfig}
            actionType={actionType}
            setActionType={(v) => { setActionType(v); setActionConfig({}); }}
            actionConfig={actionConfig}
            setActionConfig={setActionConfig}
            onClose={() => setEditingNode(null)}
          />
        )}
      </div>

      <style jsx>{`
        @keyframes dashMove {
          to { stroke-dashoffset: -18; }
        }
        :global(.animate-dash) {
          animation: dashMove 1.5s linear infinite;
        }
      `}</style>
    </div>
  );
}

function SidePanel({
  type, courses, selectedCourse, allLessons,
  triggerType, setTriggerType, triggerConfig, setTriggerConfig,
  actionType, setActionType, actionConfig, setActionConfig, onClose,
}: {
  type: "trigger" | "action";
  courses: CourseOption[];
  selectedCourse: CourseOption | null;
  allLessons: { id: string; title: string; moduleTitle: string }[];
  triggerType: string;
  setTriggerType: (v: string) => void;
  triggerConfig: Record<string, string>;
  setTriggerConfig: (v: Record<string, string>) => void;
  actionType: string;
  setActionType: (v: string) => void;
  actionConfig: Record<string, string>;
  setActionConfig: (v: Record<string, string>) => void;
  onClose: () => void;
}) {
  const isTrigger = type === "trigger";
  const meta = isTrigger ? TRIGGER_META : ACTION_META;
  const selected = isTrigger ? triggerType : actionType;
  const setSelected = isTrigger ? setTriggerType : setActionType;

  const selectCls = "w-full px-3 py-2.5 bg-[#0f1320] border border-[#1a1e2e] rounded-lg text-sm text-white outline-none focus:border-indigo-500/50";
  const labelCls = "block text-xs font-medium text-gray-400 mb-1.5";

  return (
    <div className="absolute top-0 right-0 h-full w-[360px] bg-[#141416] border-l border-[#28282e] shadow-2xl flex flex-col z-10 animate-slideIn">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#28282e]">
        <h3 className="text-sm font-semibold text-white">
          {isTrigger ? "Configurar trigger" : "Configurar ação"}
        </h3>
        <button type="button" onClick={onClose} className="p-1 text-gray-500 hover:text-white transition rounded-lg hover:bg-white/[0.06]">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div>
          <label className={labelCls}>Tipo</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(meta).map(([key, m]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 text-center transition ${
                  selected === key
                    ? isTrigger ? "border-blue-500 bg-blue-500/10" : "border-emerald-500 bg-emerald-500/10"
                    : "border-[#28282e] hover:border-[#363640]"
                }`}
              >
                <svg className={`w-5 h-5 ${isTrigger ? "text-blue-400" : "text-emerald-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={m.icon} />
                </svg>
                <span className="text-[11px] font-medium text-gray-300 leading-tight">{m.short}</span>
              </button>
            ))}
          </div>
        </div>

        {isTrigger && triggerType === "LESSON_COMPLETED" && selectedCourse && (
          <div>
            <label className={labelCls}>Aula específica (opcional)</label>
            <select value={triggerConfig.lessonId || ""} onChange={(e) => setTriggerConfig({ ...triggerConfig, lessonId: e.target.value })} className={selectCls}>
              <option value="">Qualquer aula</option>
              {allLessons.map((l) => <option key={l.id} value={l.id}>{l.moduleTitle} → {l.title}</option>)}
            </select>
          </div>
        )}
        {isTrigger && triggerType === "MODULE_COMPLETED" && selectedCourse && (
          <div>
            <label className={labelCls}>Módulo específico (opcional)</label>
            <select value={triggerConfig.moduleId || ""} onChange={(e) => setTriggerConfig({ ...triggerConfig, moduleId: e.target.value })} className={selectCls}>
              <option value="">Qualquer módulo</option>
              {selectedCourse.modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
            </select>
          </div>
        )}

        {!isTrigger && actionType === "UNLOCK_MODULE" && selectedCourse && (
          <div>
            <label className={labelCls}>Módulo para liberar</label>
            <select value={actionConfig.moduleId || ""} onChange={(e) => setActionConfig({ ...actionConfig, moduleId: e.target.value })} className={selectCls}>
              <option value="">Selecione...</option>
              {selectedCourse.modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
            </select>
          </div>
        )}
        {!isTrigger && actionType === "SEND_EMAIL" && (
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Assunto do email</label>
              <input type="text" value={actionConfig.subject || ""} onChange={(e) => setActionConfig({ ...actionConfig, subject: e.target.value })} placeholder="Parabéns pela conclusão!" className={selectCls} />
            </div>
            <div>
              <label className={labelCls}>Corpo do email</label>
              <textarea value={actionConfig.body || ""} onChange={(e) => setActionConfig({ ...actionConfig, body: e.target.value })} placeholder="Olá! Parabéns por completar..." rows={6} className={`${selectCls} resize-y`} />
            </div>
          </div>
        )}
        {!isTrigger && actionType === "ENROLL_COURSE" && (
          <div>
            <label className={labelCls}>Curso para matricular</label>
            <select value={actionConfig.courseId || ""} onChange={(e) => setActionConfig({ ...actionConfig, courseId: e.target.value })} className={selectCls}>
              <option value="">Selecione...</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slideIn {
          animation: slideIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

function MobileFlowEditor({
  name, setName, active, setActive, courseId, setCourseId, courses,
  triggerType, setTriggerType, triggerConfig, setTriggerConfig,
  actionType, setActionType, actionConfig, setActionConfig,
  saving, error, onSave, onBack, allLessons, selectedCourse,
}: {
  name: string; setName: (v: string) => void;
  active: boolean; setActive: (v: boolean) => void;
  courseId: string; setCourseId: (v: string) => void;
  courses: CourseOption[];
  triggerType: string; setTriggerType: (v: string) => void;
  triggerConfig: Record<string, string>; setTriggerConfig: (v: Record<string, string>) => void;
  actionType: string; setActionType: (v: string) => void;
  actionConfig: Record<string, string>; setActionConfig: (v: Record<string, string>) => void;
  saving: boolean; error: string;
  onSave: () => void; onBack: () => void;
  allLessons: { id: string; title: string; moduleTitle: string }[];
  selectedCourse: CourseOption | null;
}) {
  const selectCls = "w-full px-3 py-2.5 bg-[#0f1320] border border-[#1a1e2e] rounded-lg text-sm text-white outline-none";
  const labelCls = "block text-xs font-medium text-gray-400 mb-1.5";

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0b] overflow-y-auto">
      <div className="sticky top-0 z-10 bg-[#111113] border-b border-[#28282e] px-4 py-3 flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-sm text-gray-400 hover:text-white transition flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Voltar
        </button>
        <button type="button" onClick={onSave} disabled={saving} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg disabled:opacity-40 transition">
          {saving ? "..." : "Salvar"}
        </button>
      </div>

      <div className="p-4 space-y-5">
        {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

        <div>
          <label className={labelCls}>Nome da automação</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Liberar módulo 2 após completar módulo 1" className={selectCls} />
        </div>

        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setActive(!active)} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full font-medium transition ${active ? "bg-emerald-500/15 text-emerald-400" : "bg-gray-500/15 text-gray-400"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-400" : "bg-gray-500"}`} />
            {active ? "Ativo" : "Inativo"}
          </button>
          <select value={courseId} onChange={(e) => { setCourseId(e.target.value); setTriggerConfig({}); setActionConfig({}); }} className="flex-1 bg-[#1a1a1e] border border-[#28282e] text-gray-300 text-xs rounded-lg px-3 py-1.5 outline-none">
            <option value="">Todos os cursos</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>

        {/* Trigger */}
        <div className="bg-[#141416] border border-[#28282e] rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-blue-600/10 flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest font-semibold text-blue-400">Quando (Trigger)</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(TRIGGER_META).map(([key, m]) => (
                <button key={key} type="button" onClick={() => { setTriggerType(key); setTriggerConfig({}); }}
                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 text-center transition ${
                    triggerType === key ? "border-blue-500 bg-blue-500/10" : "border-[#28282e] hover:border-[#363640]"
                  }`}
                >
                  <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={m.icon} />
                  </svg>
                  <span className="text-[10px] font-medium text-gray-300">{m.short}</span>
                </button>
              ))}
            </div>
            {triggerType === "LESSON_COMPLETED" && selectedCourse && (
              <div>
                <label className={labelCls}>Aula específica</label>
                <select value={triggerConfig.lessonId || ""} onChange={(e) => setTriggerConfig({ ...triggerConfig, lessonId: e.target.value })} className={selectCls}>
                  <option value="">Qualquer aula</option>
                  {allLessons.map((l) => <option key={l.id} value={l.id}>{l.moduleTitle} → {l.title}</option>)}
                </select>
              </div>
            )}
            {triggerType === "MODULE_COMPLETED" && selectedCourse && (
              <div>
                <label className={labelCls}>Módulo específico</label>
                <select value={triggerConfig.moduleId || ""} onChange={(e) => setTriggerConfig({ ...triggerConfig, moduleId: e.target.value })} className={selectCls}>
                  <option value="">Qualquer módulo</option>
                  {selectedCourse.modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <div className="flex flex-col items-center">
            <div className="w-0.5 h-6 bg-[#3b3b44]" />
            <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[8px] border-t-[#3b3b44]" />
          </div>
        </div>

        {/* Action */}
        <div className="bg-[#141416] border border-[#28282e] rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-emerald-600/10 flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest font-semibold text-emerald-400">Fazer (Ação)</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(ACTION_META).map(([key, m]) => (
                <button key={key} type="button" onClick={() => { setActionType(key); setActionConfig({}); }}
                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 text-center transition ${
                    actionType === key ? "border-emerald-500 bg-emerald-500/10" : "border-[#28282e] hover:border-[#363640]"
                  }`}
                >
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={m.icon} />
                  </svg>
                  <span className="text-[10px] font-medium text-gray-300">{m.short}</span>
                </button>
              ))}
            </div>
            {actionType === "UNLOCK_MODULE" && selectedCourse && (
              <div>
                <label className={labelCls}>Módulo para liberar</label>
                <select value={actionConfig.moduleId || ""} onChange={(e) => setActionConfig({ ...actionConfig, moduleId: e.target.value })} className={selectCls}>
                  <option value="">Selecione...</option>
                  {selectedCourse.modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
                </select>
              </div>
            )}
            {actionType === "SEND_EMAIL" && (
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Assunto</label>
                  <input type="text" value={actionConfig.subject || ""} onChange={(e) => setActionConfig({ ...actionConfig, subject: e.target.value })} placeholder="Parabéns!" className={selectCls} />
                </div>
                <div>
                  <label className={labelCls}>Corpo</label>
                  <textarea value={actionConfig.body || ""} onChange={(e) => setActionConfig({ ...actionConfig, body: e.target.value })} placeholder="Olá!..." rows={4} className={`${selectCls} resize-y`} />
                </div>
              </div>
            )}
            {actionType === "ENROLL_COURSE" && (
              <div>
                <label className={labelCls}>Curso para matricular</label>
                <select value={actionConfig.courseId || ""} onChange={(e) => setActionConfig({ ...actionConfig, courseId: e.target.value })} className={selectCls}>
                  <option value="">Selecione...</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

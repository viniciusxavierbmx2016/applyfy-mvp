"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { useConfirm } from "@/hooks/use-confirm";
import { CustomSelect } from "@/components/custom-select";
import { HelpTooltip } from "@/components/help-tooltip";
import {
  AutomationItem,
  CourseOption,
  TagOption,
  CanvasNode,
  TemplateData,
} from "./_types";
import {
  TRIGGER_META,
  ACTION_META,
  GLOBAL_TRIGGERS,
  EVENT_TRIGGERS,
  NODE_W,
  NODE_H,
  START_R,
} from "./_lib/meta";
import {
  getValidActions,
  formatDelay,
  parseDelayMinutes,
  toDelayMinutes,
  getTriggerDetail,
  getActionDetail,
  validateFrontend,
  defaultNodes,
} from "./_lib/helpers";
import { TEMPLATES } from "./_data/templates";

const EmailEditor = dynamic(() => import("@/components/email-editor"), {
  ssr: false,
  loading: () => <div className="h-[200px] bg-gray-900/50 border border-white/10 rounded-lg animate-pulse" />,
});

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<AutomationItem[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorAuto, setEditorAuto] = useState<AutomationItem | null>(null);
  const [editorNew, setEditorNew] = useState(false);
  const [editorTemplate, setEditorTemplate] = useState<TemplateData | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/producer/automations");
      if (res.ok) {
        const data = await res.json();
        setAutomations(data.automations);
        setCourses(data.courses || []);
        setTags(data.tags || []);
      }
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function toggleActive(e: React.MouseEvent, auto: AutomationItem) {
    e.stopPropagation();
    const res = await fetch(`/api/producer/automations/${auto.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !auto.active }),
    });
    if (res.ok) setAutomations((prev) => prev.map((a) => (a.id === auto.id ? { ...a, active: !a.active } : a)));
  }

  async function deleteAutomation(id: string) {
    setMenuOpen(null);
    if (!(await confirm({ title: "Excluir automação", message: "Essa ação não pode ser desfeita.", variant: "danger", confirmText: "Excluir" }))) return;
    const res = await fetch(`/api/producer/automations/${id}`, { method: "DELETE" });
    if (res.ok) setAutomations((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleExecuteNow(auto: AutomationItem) {
    try {
      const cfg = JSON.parse(auto.triggerConfig);
      const tag = tags.find((t) => t.id === cfg.tagId);
      const tagName = tag?.name || "selecionada";
      const count = tag?.studentCount || 0;
      if (!(await confirm({ title: "Executar agora", message: `Executar para ${count} aluno${count !== 1 ? "s" : ""} com tag "${tagName}"?`, confirmText: "Executar" }))) return;
    } catch { return; }
    const res = await fetch(`/api/producer/automations/${auto.id}/execute`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      showToast(`Enviado: ${data.executed} | Ignorado: ${data.skipped} (já processados)`);
      load();
    }
  }

  async function handleResendAll(auto: AutomationItem) {
    try {
      const cfg = JSON.parse(auto.triggerConfig);
      const tag = tags.find((t) => t.id === cfg.tagId);
      const tagName = tag?.name || "selecionada";
      const count = tag?.studentCount || 0;
      if (!(await confirm({
        title: "Re-enviar para todos",
        message: `Re-enviar para TODOS os ${count} aluno${count !== 1 ? "s" : ""} com tag "${tagName}", incluindo os já processados?\n\nIsso pode duplicar emails e notificações.`,
        confirmText: "Re-enviar todos",
      }))) return;
    } catch { return; }
    const res = await fetch(`/api/producer/automations/${auto.id}/execute?force=true`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      showToast(`Enviado: ${data.executed} | Re-enviado: ${data.reExecuted} | Ignorado: ${data.skipped}`);
      load();
    } else {
      showToast("Erro ao re-enviar");
    }
  }

  async function duplicateAutomation(auto: AutomationItem) {
    setMenuOpen(null);
    let triggerConfig: unknown = {};
    let actionConfig: unknown = {};
    try { triggerConfig = JSON.parse(auto.triggerConfig); } catch { /* keep {} */ }
    try { actionConfig = JSON.parse(auto.actionConfig); } catch { /* keep {} */ }
    const res = await fetch("/api/producer/automations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `${auto.name} (cópia)`, courseId: auto.courseId, triggerType: auto.triggerType, triggerConfig, actionType: auto.actionType, actionConfig }),
    });
    if (res.ok) load();
  }

  if (editorAuto || editorNew || editorTemplate) {
    return createPortal(
      <FlowEditor editing={editorAuto} template={editorTemplate} courses={courses} tags={tags} onBack={() => { setEditorAuto(null); setEditorNew(false); setEditorTemplate(null); load(); }} />,
      document.body
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Automações
            <HelpTooltip text="Crie automações que executam ações automaticamente quando eventos acontecem. Ex: enviar email quando aluno se matricula." />
          </h1>
          <p className="text-sm text-gray-500 mt-1">Crie fluxos visuais que executam ações automaticamente</p>
        </div>
        <div className="flex items-center gap-0">
          <button type="button" onClick={() => setShowNewModal(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-xl transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Nova automação
          </button>
          <HelpTooltip text="Crie uma nova automação escolhendo um gatilho (evento) e uma ação (o que fazer quando o evento acontece)." />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl p-5 animate-pulse">
              <div className="h-4 w-32 bg-gray-200 dark:bg-white/5 rounded mb-4" />
              <div className="h-16 bg-gray-200 dark:bg-white/5 rounded-xl mb-3" />
              <div className="h-3 w-20 bg-gray-200 dark:bg-white/5 rounded" />
            </div>
          ))}
        </div>
      ) : automations.length === 0 ? (
        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
            <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <p className="text-gray-900 dark:text-white font-semibold text-lg mb-2">Automatize tarefas repetitivas</p>
          <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">Crie fluxos visuais que executam ações automaticamente</p>
          <button type="button" onClick={() => setShowNewModal(true)} className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-xl transition">+ Criar primeira automação</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {automations.map((auto) => {
            const trigger = TRIGGER_META[auto.triggerType];
            const action = ACTION_META[auto.actionType];
            const td = getTriggerDetail(auto, courses, tags);
            const ad = getActionDetail(auto, courses);
            const courseName = courses.find((c) => c.id === auto.courseId)?.title;
            return (
              <div key={auto.id} onClick={() => setEditorAuto(auto)} className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl p-5 cursor-pointer transition hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate pr-2">{auto.name}</h3>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button type="button" onClick={(e) => toggleActive(e, auto)} className={`flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full font-medium transition ${auto.active ? "bg-emerald-500/15 text-emerald-400" : "bg-gray-500/15 text-gray-400"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${auto.active ? "bg-emerald-400" : "bg-gray-500"}`} />
                      {auto.active ? "Ativo" : "Inativo"}
                    </button>
                    <div className="relative">
                      <button type="button" onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === auto.id ? null : auto.id); }} className="p-1 text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded-lg transition">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                      </button>
                      {menuOpen === auto.id && <CardMenu onEdit={() => { setMenuOpen(null); setEditorAuto(auto); }} onDuplicate={() => duplicateAutomation(auto)} onDelete={() => deleteAutomation(auto.id)} onClose={() => setMenuOpen(null)} />}
                    </div>
                  </div>
                </div>
                {courseName && <p className="text-[10px] text-primary mb-2 truncate">{courseName}</p>}
                <div className="bg-[#0a0a0b] rounded-xl p-3 mb-3 overflow-hidden" style={{ backgroundImage: "radial-gradient(circle, #1d1d23 1px, transparent 1px)", backgroundSize: "16px 16px" }}>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0"><svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg></div>
                    <div className="w-4 h-px bg-[#3b3b44]" />
                    <div className="flex-1 min-w-0 bg-[#141416] border border-[#28282e] rounded-lg px-2 py-1.5">
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] uppercase tracking-wider text-primary font-semibold">Quando</span>
                        {trigger?.behavioral && <span className="text-[7px] px-1 py-px rounded bg-amber-500/20 text-amber-400 font-medium">Cron</span>}
                      </div>
                      <div className="text-[10px] text-gray-300 truncate">{trigger?.short || auto.triggerType}</div>
                      {td && <div className="text-[8px] text-gray-500 truncate">{td}</div>}
                    </div>
                    <div className="w-4 h-px bg-[#3b3b44]" />
                    <div className="flex-1 min-w-0 bg-[#141416] border border-[#28282e] rounded-lg px-2 py-1.5">
                      <div className="text-[8px] uppercase tracking-wider text-emerald-400 font-semibold">Fazer</div>
                      <div className="text-[10px] text-gray-300 truncate">{action?.short || auto.actionType}</div>
                      {ad && <div className="text-[8px] text-gray-500 truncate">{ad}</div>}
                    </div>
                  </div>
                  {(() => { try { const tc = JSON.parse(auto.triggerConfig); const dm = Number(tc.delayMinutes) || 0; if (dm > 0) return <div className="mt-1.5 flex justify-center"><span className="text-[10px] text-amber-400">⏱ {formatDelay(dm)}</span></div>; } catch {} return null; })()}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{auto.executionCount} {auto.executionCount === 1 ? "execução" : "execuções"}</span>
                    {auto.lastExecutedAt && <span>· {new Date(auto.lastExecutedAt).toLocaleDateString("pt-BR")}</span>}
                  </div>
                  {auto.triggerType === "HAS_TAG" && auto.active && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleExecuteNow(auto); }}
                        className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 transition"
                        title="Executa apenas para alunos que ainda não receberam"
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        Executar novos
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleResendAll(auto); }}
                        className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition"
                        title="Re-envia para TODOS com a tag, incluindo já processados"
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
                        Re-enviar todos
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showNewModal && <NewAutomationModal onClose={() => setShowNewModal(false)} onScratch={() => { setShowNewModal(false); setEditorNew(true); }} onTemplate={(t) => { setShowNewModal(false); setEditorTemplate(t); }} />}
      <ConfirmDialog />
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-primary text-white rounded-lg shadow-xl text-sm font-medium">
          {toast}
        </div>
      )}
    </div>
  );
}

function NewAutomationModal({ onClose, onScratch, onTemplate }: { onClose: () => void; onScratch: () => void; onTemplate: (t: TemplateData) => void }) {
  const [showTemplates, setShowTemplates] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] sm:pt-[8vh] overflow-y-auto" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative bg-white dark:bg-gray-950 border border-gray-200 dark:border-white/10 rounded-2xl p-6 max-w-2xl w-full mx-4 shadow-2xl mb-10" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Nova automação</h3>
          <button type="button" onClick={onClose} className="p-1 text-gray-500 hover:text-white transition rounded-lg hover:bg-white/5">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        {!showTemplates ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button type="button" onClick={onScratch} className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-gray-200 dark:border-white/10 hover:border-primary/50 hover:bg-primary/5 transition text-center group">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition">
                <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <div><p className="text-sm font-semibold text-gray-900 dark:text-white">Criar do zero</p><p className="text-xs text-gray-500 mt-1">Monte seu fluxo personalizado</p></div>
            </button>
            <button type="button" onClick={() => setShowTemplates(true)} className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-gray-200 dark:border-white/10 hover:border-primary/50 hover:bg-primary/5 transition text-center group">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition">
                <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <div><p className="text-sm font-semibold text-gray-900 dark:text-white">Usar template</p><p className="text-xs text-gray-500 mt-1">Comece com um modelo pronto</p></div>
            </button>
          </div>
        ) : (
          <div>
            <button type="button" onClick={() => setShowTemplates(false)} className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition mb-4">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              Voltar
            </button>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {TEMPLATES.map((t, i) => {
                const trigger = TRIGGER_META[t.triggerType];
                return (
                  <button key={i} type="button" onClick={() => onTemplate(t)} className="flex flex-col items-start gap-2 p-4 rounded-xl border border-gray-200 dark:border-white/10 hover:border-primary/50 hover:bg-primary/5 transition text-left">
                    <span className="text-2xl">{t.emoji}</span>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{t.name}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{t.description}</p>
                    <span className={`text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full ${trigger?.behavioral ? "bg-amber-500/10 text-amber-400" : "bg-blue-500/10 text-blue-400"}`}>{trigger?.short || t.triggerType}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CardMenu({ onEdit, onDuplicate, onDelete, onClose }: { onEdit: () => void; onDuplicate: () => void; onDelete: () => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose]);
  const item = "w-full text-left px-3 py-2 text-sm hover:bg-white/5 transition rounded-lg flex items-center gap-2";
  return (
    <div ref={ref} className="absolute right-0 top-7 z-20 w-40 bg-white dark:bg-gray-950 border border-gray-200 dark:border-white/10 rounded-xl shadow-xl p-1" onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={onEdit} className={`${item} text-gray-700 dark:text-gray-300`}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>Editar</button>
      <button type="button" onClick={onDuplicate} className={`${item} text-gray-700 dark:text-gray-300`}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Duplicar</button>
      <div className="h-px bg-gray-200 dark:bg-white/10 my-1" />
      <button type="button" onClick={onDelete} className={`${item} text-red-400`}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>Excluir</button>
    </div>
  );
}

function FlowEditor({ editing, template, courses, tags, onBack }: { editing: AutomationItem | null; template: TemplateData | null; courses: CourseOption[]; tags: TagOption[]; onBack: () => void }) {
  const isEditing = !!editing;
  const [name, setName] = useState(editing?.name || template?.name || "");
  const [active, setActive] = useState(editing?.active ?? true);
  const [courseId, setCourseId] = useState(editing?.courseId || "");
  const [triggerType, setTriggerType] = useState(editing?.triggerType || template?.triggerType || "");
  const [triggerConfig, setTriggerConfig] = useState<Record<string, string>>(() => {
    if (editing) { try { return JSON.parse(editing.triggerConfig); } catch { return {}; } }
    if (template) return template.triggerConfig as Record<string, string>;
    return {};
  });
  const [actionType, setActionType] = useState(editing?.actionType || template?.actionType || "");
  const [actionConfig, setActionConfig] = useState<Record<string, string>>(() => {
    if (editing) { try { return JSON.parse(editing.actionConfig); } catch { return {}; } }
    if (template) return template.actionConfig as Record<string, string>;
    return {};
  });
  const [delayValue, setDelayValue] = useState(() => {
    if (editing) { try { const c = JSON.parse(editing.triggerConfig); return parseDelayMinutes(Number(c.delayMinutes) || 0).value; } catch { return ""; } }
    return "";
  });
  const [delayUnit, setDelayUnit] = useState(() => {
    if (editing) { try { const c = JSON.parse(editing.triggerConfig); return parseDelayMinutes(Number(c.delayMinutes) || 0).unit; } catch { return "minutes"; } }
    return "minutes";
  });

  const [nodes, setNodes] = useState<CanvasNode[]>(defaultNodes);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [editingNode, setEditingNode] = useState<"trigger" | "action" | null>(
    template?.needsCourse ? "trigger" : null
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<{ nodeId: string; offsetX: number; offsetY: number } | null>(null);
  const panning = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);

  const selectedCourse = courses.find((c) => c.id === courseId);

  useEffect(() => {
    if (triggerType && actionType) {
      const valid = getValidActions(triggerType);
      if (!valid.includes(actionType)) {
        setActionType("");
        setActionConfig({});
      }
    }
  }, [triggerType, actionType]);

  const screenToCanvas = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: (clientX - rect.left - pan.x) / zoom, y: (clientY - rect.top - pan.y) / zoom };
  }, [pan, zoom]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("[data-node-id]")) return;
    panning.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging.current) {
      // Snapshot the ref: the setNodes updater runs async (and twice under
      // StrictMode); reading dragging.current inside it crashes if mouseup
      // nulled it first ("Cannot read properties of null (reading 'nodeId')").
      const drag = dragging.current;
      const pos = screenToCanvas(e.clientX, e.clientY);
      setNodes((prev) => prev.map((n) => n.id === drag.nodeId ? { ...n, x: pos.x - drag.offsetX, y: pos.y - drag.offsetY } : n));
      return;
    }
    if (panning.current) {
      setPan({ x: panning.current.panX + e.clientX - panning.current.startX, y: panning.current.panY + e.clientY - panning.current.startY });
    }
  }, [screenToCanvas]);

  const handleMouseUp = useCallback(() => { dragging.current = null; panning.current = null; }, []);

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
    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    const cx = (Math.min(...xs) + Math.max(...xs) + NODE_W) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys) + NODE_H) / 2;
    setZoom(1);
    setPan({ x: rect.width / 2 - cx, y: rect.height / 2 - cy });
  }

  const startNode = nodes.find((n) => n.id === "start")!;
  const triggerNode = nodes.find((n) => n.id === "trigger")!;
  const actionNode = nodes.find((n) => n.id === "action")!;

  function bezierPath(x1: number, y1: number, x2: number, y2: number) {
    const dx = x2 - x1;
    return `M ${x1} ${y1} C ${x1 + dx * 0.5} ${y1}, ${x2 - dx * 0.5} ${y2}, ${x2} ${y2}`;
  }

  async function handleSave() {
    const err = validateFrontend(name, courseId, triggerType, triggerConfig, actionType, actionConfig);
    if (err) { setError(err); return; }
    setSaving(true);
    setError("");
    const delayMinutes = EVENT_TRIGGERS.includes(triggerType) ? toDelayMinutes(delayValue, delayUnit) : 0;
    const restTriggerConfig = Object.fromEntries(Object.entries(triggerConfig).filter(([k]) => k !== "delayMinutes"));
    const finalTriggerConfig = delayMinutes > 0 ? { ...restTriggerConfig, delayMinutes: String(delayMinutes) } : restTriggerConfig;
    try {
      const url = isEditing ? `/api/producer/automations/${editing.id}` : "/api/producer/automations";
      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, active, courseId: courseId || null, triggerType, triggerConfig: finalTriggerConfig, actionType, actionConfig }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erro ao salvar"); return; }
      onBack();
    } catch { setError("Erro de conexão"); } finally { setSaving(false); }
  }

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  if (isMobile) {
    return <MobileFlowEditor name={name} setName={setName} active={active} setActive={setActive} courseId={courseId} setCourseId={setCourseId} courses={courses} tags={tags} triggerType={triggerType} setTriggerType={setTriggerType} triggerConfig={triggerConfig} setTriggerConfig={setTriggerConfig} actionType={actionType} setActionType={setActionType} actionConfig={actionConfig} setActionConfig={setActionConfig} saving={saving} error={error} onSave={handleSave} onBack={onBack} selectedCourse={selectedCourse || null} delayValue={delayValue} setDelayValue={setDelayValue} delayUnit={delayUnit} setDelayUnit={setDelayUnit} />;
  }

  const conn1 = { x1: startNode.x + START_R, y1: startNode.y + START_R, x2: triggerNode.x, y2: triggerNode.y + NODE_H / 2 };
  const conn2 = { x1: triggerNode.x + NODE_W, y1: triggerNode.y + NODE_H / 2, x2: actionNode.x, y2: actionNode.y + NODE_H / 2 };

  const triggerMeta = triggerType ? TRIGGER_META[triggerType] : null;
  const actionMeta = actionType ? ACTION_META[actionType] : null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#0a0a0b]">
      <div className="flex items-center justify-between px-4 py-3 bg-[#111113] border-b border-[#28282e]">
        <div className="flex items-center gap-4">
          <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>Voltar
          </button>
          <div className="h-5 w-px bg-[#28282e]" />
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da automação..." className="bg-transparent text-white text-sm font-medium border-none outline-none w-64 placeholder-gray-600" />
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-xs text-red-400 max-w-xs truncate">{error}</span>}
          <button type="button" onClick={() => setActive(!active)} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full font-medium transition ${active ? "bg-emerald-500/15 text-emerald-400" : "bg-gray-500/15 text-gray-400"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-400" : "bg-gray-500"}`} />{active ? "Ativo" : "Inativo"}
          </button>
          <button type="button" onClick={handleSave} disabled={saving} className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-lg disabled:opacity-40 transition">{saving ? "Salvando..." : "Salvar"}</button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <div ref={canvasRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" style={{ backgroundImage: "radial-gradient(circle, #1d1d23 1px, transparent 1px)", backgroundSize: `${24 * zoom}px ${24 * zoom}px`, backgroundPosition: `${pan.x}px ${pan.y}px` }} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}>
          <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0" }}>
            <svg className="absolute inset-0 pointer-events-none" style={{ width: 2000, height: 2000, overflow: "visible" }}>
              <defs><marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M 0 0 L 8 3 L 0 6 Z" fill="#3b3b44" /></marker></defs>
              <path d={bezierPath(conn1.x1, conn1.y1, conn1.x2, conn1.y2)} stroke="#3b3b44" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" strokeDasharray="6 3" className="animate-dash" />
              <path d={bezierPath(conn2.x1, conn2.y1, conn2.x2, conn2.y2)} stroke="#3b3b44" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" strokeDasharray="6 3" className="animate-dash" />
            </svg>

            <div data-node-id="start" className="absolute flex flex-col items-center gap-2" style={{ transform: `translate(${startNode.x}px, ${startNode.y}px)`, width: START_R * 2 }}>
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30"><svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg></div>
              <span className="text-[10px] text-gray-500 font-medium">Início</span>
            </div>

            <div data-node-id="trigger" className={`absolute cursor-move select-none rounded-xl ${editingNode === "trigger" ? "ring-2 ring-primary ring-offset-2 ring-offset-[#0a0a0b]" : ""}`} style={{ transform: `translate(${triggerNode.x}px, ${triggerNode.y}px)`, width: NODE_W }} onMouseDown={(e) => handleNodeMouseDown(e, "trigger")} onClick={(e) => { e.stopPropagation(); if (!dragging.current) setEditingNode("trigger"); }}>
              <div className="bg-[#141416] border border-[#28282e] rounded-xl overflow-hidden shadow-lg hover:border-primary/40 transition">
                <div className={`px-3 py-2 flex items-center gap-2 ${triggerType === "HAS_TAG" ? "bg-purple-600/10" : "bg-blue-600/10"}`}>
                  <svg className={`w-3.5 h-3.5 ${triggerType === "HAS_TAG" ? "text-purple-400" : "text-blue-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d={triggerMeta?.icon || "M13 10V3L4 14h7v7l9-11h-7z"} /></svg>
                  <span className={`text-[10px] uppercase tracking-widest font-semibold ${triggerType === "HAS_TAG" ? "text-purple-400" : "text-blue-400"}`}>Quando</span>
                  {triggerMeta?.behavioral && triggerType !== "HAS_TAG" && <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium ml-auto">Cron</span>}
                  {triggerType === "HAS_TAG" && <span className="text-[8px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-medium ml-auto">Tag</span>}
                </div>
                <div className="px-3 py-3">
                  {triggerType ? <><p className="text-sm font-medium text-gray-200">{triggerMeta?.short}</p><p className="text-xs text-gray-500 mt-0.5">{triggerMeta?.desc}</p></> : <p className="text-sm text-gray-500 italic">Clique para configurar</p>}
                </div>
              </div>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 rounded-full bg-[#28282e] border-2 border-[#3b3b44]" />
            </div>

            <div data-node-id="action" className={`absolute cursor-move select-none rounded-xl ${editingNode === "action" ? "ring-2 ring-emerald-500 ring-offset-2 ring-offset-[#0a0a0b]" : ""}`} style={{ transform: `translate(${actionNode.x}px, ${actionNode.y}px)`, width: NODE_W }} onMouseDown={(e) => handleNodeMouseDown(e, "action")} onClick={(e) => { e.stopPropagation(); if (!dragging.current) setEditingNode("action"); }}>
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#28282e] border-2 border-[#3b3b44]" />
              <div className="bg-[#141416] border border-[#28282e] rounded-xl overflow-hidden shadow-lg hover:border-emerald-500/40 transition">
                <div className="px-3 py-2 bg-emerald-600/10 flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d={actionMeta?.icon || "M13 10V3L4 14h7v7l9-11h-7z"} /></svg>
                  <span className="text-[10px] uppercase tracking-widest font-semibold text-emerald-400">Fazer</span>
                </div>
                <div className="px-3 py-3">
                  {actionType ? <><p className="text-sm font-medium text-gray-200">{actionMeta?.short}</p><p className="text-xs text-gray-500 mt-0.5">{actionMeta?.desc}</p></> : <p className="text-sm text-gray-500 italic">Clique para configurar</p>}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-[#141416] border border-[#28282e] rounded-xl p-1 shadow-xl">
          <button type="button" onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg></button>
          <span className="text-xs text-gray-500 w-10 text-center font-mono">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => setZoom((z) => Math.min(2.5, z + 0.1))} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg></button>
          <div className="w-px h-5 bg-[#28282e]" />
          <button type="button" onClick={centerCanvas} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition" title="Centralizar"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg></button>
        </div>

        {editingNode && (
          <SidePanel type={editingNode} courses={courses} tags={tags} courseId={courseId} setCourseId={(v) => { setCourseId(v); setTriggerConfig({}); setActionConfig({}); }} selectedCourse={selectedCourse || null} triggerType={triggerType} setTriggerType={(v) => { setTriggerType(v); setTriggerConfig({}); }} triggerConfig={triggerConfig} setTriggerConfig={setTriggerConfig} actionType={actionType} setActionType={(v) => { setActionType(v); setActionConfig({}); }} actionConfig={actionConfig} setActionConfig={setActionConfig} delayValue={delayValue} setDelayValue={setDelayValue} delayUnit={delayUnit} setDelayUnit={setDelayUnit} onClose={() => setEditingNode(null)} />
        )}
      </div>

      <style jsx>{`
        @keyframes dashMove { to { stroke-dashoffset: -18; } }
        :global(.animate-dash) { animation: dashMove 1.5s linear infinite; }
      `}</style>
    </div>
  );
}

function SidePanel({
  type, courses, tags, courseId, setCourseId, selectedCourse,
  triggerType, setTriggerType, triggerConfig, setTriggerConfig,
  actionType, setActionType, actionConfig, setActionConfig,
  delayValue, setDelayValue, delayUnit, setDelayUnit, onClose,
}: {
  type: "trigger" | "action";
  courses: CourseOption[];
  tags: TagOption[];
  courseId: string;
  setCourseId: (v: string) => void;
  selectedCourse: CourseOption | null;
  triggerType: string; setTriggerType: (v: string) => void;
  triggerConfig: Record<string, string>; setTriggerConfig: (v: Record<string, string>) => void;
  actionType: string; setActionType: (v: string) => void;
  actionConfig: Record<string, string>; setActionConfig: (v: Record<string, string>) => void;
  delayValue: string; setDelayValue: (v: string) => void;
  delayUnit: string; setDelayUnit: (v: string) => void;
  onClose: () => void;
}) {
  const isTrigger = type === "trigger";
  const selectCls = "w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary/50 transition-colors";
  const labelCls = "block text-xs font-medium text-gray-400 mb-1.5";
  const inputCls = selectCls;
  const stepCls = "text-[11px] uppercase tracking-wider font-semibold text-gray-400 mb-3";

  const allLessons = selectedCourse?.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleTitle: m.title }))) || [];

  return (
    <div className="absolute top-0 left-0 h-full w-[400px] bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-white/10 shadow-2xl flex flex-col z-10 animate-slideIn">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-white/10">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{isTrigger ? "Configurar gatilho" : "Configurar ação"}</h3>
        <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white transition rounded-lg hover:bg-gray-100 dark:hover:bg-white/5">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 pb-24">
        {isTrigger ? (
          <>
            {/* STEP 1 - Curso */}
            <div>
              <p className={stepCls}>1. Curso</p>
              <CustomSelect value={courseId} onChange={setCourseId} options={[{ value: "", label: GLOBAL_TRIGGERS.includes(triggerType) ? "Todos os cursos (opcional)" : "Selecione um curso..." }, ...courses.map((c) => ({ value: c.id, label: c.title }))]} />
              {!courseId && !GLOBAL_TRIGGERS.includes(triggerType) && triggerType && (
                <p className="text-[10px] text-amber-400 mt-1">Curso obrigatório para este trigger</p>
              )}
            </div>

            {/* STEP 2 - Trigger type */}
            <div className="pt-5 border-t border-gray-200 dark:border-white/5">
              <p className={stepCls}>2. Quando</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(TRIGGER_META).map(([key, m]) => (
                  <button key={key} type="button" onClick={() => setTriggerType(key)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-colors cursor-pointer ${triggerType === key ? "border-primary bg-primary/5 dark:bg-primary/10" : "bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-primary/30"}`}>
                    <svg className="w-5 h-5 text-primary mx-auto mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={m.icon} /></svg>
                    <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 leading-tight">{m.short}</span>
                    {m.behavioral && <span className="text-[8px] px-1.5 py-px rounded bg-amber-500/15 text-amber-500 dark:text-amber-400 font-medium">Cron</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* STEP 3 - Detalhes do trigger */}
            {triggerType && (
              <div className="pt-5 border-t border-gray-200 dark:border-white/5">
                <p className={stepCls}>3. Detalhes</p>
                {triggerType === "LESSON_COMPLETED" && selectedCourse && (
                  <div className="mb-4"><label className={labelCls}>Aula específica (opcional)</label>
                    <CustomSelect value={triggerConfig.lessonId || ""} onChange={(v) => setTriggerConfig({ ...triggerConfig, lessonId: v })} options={[{ value: "", label: "Qualquer aula" }, ...allLessons.map((l) => ({ value: l.id, label: `${l.moduleTitle} → ${l.title}` }))]} />
                  </div>
                )}
                {triggerType === "MODULE_COMPLETED" && selectedCourse && (
                  <div className="mb-4"><label className={labelCls}>Módulo (opcional)</label>
                    <CustomSelect value={triggerConfig.moduleId || ""} onChange={(v) => setTriggerConfig({ ...triggerConfig, moduleId: v })} options={[{ value: "", label: "Qualquer módulo" }, ...selectedCourse.modules.map((m) => ({ value: m.id, label: m.title }))]} />
                  </div>
                )}
                {triggerType === "STUDENT_INACTIVE" && (
                  <div className="mb-4"><label className={labelCls}>Dias de inatividade</label>
                    <input type="number" min={1} value={triggerConfig.inactiveDays || "7"} onChange={(e) => setTriggerConfig({ ...triggerConfig, inactiveDays: e.target.value })} className={inputCls} />
                    <p className="text-[10px] text-gray-500 mt-1">Verificado automaticamente a cada 6h</p>
                  </div>
                )}
                {triggerType === "STUDENT_NEVER_ACCESSED" && (
                  <div className="mb-4"><label className={labelCls}>Dias após matrícula</label>
                    <input type="number" min={1} value={triggerConfig.afterDays || "3"} onChange={(e) => setTriggerConfig({ ...triggerConfig, afterDays: e.target.value })} className={inputCls} />
                  </div>
                )}
                {triggerType === "PROGRESS_BELOW" && (
                  <div className="space-y-3 mb-4">
                    <div><label className={labelCls}>Progresso abaixo de (%)</label>
                      <input type="number" min={1} max={99} value={triggerConfig.progressPercent || "25"} onChange={(e) => setTriggerConfig({ ...triggerConfig, progressPercent: e.target.value })} className={inputCls} />
                    </div>
                    <div><label className={labelCls}>Após quantos dias</label>
                      <input type="number" min={1} value={triggerConfig.afterDays || "14"} onChange={(e) => setTriggerConfig({ ...triggerConfig, afterDays: e.target.value })} className={inputCls} />
                    </div>
                  </div>
                )}
                {triggerType === "PROGRESS_ABOVE" && (
                  <div className="mb-4"><label className={labelCls}>Progresso acima de (%)</label>
                    <input type="number" min={1} max={100} value={triggerConfig.progressPercent || "50"} onChange={(e) => setTriggerConfig({ ...triggerConfig, progressPercent: e.target.value })} className={inputCls} />
                  </div>
                )}
                {triggerType === "MODULE_NOT_STARTED" && selectedCourse && (
                  <div className="space-y-3 mb-4">
                    <div><label className={labelCls}>Módulo</label>
                      <CustomSelect value={triggerConfig.moduleId || ""} onChange={(v) => setTriggerConfig({ ...triggerConfig, moduleId: v })} options={[{ value: "", label: "Selecione..." }, ...selectedCourse.modules.map((m) => ({ value: m.id, label: m.title }))]} />
                    </div>
                    <div><label className={labelCls}>Após quantos dias</label>
                      <input type="number" min={1} value={triggerConfig.afterDays || "7"} onChange={(e) => setTriggerConfig({ ...triggerConfig, afterDays: e.target.value })} className={inputCls} />
                    </div>
                  </div>
                )}
                {triggerType === "HAS_TAG" && (
                  <div className="mb-4">
                    <label className={labelCls}>Tag</label>
                    <CustomSelect value={triggerConfig.tagId || ""} onChange={(v) => setTriggerConfig({ ...triggerConfig, tagId: v })} options={[{ value: "", label: "Selecione uma tag..." }, ...tags.map((t) => ({ value: t.id, label: `${t.name} (${t.studentCount} alunos)` }))]} />
                    {tags.length === 0 && <p className="text-[10px] text-amber-400 mt-1">Nenhuma tag encontrada. Crie tags na aba &quot;Tags&quot;.</p>}
                    {triggerConfig.tagId && (() => {
                      const tag = tags.find((t) => t.id === triggerConfig.tagId);
                      return tag ? (
                        <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-500/20">
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                          <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{tag.name}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">{tag.studentCount} alunos</span>
                        </div>
                      ) : null;
                    })()}
                    <p className="text-[10px] text-gray-500 mt-2">Executada via cron (6h) ou botão &quot;Executar agora&quot;</p>
                  </div>
                )}
                {(triggerType === "COURSE_COMPLETED" || triggerType === "STUDENT_ENROLLED" || triggerType === "QUIZ_PASSED") && !selectedCourse && !GLOBAL_TRIGGERS.includes(triggerType) && (
                  <p className="text-xs text-gray-500">Selecione um curso acima</p>
                )}
                {(triggerType === "COURSE_COMPLETED" || triggerType === "STUDENT_ENROLLED") && selectedCourse && (
                  <p className="text-xs text-gray-500">Nenhuma configuração adicional necessária</p>
                )}
                {triggerType === "QUIZ_PASSED" && selectedCourse && (
                  <div className="mb-4"><label className={labelCls}>Quiz (opcional)</label>
                    <CustomSelect value={triggerConfig.quizId || ""} onChange={(v) => setTriggerConfig({ ...triggerConfig, quizId: v })} options={[{ value: "", label: "Qualquer quiz" }, ...allLessons.filter((l) => l.quiz).map((l) => ({ value: l.quiz!.id, label: `${l.moduleTitle} → ${l.title}` }))]} />
                  </div>
                )}
                {EVENT_TRIGGERS.includes(triggerType) && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/5">
                    <label className={labelCls}>Atraso na execução (opcional)</label>
                    <div className="flex gap-2">
                      <input type="number" min={0} value={delayValue} onChange={(e) => setDelayValue(e.target.value)} placeholder="0" className={`${inputCls} w-20`} />
                      <CustomSelect value={delayUnit} onChange={setDelayUnit} className="flex-1" options={[{ value: "minutes", label: "Minutos" }, { value: "hours", label: "Horas" }, { value: "days", label: "Dias" }]} />
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1.5">
                      {delayValue && Number(delayValue) > 0
                        ? `A ação será executada ${delayValue} ${delayUnit === "minutes" ? "minuto(s)" : delayUnit === "hours" ? "hora(s)" : "dia(s)"} após o gatilho`
                        : "Sem atraso — executa imediatamente"}
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            {/* ACTION panel - only valid actions */}
            {!triggerType ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">Configure o gatilho primeiro</p>
                <p className="text-xs text-gray-600 mt-1">Clique no nó azul &quot;Quando&quot;</p>
              </div>
            ) : (
              <>
                <div>
                  <p className={stepCls}>O que fazer</p>
                  {(() => {
                    const validActions = getValidActions(triggerType);
                    return (
                      <div className="grid grid-cols-2 gap-2">
                        {validActions.map((key) => {
                          const m = ACTION_META[key];
                          if (!m) return null;
                          return (
                            <button key={key} type="button" onClick={() => setActionType(key)}
                              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-colors cursor-pointer ${actionType === key ? "border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10" : "bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-emerald-500/30"}`}>
                              <svg className="w-5 h-5 text-emerald-400 mx-auto mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={m.icon} /></svg>
                              <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 leading-tight">{m.short}</span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {actionType && (
                  <div className="pt-5 border-t border-gray-200 dark:border-white/5">
                    <p className={stepCls}>Detalhes</p>
                    {actionType === "UNLOCK_MODULE" && selectedCourse && (() => {
                      const targetMod = actionConfig.moduleId ? selectedCourse.modules.find((m) => m.id === actionConfig.moduleId) : null;
                      return (
                        <div className="mb-4"><label className={labelCls}>Módulo para liberar</label>
                          <CustomSelect value={actionConfig.moduleId || ""} onChange={(v) => setActionConfig({ ...actionConfig, moduleId: v })} options={[{ value: "", label: "Selecione..." }, ...selectedCourse.modules.filter((m) => m.id !== triggerConfig.moduleId).map((m) => ({ value: m.id, label: m.title }))]} />
                          {triggerType === "MODULE_COMPLETED" && <p className="text-[10px] text-gray-500 mt-1">Módulos do trigger são excluídos</p>}
                          {targetMod && targetMod.daysToRelease > 0 && (
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-300 mt-3">
                              Este módulo tem liberação por tempo configurada ({targetMod.daysToRelease} dias). A automação vai sobrescrever essa configuração — o módulo ficará bloqueado até o gatilho ser acionado.
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    {actionType === "UNLOCK_MODULE" && !selectedCourse && (
                      <p className="text-xs text-gray-500">Selecione um curso no painel do gatilho</p>
                    )}
                    {actionType === "SEND_EMAIL" && (
                      <div className="space-y-4">
                        <div><label className={labelCls}>Assunto do email</label>
                          <input type="text" value={actionConfig.subject || ""} onChange={(e) => setActionConfig({ ...actionConfig, subject: e.target.value })} placeholder="Parabéns!" className={inputCls} />
                        </div>
                        <div><label className={labelCls}>Conteúdo do email</label>
                          <EmailEditor content={actionConfig.body || ""} onChange={(html) => setActionConfig({ ...actionConfig, body: html })} />
                        </div>
                        <p className="text-[10px] text-gray-500">{`Variáveis: {nome} {curso} {modulo}`}</p>
                      </div>
                    )}
                    {actionType === "SEND_PUSH" && (
                      <div className="space-y-4">
                        <div><label className={labelCls}>Título da notificação</label>
                          <input type="text" maxLength={60} value={actionConfig.pushTitle || ""} onChange={(e) => setActionConfig({ ...actionConfig, pushTitle: e.target.value })} placeholder="Novidade!" className={inputCls} />
                          <p className="text-[10px] text-gray-500 mt-1">{(actionConfig.pushTitle || "").length}/60</p>
                        </div>
                        <div><label className={labelCls}>Mensagem</label>
                          <textarea maxLength={200} value={actionConfig.pushBody || ""} onChange={(e) => setActionConfig({ ...actionConfig, pushBody: e.target.value })} placeholder="Olá!" rows={3} className={`${selectCls} resize-y`} />
                          <p className="text-[10px] text-gray-500 mt-1">{(actionConfig.pushBody || "").length}/200</p>
                        </div>
                        <div><label className={labelCls}>Link ao clicar (opcional)</label>
                          <input type="text" value={actionConfig.pushUrl || ""} onChange={(e) => setActionConfig({ ...actionConfig, pushUrl: e.target.value })} placeholder="/" className={inputCls} />
                        </div>
                        <p className="text-[10px] text-gray-500">{`Variáveis: {nome} {curso} {modulo}`}</p>
                        <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl p-3">
                          <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-2">Preview</p>
                          <div className="bg-white dark:bg-card rounded-lg p-3 space-y-0.5 border border-gray-100 dark:border-white/5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs">🔔</span>
                              <span className="text-[10px] text-gray-400 font-medium">Members Club</span>
                            </div>
                            <p className="text-sm text-gray-900 dark:text-white font-medium truncate">{actionConfig.pushTitle || "Título"}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{actionConfig.pushBody || "Mensagem..."}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {actionType === "ENROLL_COURSE" && (
                      <div className="mb-4"><label className={labelCls}>Curso destino</label>
                        <CustomSelect value={actionConfig.courseId || ""} onChange={(v) => setActionConfig({ ...actionConfig, courseId: v })} options={[{ value: "", label: "Selecione..." }, ...courses.filter((c) => c.id !== courseId).map((c) => ({ value: c.id, label: c.title }))]} />
                      </div>
                    )}
                    {actionType === "ADD_TAG" && (
                      <div className="space-y-4">
                        <div><label className={labelCls}>Nome da tag</label>
                          <input type="text" value={actionConfig.tagName || ""} onChange={(e) => setActionConfig({ ...actionConfig, tagName: e.target.value })} placeholder="Ex: VIP, Engajado..." className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}>Cor</label>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {["#3b82f6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#f97316", "#14b8a6", "#6366f1"].map((c) => (
                              <button key={c} type="button" onClick={() => setActionConfig({ ...actionConfig, tagColor: c })} className="w-6 h-6 rounded-full border-2 transition" style={{ backgroundColor: c, borderColor: (actionConfig.tagColor || "#3b82f6") === c ? "white" : "transparent", boxShadow: (actionConfig.tagColor || "#3b82f6") === c ? `0 0 0 2px ${c}` : "none" }} />
                            ))}
                          </div>
                        </div>
                        {tags.length > 0 && (
                          <div>
                            <label className={labelCls}>Ou selecione uma existente</label>
                            <CustomSelect value="" onChange={(v) => { const t = tags.find((tg) => tg.id === v); if (t) setActionConfig({ ...actionConfig, tagName: t.name, tagColor: t.color }); }} options={[{ value: "", label: "Usar tag existente..." }, ...tags.map((t) => ({ value: t.id, label: t.name }))]} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        .animate-slideIn { animation: slideIn 0.2s ease-out; }
      `}</style>
    </div>
  );
}

function MobileFlowEditor({
  name, setName, active, setActive, courseId, setCourseId, courses, tags,
  triggerType, setTriggerType, triggerConfig, setTriggerConfig,
  actionType, setActionType, actionConfig, setActionConfig,
  saving, error, onSave, onBack, selectedCourse,
  delayValue, setDelayValue, delayUnit, setDelayUnit,
}: {
  name: string; setName: (v: string) => void;
  active: boolean; setActive: (v: boolean) => void;
  courseId: string; setCourseId: (v: string) => void;
  courses: CourseOption[];
  tags: TagOption[];
  triggerType: string; setTriggerType: (v: string) => void;
  triggerConfig: Record<string, string>; setTriggerConfig: (v: Record<string, string>) => void;
  actionType: string; setActionType: (v: string) => void;
  actionConfig: Record<string, string>; setActionConfig: (v: Record<string, string>) => void;
  saving: boolean; error: string;
  onSave: () => void; onBack: () => void;
  selectedCourse: CourseOption | null;
  delayValue: string; setDelayValue: (v: string) => void;
  delayUnit: string; setDelayUnit: (v: string) => void;
}) {
  const selectCls = "w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary/50 transition-colors";
  const labelCls = "block text-xs font-medium text-gray-400 mb-1.5";
  const inputCls = selectCls;

  const allLessons = selectedCourse?.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleTitle: m.title }))) || [];
  const validActions = getValidActions(triggerType);

  return (
    <div className="fixed inset-0 z-[60] bg-white dark:bg-gray-950 overflow-y-auto">
      <div className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-white/10 px-4 py-3 flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>Voltar
        </button>
        <button type="button" onClick={onSave} disabled={saving} className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-lg disabled:opacity-40 transition">{saving ? "..." : "Salvar"}</button>
      </div>
      <div className="p-4 space-y-6 pb-24">
        {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
        <div><label className={labelCls}>Nome</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da automação" className={selectCls} /></div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setActive(!active)} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full font-medium transition ${active ? "bg-emerald-500/15 text-emerald-400" : "bg-gray-500/15 text-gray-400"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-400" : "bg-gray-500"}`} />{active ? "Ativo" : "Inativo"}
          </button>
        </div>

        {/* Curso */}
        <div><label className={labelCls}>Curso</label>
          <CustomSelect value={courseId} onChange={(v) => { setCourseId(v); setTriggerConfig({}); setActionConfig({}); }} options={[{ value: "", label: GLOBAL_TRIGGERS.includes(triggerType) ? "Todos os cursos" : "Selecione um curso..." }, ...courses.map((c) => ({ value: c.id, label: c.title }))]} />
        </div>

        {/* Trigger */}
        <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-primary/10"><span className="text-[10px] uppercase tracking-widest font-semibold text-primary">Quando</span></div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(TRIGGER_META).map(([key, m]) => (
                <button key={key} type="button" onClick={() => { setTriggerType(key); setTriggerConfig({}); }} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-colors ${triggerType === key ? "border-primary bg-primary/5 dark:bg-primary/10" : "bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-primary/30"}`}>
                  <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={m.icon} /></svg>
                  <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300">{m.short}</span>
                  {m.behavioral && <span className="text-[8px] px-1.5 py-px rounded bg-amber-500/15 text-amber-500 dark:text-amber-400 font-medium">Cron</span>}
                </button>
              ))}
            </div>
            {triggerType === "LESSON_COMPLETED" && selectedCourse && (
              <div><label className={labelCls}>Aula</label><CustomSelect value={triggerConfig.lessonId || ""} onChange={(v) => setTriggerConfig({ ...triggerConfig, lessonId: v })} options={[{ value: "", label: "Qualquer aula" }, ...allLessons.map((l) => ({ value: l.id, label: `${l.moduleTitle} → ${l.title}` }))]} /></div>
            )}
            {triggerType === "MODULE_COMPLETED" && selectedCourse && (
              <div><label className={labelCls}>Módulo</label><CustomSelect value={triggerConfig.moduleId || ""} onChange={(v) => setTriggerConfig({ ...triggerConfig, moduleId: v })} options={[{ value: "", label: "Qualquer módulo" }, ...selectedCourse.modules.map((m) => ({ value: m.id, label: m.title }))]} /></div>
            )}
            {triggerType === "STUDENT_INACTIVE" && <div><label className={labelCls}>Dias de inatividade</label><input type="number" min={1} value={triggerConfig.inactiveDays || "7"} onChange={(e) => setTriggerConfig({ ...triggerConfig, inactiveDays: e.target.value })} className={inputCls} /></div>}
            {triggerType === "STUDENT_NEVER_ACCESSED" && <div><label className={labelCls}>Dias após matrícula</label><input type="number" min={1} value={triggerConfig.afterDays || "3"} onChange={(e) => setTriggerConfig({ ...triggerConfig, afterDays: e.target.value })} className={inputCls} /></div>}
            {triggerType === "PROGRESS_BELOW" && <div className="space-y-3"><div><label className={labelCls}>Abaixo de (%)</label><input type="number" min={1} max={99} value={triggerConfig.progressPercent || "25"} onChange={(e) => setTriggerConfig({ ...triggerConfig, progressPercent: e.target.value })} className={inputCls} /></div><div><label className={labelCls}>Após dias</label><input type="number" min={1} value={triggerConfig.afterDays || "14"} onChange={(e) => setTriggerConfig({ ...triggerConfig, afterDays: e.target.value })} className={inputCls} /></div></div>}
            {triggerType === "PROGRESS_ABOVE" && <div><label className={labelCls}>Acima de (%)</label><input type="number" min={1} max={100} value={triggerConfig.progressPercent || "50"} onChange={(e) => setTriggerConfig({ ...triggerConfig, progressPercent: e.target.value })} className={inputCls} /></div>}
            {triggerType === "MODULE_NOT_STARTED" && selectedCourse && <div className="space-y-3"><div><label className={labelCls}>Módulo</label><CustomSelect value={triggerConfig.moduleId || ""} onChange={(v) => setTriggerConfig({ ...triggerConfig, moduleId: v })} options={[{ value: "", label: "Selecione..." }, ...selectedCourse.modules.map((m) => ({ value: m.id, label: m.title }))]} /></div><div><label className={labelCls}>Após dias</label><input type="number" min={1} value={triggerConfig.afterDays || "7"} onChange={(e) => setTriggerConfig({ ...triggerConfig, afterDays: e.target.value })} className={inputCls} /></div></div>}
            {triggerType === "HAS_TAG" && <div><label className={labelCls}>Tag</label><CustomSelect value={triggerConfig.tagId || ""} onChange={(v) => setTriggerConfig({ ...triggerConfig, tagId: v })} options={[{ value: "", label: "Selecione uma tag..." }, ...tags.map((t) => ({ value: t.id, label: `${t.name} (${t.studentCount} alunos)` }))]} /></div>}
            {EVENT_TRIGGERS.includes(triggerType) && <div className="mt-3 pt-3 border-t border-gray-200 dark:border-white/5"><label className={labelCls}>Atraso na execução (opcional)</label><div className="flex gap-2"><input type="number" min={0} value={delayValue} onChange={(e) => setDelayValue(e.target.value)} placeholder="0" className={`${inputCls} w-20`} /><CustomSelect value={delayUnit} onChange={setDelayUnit} className="flex-1" options={[{ value: "minutes", label: "Minutos" }, { value: "hours", label: "Horas" }, { value: "days", label: "Dias" }]} /></div><p className="text-[10px] text-gray-500 mt-1.5">{delayValue && Number(delayValue) > 0 ? `Executa ${delayValue} ${delayUnit === "minutes" ? "minuto(s)" : delayUnit === "hours" ? "hora(s)" : "dia(s)"} após o gatilho` : "Sem atraso"}</p></div>}
          </div>
        </div>

        <div className="flex justify-center"><div className="flex flex-col items-center"><div className="w-0.5 h-6 bg-gray-300 dark:bg-gray-700" /><div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[8px] border-t-gray-300 dark:border-t-gray-700" /></div></div>

        {/* Action */}
        <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-emerald-600/10"><span className="text-[10px] uppercase tracking-widest font-semibold text-emerald-400">Fazer</span></div>
          <div className="p-4 space-y-3">
            {!triggerType ? <p className="text-xs text-gray-500">Selecione o gatilho primeiro</p> : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {validActions.map((key) => { const m = ACTION_META[key]; if (!m) return null; return (
                    <button key={key} type="button" onClick={() => { setActionType(key); setActionConfig({}); }} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-colors ${actionType === key ? "border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10" : "bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-emerald-500/30"}`}>
                      <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={m.icon} /></svg>
                      <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300">{m.short}</span>
                    </button>
                  ); })}
                </div>
                {actionType === "UNLOCK_MODULE" && selectedCourse && (() => { const tgt = actionConfig.moduleId ? selectedCourse.modules.find((m) => m.id === actionConfig.moduleId) : null; return <div className="mb-4"><label className={labelCls}>Módulo para liberar</label><CustomSelect value={actionConfig.moduleId || ""} onChange={(v) => setActionConfig({ ...actionConfig, moduleId: v })} options={[{ value: "", label: "Selecione..." }, ...selectedCourse.modules.filter((m) => m.id !== triggerConfig.moduleId).map((m) => ({ value: m.id, label: m.title }))]} />{tgt && tgt.daysToRelease > 0 && <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-300 mt-3">Este módulo tem liberação por tempo ({tgt.daysToRelease} dias). A automação vai sobrescrever — ficará bloqueado até o gatilho.</div>}</div>; })()}
                {actionType === "SEND_EMAIL" && <div className="space-y-4"><div><label className={labelCls}>Assunto</label><input type="text" value={actionConfig.subject || ""} onChange={(e) => setActionConfig({ ...actionConfig, subject: e.target.value })} placeholder="Parabéns!" className={selectCls} /></div><div><label className={labelCls}>Conteúdo do email</label><EmailEditor content={actionConfig.body || ""} onChange={(html) => setActionConfig({ ...actionConfig, body: html })} /></div><p className="text-[10px] text-gray-500">{`Variáveis: {nome} {curso} {modulo}`}</p></div>}
                {actionType === "SEND_PUSH" && <div className="space-y-4"><div><label className={labelCls}>Título</label><input type="text" maxLength={60} value={actionConfig.pushTitle || ""} onChange={(e) => setActionConfig({ ...actionConfig, pushTitle: e.target.value })} placeholder="Novidade!" className={selectCls} /><p className="text-[10px] text-gray-500 mt-1">{(actionConfig.pushTitle || "").length}/60</p></div><div><label className={labelCls}>Mensagem</label><textarea maxLength={200} value={actionConfig.pushBody || ""} onChange={(e) => setActionConfig({ ...actionConfig, pushBody: e.target.value })} placeholder="Olá!" rows={3} className={`${selectCls} resize-y`} /><p className="text-[10px] text-gray-500 mt-1">{(actionConfig.pushBody || "").length}/200</p></div><div><label className={labelCls}>Link (opcional)</label><input type="text" value={actionConfig.pushUrl || ""} onChange={(e) => setActionConfig({ ...actionConfig, pushUrl: e.target.value })} placeholder="/" className={selectCls} /></div><p className="text-[10px] text-gray-500">{`Variáveis: {nome} {curso} {modulo}`}</p><div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl p-3"><p className="text-[9px] uppercase tracking-wider text-gray-500 mb-2">Preview</p><div className="bg-white dark:bg-card rounded-lg p-3 space-y-0.5 border border-gray-100 dark:border-white/5"><div className="flex items-center gap-1.5"><span className="text-xs">🔔</span><span className="text-[10px] text-gray-400 font-medium">Members Club</span></div><p className="text-sm text-gray-900 dark:text-white font-medium truncate">{actionConfig.pushTitle || "Título"}</p><p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{actionConfig.pushBody || "Mensagem..."}</p></div></div></div>}
                {actionType === "ENROLL_COURSE" && <div className="mb-4"><label className={labelCls}>Curso destino</label><CustomSelect value={actionConfig.courseId || ""} onChange={(v) => setActionConfig({ ...actionConfig, courseId: v })} options={[{ value: "", label: "Selecione..." }, ...courses.filter((c) => c.id !== courseId).map((c) => ({ value: c.id, label: c.title }))]} /></div>}
                {actionType === "ADD_TAG" && <div className="space-y-4"><div><label className={labelCls}>Nome da tag</label><input type="text" value={actionConfig.tagName || ""} onChange={(e) => setActionConfig({ ...actionConfig, tagName: e.target.value })} placeholder="Ex: VIP" className={selectCls} /></div><div><label className={labelCls}>Cor</label><div className="flex items-center gap-1.5 flex-wrap">{["#3b82f6","#06b6d4","#10b981","#f59e0b","#ef4444","#ec4899","#8b5cf6","#f97316","#14b8a6","#6366f1"].map((c) => <button key={c} type="button" onClick={() => setActionConfig({ ...actionConfig, tagColor: c })} className="w-6 h-6 rounded-full border-2 transition" style={{ backgroundColor: c, borderColor: (actionConfig.tagColor || "#3b82f6") === c ? "white" : "transparent" }} />)}</div></div>{tags.length > 0 && <div><label className={labelCls}>Ou existente</label><CustomSelect value="" onChange={(v) => { const t = tags.find((tg) => tg.id === v); if (t) setActionConfig({ ...actionConfig, tagName: t.name, tagColor: t.color }); }} options={[{ value: "", label: "Usar tag existente..." }, ...tags.map((t) => ({ value: t.id, label: t.name }))]} /></div>}</div>}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useConfirm } from "@/hooks/use-confirm";
import { HelpTooltip } from "@/components/help-tooltip";
import { AutomationItem, CourseOption, TagOption, TemplateData } from "./_types";
import { TRIGGER_META, ACTION_META } from "./_lib/meta";
import { formatDelay, getTriggerDetail, getActionDetail } from "./_lib/helpers";
import { NewAutomationModal } from "./_components/new-automation-modal";
import { CardMenu } from "./_components/card-menu";
import { FlowEditor } from "./_components/flow-editor";

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

"use client";

import dynamic from "next/dynamic";
import { CustomSelect } from "@/components/custom-select";
import { CourseOption, TagOption } from "../_types";
import { TRIGGER_META, ACTION_META, GLOBAL_TRIGGERS, EVENT_TRIGGERS } from "../_lib/meta";
import { getValidActions } from "../_lib/helpers";

const EmailEditor = dynamic(() => import("@/components/email-editor"), {
  ssr: false,
  loading: () => <div className="h-[200px] bg-gray-900/50 border border-white/10 rounded-lg animate-pulse" />,
});

export function MobileFlowEditor({
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
            {triggerType === "POINTS_REACHED" && <div><label className={labelCls}>Mínimo de pontos</label><input type="number" min={1} placeholder="Ex: 500" value={triggerConfig.minPoints || ""} onChange={(e) => setTriggerConfig({ ...triggerConfig, minPoints: e.target.value })} className={inputCls} /><p className="text-[10px] text-gray-500 mt-1">Quando o aluno atingir essa pontuação, a ação é executada. Considera pontos totais do aluno em qualquer área.</p></div>}
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

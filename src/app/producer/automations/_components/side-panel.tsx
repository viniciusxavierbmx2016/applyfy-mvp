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

export function SidePanel({
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
                {triggerType === "POINTS_REACHED" && (
                  <div className="mb-4">
                    <label className={labelCls}>Mínimo de pontos</label>
                    <input
                      type="number"
                      min={1}
                      placeholder="Ex: 500"
                      value={triggerConfig.minPoints || ""}
                      onChange={(e) => setTriggerConfig({ ...triggerConfig, minPoints: e.target.value })}
                      className={inputCls}
                    />
                    <p className="text-[10px] text-gray-500 mt-1">
                      Quando o aluno atingir essa pontuação, a ação é executada automaticamente. Considera pontos totais do aluno, ganhos em qualquer área.
                    </p>
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

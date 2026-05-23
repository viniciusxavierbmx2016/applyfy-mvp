"use client";

import { useState } from "react";
import { TemplateData } from "../_types";
import { TEMPLATES } from "../_data/templates";
import { TRIGGER_META } from "../_lib/meta";

export function NewAutomationModal({ onClose, onScratch, onTemplate }: { onClose: () => void; onScratch: () => void; onTemplate: (t: TemplateData) => void }) {
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

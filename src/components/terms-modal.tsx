"use client";

import { useState } from "react";

interface TermsModalProps {
  courseId: string;
  termsContent?: string | null;
  termsFileUrl?: string | null;
  onAccepted: () => void;
}

export function TermsModal({ courseId, termsContent, termsFileUrl, onAccepted }: TermsModalProps) {
  const [checked, setChecked] = useState(false);
  const [accepting, setAccepting] = useState(false);

  async function handleAccept() {
    if (!checked) return;
    setAccepting(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/accept-terms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        onAccepted();
      }
    } catch {
      // retry on next click
    } finally {
      setAccepting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-white/10 rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl">
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Termos de uso
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Leia e aceite os termos antes de acessar o curso
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-4 min-h-0 space-y-3">
          {termsFileUrl && (
            <a
              href={termsFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900/80 transition-colors"
            >
              <svg className="w-8 h-8 text-red-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Termos de uso em PDF</p>
                <p className="text-xs text-blue-500">Clique para abrir</p>
              </div>
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </a>
          )}
          {termsContent && (
            <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-white/10 rounded-lg p-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              {termsContent}
            </div>
          )}
        </div>

        <div className="px-6 pb-6 pt-2 border-t border-gray-200 dark:border-white/5">
          <label className="flex items-start gap-3 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300 leading-snug">
              Concordo que li e aceito os seguintes termos: Termos de Uso, Política de Privacidade e Proteção de Dados
            </span>
          </label>

          <button
            onClick={handleAccept}
            disabled={!checked || accepting}
            className="w-full py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-500 text-white"
          >
            {accepting ? "Aceitando..." : "Aceitar e continuar"}
          </button>
        </div>
      </div>
    </div>
  );
}

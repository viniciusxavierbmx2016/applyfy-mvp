"use client";

import { useState } from "react";

interface TermsModalProps {
  courseId: string;
  termsContent: string;
  onAccepted: () => void;
}

export function TermsModal({ courseId, termsContent, onAccepted }: TermsModalProps) {
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

        <div className="flex-1 overflow-y-auto px-6 pb-4 min-h-0">
          <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-white/10 rounded-lg p-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
            {termsContent}
          </div>
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

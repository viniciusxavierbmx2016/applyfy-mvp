"use client";

import { useEffect, useState } from "react";

const REASONS = [
  { key: "content_confusing", label: "Conteúdo confuso / difícil de entender", icon: "📚" },
  { key: "audio_video_bad", label: "Problema de áudio ou vídeo", icon: "🎥" },
  { key: "too_long", label: "Muito longo / cansativo", icon: "⏱️" },
  { key: "outdated", label: "Conteúdo desatualizado", icon: "🔄" },
  { key: "not_helpful", label: "Não me ajudou", icon: "❌" },
  { key: "other", label: "Outro motivo", icon: "✏️" },
];

interface Props {
  onSubmit: (reason: string, comment?: string) => void;
  onClose: () => void;
}

export function DislikeFeedbackModal({ onSubmit, onClose }: Props) {
  const [reason, setReason] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleSubmit() {
    if (!reason) return;
    onSubmit(reason, comment.trim() || undefined);
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center animate-in fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-gray-900 dark:bg-card rounded-2xl p-6 max-w-sm mx-4 shadow-2xl border border-white/10 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white">O que poderia melhorar?</h2>
        <p className="text-sm text-gray-400 mt-1">
          Seu feedback é anônimo para outros alunos e ajuda a melhorar a aula.
        </p>

        <div className="mt-4 space-y-2">
          {REASONS.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setReason(r.key)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left text-sm transition-colors ${
                reason === r.key
                  ? "bg-blue-600/20 border-blue-500 text-white"
                  : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
              }`}
            >
              <span className="text-base">{r.icon}</span>
              <span>{r.label}</span>
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={200}
          rows={3}
          placeholder="Comentário opcional (max 200 caracteres)"
          className="mt-3 w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
        />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!reason}
          className="mt-4 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Enviar feedback
        </button>

        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full text-center text-sm text-gray-400 hover:text-white transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

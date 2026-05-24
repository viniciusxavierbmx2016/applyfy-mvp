"use client";

import type { LiveItem } from "../_types";

interface ConfirmModalProps {
  action: { type: "start" | "end" | "delete"; live: LiveItem };
  onCancel: () => void;
  onDelete: (live: LiveItem) => void;
  onStatusChange: (live: LiveItem, newStatus: string) => void;
}

export function ConfirmModal({
  action,
  onCancel,
  onDelete,
  onStatusChange,
}: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative bg-white dark:bg-gray-950 border border-gray-200 dark:border-white/10 rounded-xl w-full max-w-sm p-6">
        <h3 className="text-lg font-bold text-white mb-2">
          {action.type === "start"
            ? "Iniciar Live?"
            : action.type === "end"
              ? "Encerrar Live?"
              : "Excluir Live?"}
        </h3>
        <p className="text-gray-400 text-sm mb-4">
          {action.type === "start"
            ? `"${action.live.title}" será marcada como ao vivo. O chat será liberado para os alunos.`
            : action.type === "end"
              ? `"${action.live.title}" será encerrada. O chat será desabilitado.`
              : `"${action.live.title}" será excluída permanentemente com todas as mensagens.`}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (action.type === "delete") {
                onDelete(action.live);
              } else {
                onStatusChange(
                  action.live,
                  action.type === "start" ? "LIVE" : "ENDED"
                );
              }
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              action.type === "delete"
                ? "bg-red-600 hover:bg-red-700 text-white"
                : action.type === "start"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-gray-600 hover:bg-gray-700 text-white"
            }`}
          >
            {action.type === "start"
              ? "Iniciar"
              : action.type === "end"
                ? "Encerrar"
                : "Excluir"}
          </button>
        </div>
      </div>
    </div>
  );
}

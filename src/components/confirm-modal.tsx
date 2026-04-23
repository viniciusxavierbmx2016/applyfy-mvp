"use client";

import { useEffect, useRef } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  loading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "info",
  loading = false,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    cancelRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const iconColors = {
    danger: "bg-red-900/30 text-red-400",
    warning: "bg-amber-900/30 text-amber-400",
    info: "bg-indigo-900/30 text-indigo-400",
  };

  const btnColors = {
    danger: "bg-red-600 hover:bg-red-500",
    warning: "bg-amber-600 hover:bg-amber-500",
    info: "bg-indigo-600 hover:bg-indigo-500",
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center animate-[fadeIn_200ms_ease-out]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="bg-white dark:bg-[#141416] border border-gray-200 dark:border-[#28282e] rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl animate-[scaleIn_200ms_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${iconColors[variant]}`}>
            {variant === "danger" ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            ) : variant === "warning" ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center mt-4">
          {title}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2">
          {message}
        </p>
        <div className="flex gap-3 mt-6">
          <button
            ref={cancelRef}
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-[#1d1d21] dark:hover:bg-[#28282e] text-gray-700 dark:text-gray-300 py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-[#28282e] transition-colors duration-200 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 text-white py-2.5 rounded-xl text-sm font-medium transition-colors duration-200 disabled:opacity-50 flex items-center justify-center gap-2 ${btnColors[variant]}`}
          >
            {loading && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

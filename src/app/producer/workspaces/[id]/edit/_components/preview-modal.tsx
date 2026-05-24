"use client";

import { PreviewIframe } from "./preview-iframe";

interface PreviewModalProps {
  slug: string;
  reloadKey: number;
  onClose: () => void;
}

export function PreviewModal({ slug, reloadKey, onClose }: PreviewModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "85vh", height: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gray-950 flex-shrink-0">
          <p className="text-sm font-semibold text-white">
            Pré-visualização da tela de login
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
            aria-label="Fechar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden p-4 bg-gray-900">
          <div className="h-full w-full rounded-xl overflow-hidden border border-white/10 flex flex-col bg-gray-950">
            <div className="h-9 px-3 bg-gray-800 flex items-center gap-2 flex-shrink-0">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#ff5f57" }} />
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#ffbd2e" }} />
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#28c840" }} />
              </div>
              <div className="flex-1 mx-2 h-6 rounded-full bg-gray-700 flex items-center px-3 overflow-hidden">
                <span className="text-xs text-gray-400 truncate">
                  applyfy.com/w/{slug}/login
                </span>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <PreviewIframe slug={slug} reloadKey={reloadKey} />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-white/10 bg-gray-950 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-sm font-medium bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg"
          >
            Fechar
          </button>
          {slug && (
            <a
              href={`/w/${slug}/login`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium bg-primary hover:bg-primary-hover text-white rounded-lg"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Abrir em nova aba
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

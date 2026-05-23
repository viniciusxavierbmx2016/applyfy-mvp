"use client";

import { useRef, useEffect } from "react";

export function CardMenu({ onEdit, onDuplicate, onDelete, onClose }: { onEdit: () => void; onDuplicate: () => void; onDelete: () => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose]);
  const item = "w-full text-left px-3 py-2 text-sm hover:bg-white/5 transition rounded-lg flex items-center gap-2";
  return (
    <div ref={ref} className="absolute right-0 top-7 z-20 w-40 bg-white dark:bg-gray-950 border border-gray-200 dark:border-white/10 rounded-xl shadow-xl p-1" onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={onEdit} className={`${item} text-gray-700 dark:text-gray-300`}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>Editar</button>
      <button type="button" onClick={onDuplicate} className={`${item} text-gray-700 dark:text-gray-300`}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Duplicar</button>
      <div className="h-px bg-gray-200 dark:bg-white/10 my-1" />
      <button type="button" onClick={onDelete} className={`${item} text-red-400`}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>Excluir</button>
    </div>
  );
}

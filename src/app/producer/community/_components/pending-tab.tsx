"use client";

import { Avatar } from "@/components/ui/avatar";
import { formatRelativeTime } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/sanitize-html";
import type { PendingItem } from "../_types";

interface PendingTabProps {
  selected: Set<string>;
  pendingLoading: boolean;
  pendingItems: PendingItem[];
  onBulkAction: (action: "approve" | "reject") => void;
  onToggleSelectAll: () => void;
  onToggleSelected: (id: string) => void;
  onModerate: (item: PendingItem, action: "approve" | "reject") => void;
}

export function PendingTab({
  selected,
  pendingLoading,
  pendingItems,
  onBulkAction,
  onToggleSelectAll,
  onToggleSelected,
  onModerate,
}: PendingTabProps) {
  return (
    <>
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
          <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">
            {selected.size} selecionado(s)
          </span>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => onBulkAction("approve")}
              className="px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
            >
              Aprovar
            </button>
            <button
              onClick={() => onBulkAction("reject")}
              className="px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
            >
              Rejeitar
            </button>
          </div>
        </div>
      )}

      {pendingLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : pendingItems.length === 0 ? (
        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl p-10 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-green-500/10 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">Nenhum item pendente de moderação.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.size === pendingItems.length}
                onChange={onToggleSelectAll}
                className="accent-primary rounded"
              />
              Selecionar todos
            </label>
          </div>

          {pendingItems.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-white/5 border border-amber-400/30 rounded-xl p-4 flex items-start gap-3"
            >
              <input
                type="checkbox"
                checked={selected.has(item.id)}
                onChange={() => onToggleSelected(item.id)}
                className="mt-1 accent-primary rounded"
              />
              <Avatar
                src={item.user.avatarUrl}
                name={item.user.name}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {item.user.name}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    item.type === "community_post"
                      ? "bg-primary/20 text-primary"
                      : "bg-purple-500/20 text-purple-400"
                  }`}>
                    {item.type === "community_post" ? "Post" : "Comentário"}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {item.course.title}
                    {item.group ? ` · ${item.group.name}` : ""}
                  </span>
                </div>
                {item.post && (
                  <p className="text-xs text-gray-500 mb-1 truncate">
                    Em resposta a: {item.post.content.replace(/<[^>]*>/g, "").slice(0, 80)}
                  </p>
                )}
                <div
                  className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed break-words line-clamp-3"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.content) }}
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  {formatRelativeTime(new Date(item.createdAt))}
                </p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => onModerate(item, "approve")}
                  title="Aprovar"
                  className="p-1.5 text-gray-500 hover:text-green-500 hover:bg-green-500/10 rounded transition"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button
                  onClick={() => onModerate(item, "reject")}
                  title="Rejeitar"
                  className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded transition"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

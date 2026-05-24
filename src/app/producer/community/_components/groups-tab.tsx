"use client";

import { useEffect, useState, useRef } from "react";
import type { CommunityGroup } from "../_types";

export function GroupsTab({
  courseId,
  groups,
  loading,
  onReload,
  onDelete,
  onEdit,
  onCreate,
  showToast,
}: {
  courseId: string;
  groups: CommunityGroup[];
  loading: boolean;
  onReload: () => void;
  onDelete: (g: CommunityGroup) => void;
  onEdit: (g: CommunityGroup) => void;
  onCreate: () => void;
  showToast: (msg: string) => void;
}) {
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [localGroups, setLocalGroups] = useState(groups);

  useEffect(() => {
    setLocalGroups(groups);
  }, [groups]);

  if (!courseId) {
    return (
      <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl p-10 text-center">
        <p className="text-gray-500 text-sm">
          Selecione um curso para gerenciar os grupos da comunidade.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse"
          />
        ))}
      </div>
    );
  }

  async function handleDrop() {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const items = [...localGroups];
    const dragged = items.splice(dragItem.current, 1)[0];
    items.splice(dragOverItem.current, 0, dragged);
    dragItem.current = null;
    dragOverItem.current = null;

    const reordered = items.map((g, i) => ({ ...g, order: i }));
    setLocalGroups(reordered);

    try {
      await fetch("/api/producer/community/groups/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: reordered.map((g) => ({ id: g.id, order: g.order })),
        }),
      });
      onReload();
    } catch {
      showToast("Erro ao reordenar");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={onCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-xl transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo grupo
        </button>
      </div>

      {localGroups.length === 0 ? (
        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl p-10 text-center">
          <p className="text-gray-500 text-sm">Nenhum grupo criado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {localGroups.map((g, idx) => (
            <div
              key={g.id}
              draggable
              onDragStart={() => {
                dragItem.current = idx;
              }}
              onDragEnter={() => {
                dragOverItem.current = idx;
              }}
              onDragEnd={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl p-4 flex items-start gap-3 cursor-grab active:cursor-grabbing"
            >
              <span className="text-gray-400 dark:text-gray-500 mt-1 select-none text-lg leading-none">
                ⠿
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {g.name}
                  </h3>
                  {g.isDefault && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-medium">
                      Padrão
                    </span>
                  )}
                  {g.permission === "READ_ONLY" && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 font-medium">
                      Somente leitura
                    </span>
                  )}
                </div>
                {g.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{g.description}</p>
                )}
                <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                  <span>
                    {g._count.posts} {g._count.posts === 1 ? "post" : "posts"}
                  </span>
                  <span>
                    {g.permission === "READ_WRITE"
                      ? "Leitura e escrita"
                      : "Somente leitura"}
                  </span>
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => onEdit(g)}
                  title="Editar"
                  className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-white/5 rounded transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                {!g.isDefault && (
                  <button
                    onClick={() => onDelete(g)}
                    title="Excluir"
                    className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-white/5 rounded transition"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V4a2 2 0 012-2h4a2 2 0 012 2v3" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

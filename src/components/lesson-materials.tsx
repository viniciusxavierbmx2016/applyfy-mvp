"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useConfirm } from "@/hooks/use-confirm";

interface Material {
  id: string;
  name: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  sortOrder: number;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function fileIcon(type: string): { color: string; label: string } {
  if (type === "application/pdf") return { color: "text-red-500 bg-red-50 dark:bg-red-500/10", label: "PDF" };
  if (type.includes("spreadsheet") || type.includes("excel") || type === "text/csv")
    return { color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10", label: "XLS" };
  if (type.includes("word") || type === "application/msword")
    return { color: "text-blue-500 bg-blue-50 dark:bg-blue-500/10", label: "DOC" };
  if (type.includes("presentation") || type.includes("powerpoint"))
    return { color: "text-orange-500 bg-orange-50 dark:bg-orange-500/10", label: "PPT" };
  if (type.startsWith("image/")) return { color: "text-purple-500 bg-purple-50 dark:bg-purple-500/10", label: "IMG" };
  if (type.startsWith("audio/")) return { color: "text-pink-500 bg-pink-50 dark:bg-pink-500/10", label: "MP3" };
  if (type.startsWith("video/")) return { color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10", label: "MP4" };
  if (type.includes("zip") || type.includes("rar")) return { color: "text-yellow-600 bg-yellow-50 dark:bg-yellow-500/10", label: "ZIP" };
  return { color: "text-gray-500 bg-gray-50 dark:bg-gray-500/10", label: "FILE" };
}

export function LessonMaterials({ lessonId }: { lessonId: string }) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  const fetchMaterials = useCallback(async () => {
    try {
      const res = await fetch(`/api/producer/lessons/${lessonId}/materials`);
      if (res.ok) {
        const data = await res.json();
        setMaterials(data.materials);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  async function uploadFiles(files: FileList | File[]) {
    setUploading(true);
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", file.name.replace(/\.[^.]+$/, ""));
      try {
        const res = await fetch(`/api/producer/lessons/${lessonId}/materials`, {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          setMaterials((prev) => [...prev, data.material]);
        }
      } catch {
        // silent
      }
    }
    setUploading(false);
  }

  async function handleDelete(id: string) {
    if (!(await confirm({ title: "Excluir material", message: "Excluir este material?", variant: "danger", confirmText: "Excluir" }))) return;
    const res = await fetch(`/api/producer/lessons/${lessonId}/materials/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setMaterials((prev) => prev.filter((m) => m.id !== id));
    }
  }

  async function handleRename(id: string) {
    if (!editName.trim()) return;
    const res = await fetch(`/api/producer/lessons/${lessonId}/materials/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    if (res.ok) {
      setMaterials((prev) =>
        prev.map((m) => (m.id === id ? { ...m, name: editName.trim() } : m))
      );
    }
    setEditingId(null);
  }

  async function handleMove(id: string, direction: "up" | "down") {
    const idx = materials.findIndex((m) => m.id === id);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= materials.length) return;

    const updated = [...materials];
    [updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]];
    setMaterials(updated);

    await Promise.all([
      fetch(`/api/producer/lessons/${lessonId}/materials/${updated[idx].id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: idx }),
      }),
      fetch(`/api/producer/lessons/${lessonId}/materials/${updated[swapIdx].id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: swapIdx }),
      }),
    ]);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  }

  if (loading) {
    return (
      <div className="mt-4 space-y-2">
        <div className="h-4 w-40 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        <div className="h-12 bg-gray-100 dark:bg-gray-900 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <div>
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
          Materiais complementares
        </p>
        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          Anexe arquivos que seus alunos podem baixar nesta aula
        </p>
      </div>

      {materials.length > 0 && (
        <ul className="space-y-1.5">
          {materials.map((mat, idx) => {
            const icon = fileIcon(mat.fileType);
            return (
              <li
                key={mat.id}
                className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-lg text-sm"
              >
                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-md text-[10px] font-bold ${icon.color}`}>
                  {icon.label}
                </span>

                <div className="flex-1 min-w-0">
                  {editingId === mat.id ? (
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => handleRename(mat.id)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleRename(mat.id); if (e.key === "Escape") setEditingId(null); }}
                      className="w-full px-2 py-0.5 bg-white dark:bg-gray-800 border border-blue-400 rounded text-sm text-gray-900 dark:text-white focus:outline-none"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white truncate">{mat.name}</p>
                  )}
                  <p className="text-[11px] text-gray-400 truncate">{mat.fileName} · {formatSize(mat.fileSize)}</p>
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
                  {idx > 0 && (
                    <button onClick={() => handleMove(mat.id, "up")} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" title="Mover para cima">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                    </button>
                  )}
                  {idx < materials.length - 1 && (
                    <button onClick={() => handleMove(mat.id, "down")} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" title="Mover para baixo">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                  )}
                  <button
                    onClick={() => { setEditingId(mat.id); setEditName(mat.name); }}
                    className="p-1 text-gray-400 hover:text-blue-500"
                    title="Renomear"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button
                    onClick={() => handleDelete(mat.id)}
                    className="p-1 text-gray-400 hover:text-red-500"
                    title="Excluir"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-1.5 py-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
          dragOver
            ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
            : "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"
        }`}
      >
        {uploading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            Enviando...
          </div>
        ) : (
          <>
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {materials.length === 0
                ? "Nenhum material anexado. Arraste arquivos ou clique para anexar."
                : "Arraste ou clique para anexar mais arquivos"}
            </p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              uploadFiles(e.target.files);
              e.target.value = "";
            }
          }}
        />
      </div>
      <ConfirmDialog />
    </div>
  );
}

"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";

interface ImagePosition {
  x: number;
  y: number;
}

interface ThumbnailUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  helperText?: string;
  uploadPath?: string;
  aspectClass?: string;
  position?: ImagePosition;
  onPositionChange?: (pos: ImagePosition) => void;
  mode?: "view" | "reposition";
  onModeChange?: (mode: "view" | "reposition") => void;
}

export function ThumbnailUpload({
  value,
  onChange,
  label = "Thumbnail",
  helperText = "Tamanho ideal: 1280x720px (16:9). PNG, JPG ou WebP, máx. 5MB.",
  uploadPath,
  aspectClass = "aspect-video",
  position,
  onPositionChange,
  mode = "view",
  onModeChange,
}: ThumbnailUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startRef = useRef({ x: 0, y: 0 });
  const startPosRef = useRef({ x: 50, y: 50 });
  const [savedPos, setSavedPos] = useState<ImagePosition | null>(null);

  const pos = position ?? { x: 50, y: 50 };

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (uploadPath) formData.append("path", uploadPath);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erro ao fazer upload"); return; }
      onChange(data.url);
    } catch {
      setError("Erro ao fazer upload");
    } finally {
      setUploading(false);
    }
  }

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!dragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = ((clientX - startRef.current.x) / rect.width) * -100;
    const deltaY = ((clientY - startRef.current.y) / rect.height) * -100;
    const newX = Math.max(0, Math.min(100, startPosRef.current.x + deltaX));
    const newY = Math.max(0, Math.min(100, startPosRef.current.y + deltaY));
    onPositionChange?.({ x: newX, y: newY });
  }, [onPositionChange]);

  const handleEnd = useCallback(() => {
    dragging.current = false;
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
    window.removeEventListener("touchmove", handleTouchMove);
    window.removeEventListener("touchend", handleTouchEnd);
  }, []);

  function handleMouseMove(e: MouseEvent) { handleMove(e.clientX, e.clientY); }
  function handleMouseUp() { handleEnd(); }
  function handleTouchMove(e: TouchEvent) {
    e.preventDefault();
    const t = e.touches[0];
    handleMove(t.clientX, t.clientY);
  }
  function handleTouchEnd() { handleEnd(); }

  function handleDragStart(clientX: number, clientY: number) {
    if (mode !== "reposition") return;
    dragging.current = true;
    startRef.current = { x: clientX, y: clientY };
    startPosRef.current = { ...pos };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
  }

  function handleSave() {
    setSavedPos(null);
    onModeChange?.("view");
  }

  function handleCancel() {
    if (savedPos) onPositionChange?.(savedPos);
    setSavedPos(null);
    onModeChange?.("view");
  }

  function startReposition() {
    setSavedPos({ ...pos });
    onModeChange?.("reposition");
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </label>

      {value ? (
        <div
          ref={containerRef}
          className={`relative group ${aspectClass} bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border ${mode === "reposition" ? "border-indigo-500 border-2 border-dashed" : "border-gray-300 dark:border-gray-700"}`}
          style={{ cursor: mode === "reposition" ? "grab" : undefined }}
          onMouseDown={mode === "reposition" ? (e) => { e.preventDefault(); handleDragStart(e.clientX, e.clientY); } : undefined}
          onTouchStart={mode === "reposition" ? (e) => { const t = e.touches[0]; handleDragStart(t.clientX, t.clientY); } : undefined}
        >
          <Image
            src={value}
            alt={label}
            fill
            className="object-cover pointer-events-none select-none"
            style={{ objectPosition: `${pos.x}% ${pos.y}%` }}
            draggable={false}
          />

          {mode === "view" && (
            <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {onPositionChange && (
                <button
                  type="button"
                  onClick={startReposition}
                  title="Reposicionar"
                  className="bg-black/60 hover:bg-black/80 text-white rounded-lg p-1.5 transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                onClick={() => onChange(null)}
                title="Remover"
                className="bg-black/60 hover:bg-red-600/80 text-white rounded-lg p-1.5 transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {mode === "reposition" && (
            <>
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-1 rounded-full pointer-events-none">
                Arraste para reposicionar
              </div>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-1.5 rounded-lg font-medium transition"
                >
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-black/60 hover:bg-black/80 text-white text-xs px-4 py-1.5 rounded-lg font-medium transition"
                >
                  Cancelar
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <label className={`relative block ${aspectClass} bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-750 border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-gray-500 dark:hover:border-gray-600 rounded-lg cursor-pointer transition`}>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
            className="sr-only"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
            {uploading ? (
              <>
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
                <span className="text-sm">Enviando...</span>
              </>
            ) : (
              <>
                <svg className="w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium">Clique para enviar</span>
              </>
            )}
          </div>
        </label>
      )}

      <p className="text-xs text-gray-500 mt-2">{helperText}</p>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}

"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";

export interface ImagePosition {
  x: number;
  y: number;
}

interface Props {
  src: string;
  aspectRatio: string;
  currentPosition: ImagePosition;
  onPositionChange: (pos: ImagePosition) => void;
  onSave: (pos: ImagePosition) => void;
  className?: string;
}

export function ImagePositioner({
  src,
  aspectRatio,
  currentPosition,
  onPositionChange,
  onSave,
  className,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startRef = useRef({ x: 0, y: 0 });
  const startPosRef = useRef({ x: 50, y: 50 });
  const savedRef = useRef(currentPosition);

  const handleStart = useCallback(
    (clientX: number, clientY: number) => {
      if (!editing) return;
      setDragging(true);
      startRef.current = { x: clientX, y: clientY };
      startPosRef.current = { x: currentPosition.x, y: currentPosition.y };
    },
    [editing, currentPosition]
  );

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!dragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = ((clientX - startRef.current.x) / rect.width) * -100;
      const deltaY = ((clientY - startRef.current.y) / rect.height) * -100;
      const newX = Math.max(0, Math.min(100, startPosRef.current.x + deltaX));
      const newY = Math.max(0, Math.min(100, startPosRef.current.y + deltaY));
      onPositionChange({ x: Math.round(newX), y: Math.round(newY) });
    },
    [dragging, onPositionChange]
  );

  const handleEnd = useCallback(() => {
    setDragging(false);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  };
  const handleMouseMove = (e: React.MouseEvent) => handleMove(e.clientX, e.clientY);
  const handleMouseUp = () => handleEnd();

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    handleStart(t.clientX, t.clientY);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const t = e.touches[0];
    handleMove(t.clientX, t.clientY);
  };
  const handleTouchEnd = () => handleEnd();

  const startEdit = () => {
    savedRef.current = { ...currentPosition };
    setEditing(true);
  };
  const cancelEdit = () => {
    setEditing(false);
    setDragging(false);
    onPositionChange(savedRef.current);
  };
  const saveEdit = () => {
    setEditing(false);
    setDragging(false);
    onSave(currentPosition);
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-lg ${className || ""} ${
        editing ? "border-2 border-dashed border-blue-500" : "border border-gray-300 dark:border-gray-700"
      }`}
      style={{ aspectRatio }}
      onMouseMove={editing ? handleMouseMove : undefined}
      onMouseUp={editing ? handleMouseUp : undefined}
      onMouseLeave={editing ? handleMouseUp : undefined}
      onTouchMove={editing ? handleTouchMove : undefined}
      onTouchEnd={editing ? handleTouchEnd : undefined}
    >
      <Image
        src={src}
        alt=""
        fill
        sizes="100vw"
        draggable={false}
        className={`object-cover select-none ${
          editing ? (dragging ? "cursor-grabbing" : "cursor-grab") : ""
        }`}
        style={{ objectPosition: `${currentPosition.x}% ${currentPosition.y}%` }}
        onMouseDown={editing ? handleMouseDown : undefined}
        onTouchStart={editing ? handleTouchStart : undefined}
      />

      {editing && (
        <>
          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-center py-2 bg-black/50 backdrop-blur-sm pointer-events-none">
            <span className="text-xs font-medium text-white">
              Arraste para reposicionar
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-center gap-2 py-2.5 bg-black/50 backdrop-blur-sm">
            <button
              type="button"
              onClick={saveEdit}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition"
            >
              Salvar posição
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="px-3 py-1.5 text-xs font-medium text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition"
            >
              Cancelar
            </button>
          </div>
        </>
      )}

      {!editing && (
        <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200">
          <button
            type="button"
            onClick={startEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-lg transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            Reposicionar
          </button>
        </div>
      )}
    </div>
  );
}

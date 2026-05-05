"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { LessonMaterials } from "@/components/lesson-materials";
import { QuizManager } from "@/components/quiz-manager";
import { useConfirm } from "@/hooks/use-confirm";
import { HelpTooltip } from "@/components/help-tooltip";

const RichTextEditor = dynamic(() => import("@/components/rich-text-editor"), {
  ssr: false,
  loading: () => <div className="h-[200px] bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />,
});
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export interface LessonData {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string;
  duration: number | null;
  order: number;
  daysToRelease: number;
}

interface LessonsManagerProps {
  moduleId: string;
  initialLessons: LessonData[];
  onChange: (lessons: LessonData[]) => void;
}

export function LessonsManager({
  moduleId,
  initialLessons,
  onChange,
}: LessonsManagerProps) {
  const [lessons, setLessons] = useState<LessonData[]>(initialLessons);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function syncState(next: LessonData[]) {
    setLessons(next);
    onChange(next);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = lessons.findIndex((l) => l.id === active.id);
    const newIndex = lessons.findIndex((l) => l.id === over.id);
    const reordered = arrayMove(lessons, oldIndex, newIndex);
    syncState(reordered);

    await fetch(`/api/modules/${moduleId}/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonIds: reordered.map((l) => l.id) }),
    });
  }

  async function handleCreate(data: Omit<LessonData, "id" | "order">) {
    const res = await fetch(`/api/modules/${moduleId}/lessons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const payload = await res.json();
      syncState([...lessons, payload.lesson]);
      setCreating(false);
    }
  }

  async function handleUpdate(id: string, data: Partial<LessonData>) {
    const res = await fetch(`/api/lessons/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      syncState(lessons.map((l) => (l.id === id ? { ...l, ...data } : l)));
      setEditingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!(await confirm({ title: "Excluir aula", message: "Excluir esta aula?", variant: "danger", confirmText: "Excluir" }))) return;
    const res = await fetch(`/api/lessons/${id}`, { method: "DELETE" });
    if (res.ok) {
      syncState(lessons.filter((l) => l.id !== id));
    }
  }

  return (
    <div className="space-y-2">
      {lessons.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={lessons.map((l) => l.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {lessons.map((lesson) => (
                <SortableLesson
                  key={lesson.id}
                  lesson={lesson}
                  isEditing={editingId === lesson.id}
                  onStartEdit={() => setEditingId(lesson.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <ConfirmDialog />
      {creating ? (
        <LessonForm
          onSubmit={handleCreate}
          onCancel={() => setCreating(false)}
        />
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-gray-300 dark:border-gray-700 hover:border-gray-500 dark:hover:border-gray-600 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-sm rounded-lg transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Adicionar aula
          <span
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="inline-flex"
          >
            <HelpTooltip text="Cada aula pode ter vídeo (YouTube, Vimeo), texto, materiais em PDF e quiz avaliativo." />
          </span>
        </button>
      )}
    </div>
  );
}

function SortableLesson({
  lesson,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
}: {
  lesson: LessonData;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (id: string, data: Partial<LessonData>) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (isEditing) {
    return (
      <div ref={setNodeRef} style={style}>
        <LessonForm
          initial={lesson}
          onSubmit={(data) => onUpdate(lesson.id, data)}
          onCancel={onCancelEdit}
        >
          <div className="border-t border-gray-200 dark:border-[#1a1e2e] my-6" />
          <div>
            <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Materiais complementares</h5>
            <LessonMaterials lessonId={lesson.id} />
          </div>
          <div className="border-t border-gray-200 dark:border-[#1a1e2e] my-6" />
          <div>
            <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quiz</h5>
            <QuizManager lessonId={lesson.id} />
          </div>
        </LessonForm>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-gray-400 dark:hover:border-gray-700 transition"
    >
      <button
        {...attributes}
        {...listeners}
        className="text-gray-600 hover:text-gray-700 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing touch-none"
        aria-label="Arrastar aula"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="9" cy="6" r="1.5" />
          <circle cx="15" cy="6" r="1.5" />
          <circle cx="9" cy="12" r="1.5" />
          <circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="18" r="1.5" />
          <circle cx="15" cy="18" r="1.5" />
        </svg>
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 dark:text-white font-medium truncate">{lesson.title}</p>
        <p className="text-xs text-gray-500 truncate">{lesson.videoUrl}</p>
      </div>

      {lesson.duration && (
        <span className="text-xs text-gray-500">{lesson.duration}min</span>
      )}

      <button
        onClick={onStartEdit}
        className="p-1.5 text-gray-500 hover:text-blue-400 transition"
        aria-label="Editar aula"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
      <button
        onClick={() => onDelete(lesson.id)}
        className="p-1.5 text-gray-500 hover:text-red-400 transition"
        aria-label="Excluir aula"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}

function LessonForm({
  initial,
  onSubmit,
  onCancel,
  children,
}: {
  initial?: Partial<LessonData>;
  onSubmit: (data: {
    title: string;
    description: string | null;
    videoUrl: string;
    duration: number | null;
    daysToRelease: number;
  }) => void;
  onCancel: () => void;
  children?: React.ReactNode;
}) {
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [videoUrl, setVideoUrl] = useState(initial?.videoUrl || "");
  const [duration, setDuration] = useState<string>(
    initial?.duration ? String(initial.duration) : ""
  );
  const [daysToRelease, setDaysToRelease] = useState<string>(
    String(initial?.daysToRelease ?? 0)
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !videoUrl.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      videoUrl: videoUrl.trim(),
      duration: duration ? Number(duration) : null,
      daysToRelease: Math.max(0, Math.floor(Number(daysToRelease) || 0)),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-white dark:bg-gray-900 border border-blue-500/30 rounded-lg p-4">
      <input
        autoFocus
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título da aula"
        required
        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="url"
        value={videoUrl}
        onChange={(e) => setVideoUrl(e.target.value)}
        placeholder="URL do vídeo (YouTube, Vimeo...)"
        required
        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <RichTextEditor
        value={description}
        onChange={setDescription}
        placeholder="Descrição da aula (opcional)"
        minHeight="120px"
      />
      <input
        type="number"
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
        placeholder="Duração em minutos (opcional)"
        min={0}
        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Liberar após (dias)
        </label>
        <input
          type="number"
          value={daysToRelease}
          onChange={(e) => setDaysToRelease(e.target.value)}
          min={0}
          className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          0 = liberado imediatamente. Ex: 7 = libera 7 dias após a matrícula do aluno.
        </p>
      </div>

      {children}

      <div className="border-t border-gray-200 dark:border-[#1a1e2e] my-6" />
      <div className="flex gap-2">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
        >
          Salvar
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg transition"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

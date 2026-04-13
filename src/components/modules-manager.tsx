"use client";

import { useState } from "react";
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
import { LessonsManager, type LessonData } from "./lessons-manager";

export interface ModuleData {
  id: string;
  title: string;
  order: number;
  lessons: LessonData[];
}

interface ModulesManagerProps {
  courseId: string;
  initialModules: ModuleData[];
}

export function ModulesManager({ courseId, initialModules }: ModulesManagerProps) {
  const [modules, setModules] = useState<ModuleData[]>(initialModules);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = modules.findIndex((m) => m.id === active.id);
    const newIndex = modules.findIndex((m) => m.id === over.id);
    const reordered = arrayMove(modules, oldIndex, newIndex);
    setModules(reordered);

    await fetch(`/api/courses/${courseId}/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleIds: reordered.map((m) => m.id) }),
    });
  }

  async function handleCreate() {
    if (!newTitle.trim()) return;
    const res = await fetch(`/api/courses/${courseId}/modules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    });
    if (res.ok) {
      const data = await res.json();
      setModules([...modules, { ...data.module, lessons: [] }]);
      setNewTitle("");
      setCreating(false);
    }
  }

  async function handleUpdate(id: string, title: string) {
    const res = await fetch(`/api/modules/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (res.ok) {
      setModules((prev) =>
        prev.map((m) => (m.id === id ? { ...m, title } : m))
      );
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este módulo e todas as aulas dentro dele?")) return;
    const res = await fetch(`/api/modules/${id}`, { method: "DELETE" });
    if (res.ok) {
      setModules((prev) => prev.filter((m) => m.id !== id));
    }
  }

  function handleLessonsChange(moduleId: string, lessons: LessonData[]) {
    setModules((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, lessons } : m))
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Módulos & Aulas</h2>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Novo módulo
          </button>
        )}
      </div>

      {creating && (
        <div className="bg-white dark:bg-gray-900 border border-blue-500/30 rounded-xl p-4 flex gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") {
                setCreating(false);
                setNewTitle("");
              }
            }}
            placeholder="Nome do módulo"
            className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
          >
            Criar
          </button>
          <button
            onClick={() => {
              setCreating(false);
              setNewTitle("");
            }}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg transition"
          >
            Cancelar
          </button>
        </div>
      )}

      {modules.length === 0 && !creating ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-500 text-sm">
            Nenhum módulo criado ainda. Clique em &ldquo;Novo módulo&rdquo; para começar.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={modules.map((m) => m.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {modules.map((module) => (
                <SortableModule
                  key={module.id}
                  module={module}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  onLessonsChange={(lessons) =>
                    handleLessonsChange(module.id, lessons)
                  }
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function SortableModule({
  module,
  onUpdate,
  onDelete,
  onLessonsChange,
}: {
  module: ModuleData;
  onUpdate: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onLessonsChange: (lessons: LessonData[]) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id });

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(module.title);
  const [expanded, setExpanded] = useState(true);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  function saveEdit() {
    if (editTitle.trim() && editTitle !== module.title) {
      onUpdate(module.id, editTitle);
    }
    setEditing(false);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden"
    >
      <div className="flex items-center gap-2 p-4 bg-white dark:bg-gray-900">
        <button
          {...attributes}
          {...listeners}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing touch-none"
          aria-label="Arrastar módulo"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="9" cy="6" r="1.5" />
            <circle cx="15" cy="6" r="1.5" />
            <circle cx="9" cy="12" r="1.5" />
            <circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="18" r="1.5" />
            <circle cx="15" cy="18" r="1.5" />
          </svg>
        </button>

        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-1"
        >
          <svg
            className={`w-4 h-4 transition-transform ${expanded ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {editing ? (
          <input
            autoFocus
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveEdit();
              if (e.key === "Escape") {
                setEditTitle(module.title);
                setEditing(false);
              }
            }}
            className="flex-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        ) : (
          <h3
            onClick={() => setEditing(true)}
            className="flex-1 text-gray-900 dark:text-white font-medium cursor-text hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1 rounded"
          >
            {module.title}
          </h3>
        )}

        <span className="text-xs text-gray-500">
          {module.lessons.length} aula{module.lessons.length !== 1 && "s"}
        </span>

        <button
          onClick={() => onDelete(module.id)}
          className="p-1.5 text-gray-500 hover:text-red-400 transition"
          aria-label="Excluir módulo"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-800 bg-gray-950/40 p-4">
          <LessonsManager
            moduleId={module.id}
            initialLessons={module.lessons}
            onChange={onLessonsChange}
          />
        </div>
      )}
    </div>
  );
}

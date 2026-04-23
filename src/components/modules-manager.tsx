"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
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
import { ThumbnailUpload } from "./thumbnail-upload";

export interface ModuleData {
  id: string;
  title: string;
  order: number;
  daysToRelease: number;
  thumbnailUrl: string | null;
  hideTitle: boolean;
  sectionId: string | null;
  lessons: LessonData[];
}

export interface SectionData {
  id: string;
  title: string;
  order: number;
}

interface ModulesManagerProps {
  courseId: string;
  initialModules: ModuleData[];
  initialSections: SectionData[];
}

type ListItem =
  | { kind: "section"; data: SectionData }
  | { kind: "module"; data: ModuleData };

function buildOrderedList(
  modules: ModuleData[],
  sections: SectionData[]
): ListItem[] {
  const sorted = [...sections].sort((a, b) => a.order - b.order);
  const unsectioned = modules
    .filter((m) => !m.sectionId)
    .sort((a, b) => a.order - b.order);
  const out: ListItem[] = [];
  for (const s of sorted) {
    out.push({ kind: "section", data: s });
    const mods = modules
      .filter((m) => m.sectionId === s.id)
      .sort((a, b) => a.order - b.order);
    for (const m of mods) out.push({ kind: "module", data: m });
  }
  for (const m of unsectioned) out.push({ kind: "module", data: m });
  return out;
}

export function ModulesManager({
  courseId,
  initialModules,
  initialSections,
}: ModulesManagerProps) {
  const [modules, setModules] = useState<ModuleData[]>(initialModules);
  const [sections, setSections] = useState<SectionData[]>(initialSections);
  const [creatingModule, setCreatingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [creatingSection, setCreatingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const items = useMemo(
    () => buildOrderedList(modules, sections),
    [modules, sections]
  );

  async function persistOrder(newItems: ListItem[]) {
    const payload = newItems.map((it) => ({
      type: it.kind,
      id: it.data.id,
    }));
    await fetch(`/api/courses/${courseId}/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: payload }),
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((it) => it.data.id === active.id);
    const newIndex = items.findIndex((it) => it.data.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(items, oldIndex, newIndex);

    // Derive new modules / sections state from reordered list
    const newSections: SectionData[] = [];
    const newModules: ModuleData[] = [];
    let currentSectionId: string | null = null;
    let sectionOrder = 0;
    let moduleOrder = 0;
    for (const it of reordered) {
      if (it.kind === "section") {
        currentSectionId = it.data.id;
        newSections.push({ ...it.data, order: sectionOrder++ });
      } else {
        newModules.push({
          ...it.data,
          sectionId: currentSectionId,
          order: moduleOrder++,
        });
      }
    }
    setSections(newSections);
    setModules(newModules);
    void persistOrder(reordered);
  }

  async function handleCreateModule() {
    if (!newModuleTitle.trim()) return;
    const res = await fetch(`/api/courses/${courseId}/modules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newModuleTitle }),
    });
    if (res.ok) {
      const data = await res.json();
      setModules([
        ...modules,
        {
          ...data.module,
          daysToRelease: data.module.daysToRelease ?? 0,
          thumbnailUrl: data.module.thumbnailUrl ?? null,
          hideTitle: data.module.hideTitle ?? false,
          sectionId: data.module.sectionId ?? null,
          lessons: [],
        },
      ]);
      setNewModuleTitle("");
      setCreatingModule(false);
    }
  }

  async function handleCreateSection() {
    if (!newSectionTitle.trim()) return;
    const res = await fetch(`/api/courses/${courseId}/sections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newSectionTitle }),
    });
    if (res.ok) {
      const data = await res.json();
      setSections([...sections, data.section]);
      setNewSectionTitle("");
      setCreatingSection(false);
    }
  }

  async function handleUpdateModule(
    id: string,
    data: {
      title?: string;
      daysToRelease?: number;
      thumbnailUrl?: string | null;
      hideTitle?: boolean;
    }
  ) {
    setModules((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...data } : m))
    );
    const res = await fetch(`/api/modules/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      console.error("Failed to update module", id, await res.text());
      const mod = modules.find((m) => m.id === id);
      if (mod) {
        const revert: Record<string, unknown> = {};
        for (const key of Object.keys(data) as (keyof typeof data)[]) {
          revert[key] = mod[key];
        }
        setModules((prev) =>
          prev.map((m) => (m.id === id ? { ...m, ...revert } : m))
        );
      }
    }
  }

  async function handleDeleteModule(id: string) {
    if (!confirm("Excluir este módulo e todas as aulas dentro dele?")) return;
    const res = await fetch(`/api/modules/${id}`, { method: "DELETE" });
    if (res.ok) {
      setModules((prev) => prev.filter((m) => m.id !== id));
    }
  }

  async function handleUpdateSection(id: string, title: string) {
    const res = await fetch(`/api/sections/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (res.ok) {
      setSections((prev) =>
        prev.map((s) => (s.id === id ? { ...s, title } : s))
      );
    }
  }

  async function handleDeleteSection(id: string) {
    if (!confirm("Excluir esta divisão? Os módulos ficarão sem seção.")) return;
    const res = await fetch(`/api/sections/${id}`, { method: "DELETE" });
    if (res.ok) {
      setSections((prev) => prev.filter((s) => s.id !== id));
      setModules((prev) =>
        prev.map((m) => (m.sectionId === id ? { ...m, sectionId: null } : m))
      );
    }
  }

  function handleLessonsChange(moduleId: string, lessons: LessonData[]) {
    setModules((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, lessons } : m))
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Módulos & Divisões
        </h2>
        <div className="flex flex-wrap gap-2">
          {!creatingSection && (
            <button
              onClick={() => setCreatingSection(true)}
              className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-medium rounded-lg transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              Adicionar divisão
            </button>
          )}
          {!creatingModule && (
            <button
              onClick={() => setCreatingModule(true)}
              className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Novo módulo
            </button>
          )}
        </div>
      </div>

      {creatingSection && (
        <div className="bg-white dark:bg-gray-900 border border-blue-500/30 rounded-xl p-4 flex gap-2">
          <input
            type="text"
            value={newSectionTitle}
            onChange={(e) => setNewSectionTitle(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateSection();
              if (e.key === "Escape") {
                setCreatingSection(false);
                setNewSectionTitle("");
              }
            }}
            placeholder="Título da divisão (ex: Módulo 1 - Fundamentos)"
            className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleCreateSection}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
          >
            Criar
          </button>
          <button
            onClick={() => {
              setCreatingSection(false);
              setNewSectionTitle("");
            }}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg transition"
          >
            Cancelar
          </button>
        </div>
      )}

      {creatingModule && (
        <div className="bg-white dark:bg-gray-900 border border-blue-500/30 rounded-xl p-4 flex gap-2">
          <input
            type="text"
            value={newModuleTitle}
            onChange={(e) => setNewModuleTitle(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateModule();
              if (e.key === "Escape") {
                setCreatingModule(false);
                setNewModuleTitle("");
              }
            }}
            placeholder="Nome do módulo"
            className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleCreateModule}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
          >
            Criar
          </button>
          <button
            onClick={() => {
              setCreatingModule(false);
              setNewModuleTitle("");
            }}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg transition"
          >
            Cancelar
          </button>
        </div>
      )}

      {items.length === 0 ? (
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
            items={items.map((it) => it.data.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {items.map((it) =>
                it.kind === "section" ? (
                  <SortableSection
                    key={it.data.id}
                    section={it.data}
                    onUpdate={handleUpdateSection}
                    onDelete={handleDeleteSection}
                  />
                ) : (
                  <SortableModule
                    key={it.data.id}
                    module={it.data}
                    onUpdate={handleUpdateModule}
                    onDelete={handleDeleteModule}
                    onLessonsChange={(lessons) =>
                      handleLessonsChange(it.data.id, lessons)
                    }
                  />
                )
              )}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function SortableSection({
  section,
  onUpdate,
  onDelete,
}: {
  section: SectionData;
  onUpdate: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(section.title);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  function saveEdit() {
    if (editTitle.trim() && editTitle !== section.title) {
      onUpdate(section.id, editTitle.trim());
    } else {
      setEditTitle(section.title);
    }
    setEditing(false);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 py-2 px-3 bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/30 rounded-lg"
    >
      <button
        {...attributes}
        {...listeners}
        className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 cursor-grab active:cursor-grabbing touch-none"
        aria-label="Arrastar divisão"
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
      <div className="flex-shrink-0 uppercase text-[10px] tracking-wider font-bold text-blue-600 dark:text-blue-400">
        Divisão
      </div>
      {editing ? (
        <input
          autoFocus
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveEdit();
            if (e.key === "Escape") {
              setEditTitle(section.title);
              setEditing(false);
            }
          }}
          className="flex-1 px-2 py-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      ) : (
        <h3
          onClick={() => setEditing(true)}
          className="flex-1 text-gray-900 dark:text-white font-semibold cursor-text hover:bg-white/40 dark:hover:bg-gray-900/40 px-2 py-1 rounded text-sm"
        >
          {section.title}
        </h3>
      )}
      <button
        onClick={() => onDelete(section.id)}
        className="p-1.5 text-gray-500 hover:text-red-400 transition"
        aria-label="Excluir divisão"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
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
  onUpdate: (
    id: string,
    data: {
      title?: string;
      daysToRelease?: number;
      thumbnailUrl?: string | null;
      hideTitle?: boolean;
    }
  ) => void;
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
  const [expanded, setExpanded] = useState(false);
  const [daysInput, setDaysInput] = useState(String(module.daysToRelease ?? 0));

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  function saveEdit() {
    if (editTitle.trim() && editTitle !== module.title) {
      onUpdate(module.id, { title: editTitle });
    }
    setEditing(false);
  }

  function saveDays() {
    const n = Math.max(0, Math.floor(Number(daysInput) || 0));
    if (n !== module.daysToRelease) onUpdate(module.id, { daysToRelease: n });
    setDaysInput(String(n));
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

        {module.thumbnailUrl && (
          <div className="relative w-12 h-9 rounded overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
            <Image
              src={module.thumbnailUrl}
              alt={module.title}
              fill
              sizes="48px"
              className="object-cover"
            />
          </div>
        )}

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

        <span className="text-xs text-gray-500 hidden sm:inline">
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
        <div className="border-t border-gray-200 dark:border-gray-800 bg-gray-950/40 p-4 space-y-4">
          <ThumbnailUpload
            value={module.thumbnailUrl}
            onChange={(url) => onUpdate(module.id, { thumbnailUrl: url })}
            label="Capa do módulo"
            helperText="Tamanho ideal: 380x680px (formato vertical). PNG, JPG ou WebP, máx. 5MB."
            uploadPath={`modules/${module.id}`}
            aspectClass="aspect-[9/16] max-w-[180px]"
          />

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={module.hideTitle}
              onChange={(e) =>
                onUpdate(module.id, { hideTitle: e.target.checked })
              }
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-800"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Esconder título no card
            </span>
            <span className="text-xs text-gray-500" title="Quando ativado, apenas a imagem aparece no card do módulo no carrossel">
              ⓘ
            </span>
          </label>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Liberar após (dias)
            </label>
            <input
              type="number"
              min={0}
              value={daysInput}
              onChange={(e) => setDaysInput(e.target.value)}
              onBlur={saveDays}
              className="w-32 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              0 = liberado imediatamente. Ex: 7 = libera 7 dias após a matrícula do aluno.
            </p>
          </div>
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

"use client";

import { useState } from "react";
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
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BannerUpload } from "./banner-upload";

export interface BannerImage {
  url: string;
  position: { x: number; y: number };
}

// MESMAS cropWindows do banner do curso (course-form).
const COURSE_CROP_WINDOWS = [
  { label: "Computador", aspect: 75 / 16 },
  { label: "Tablet", aspect: 10 / 3 },
  { label: "Celular", aspect: 16 / 9 },
];
const MAX_TOTAL = 5; // capa + até 4 extras
const HINT =
  "Tamanho ideal: 3000x640px. No celular as laterais são cortadas — mantenha o essencial no centro. PNG, JPG ou WebP, máx. 5MB.";

// Nota de assimetria CONTIDA: aqui (e nos extras) a posição é sempre objeto {x,y}.
// A capa só vira string JSON no boundary do course-form/DB (bannerPosition); os
// extras (bannerExtra) já são gravados como objeto. Dentro deste componente tudo é {x,y}.

type Selection = "cover" | "new" | number; // number = índice em extras

interface Props {
  courseId?: string;
  coverUrl: string | null;
  coverPosition: { x: number; y: number };
  setCoverUrl: (url: string | null) => void;
  setCoverPosition: (pos: { x: number; y: number }) => void;
  extras: BannerImage[];
  setExtras: (next: BannerImage[]) => void;
}

export function BannerCarouselUpload({
  courseId,
  coverUrl,
  coverPosition,
  setCoverUrl,
  setCoverPosition,
  extras,
  setExtras,
}: Props) {
  const [selected, setSelected] = useState<Selection>("cover");
  const [mode, setMode] = useState<"view" | "reposition">("view");
  const uploadPath = courseId ? `banners/${courseId}` : undefined;

  const total = (coverUrl ? 1 : 0) + extras.length;
  const canAdd = coverUrl != null && total < MAX_TOTAL;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function select(sel: Selection) {
    setMode("view");
    setSelected(sel);
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = extras.findIndex((x) => x.url === active.id);
    const newIndex = extras.findIndex((x) => x.url === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setExtras(arrayMove(extras, oldIndex, newIndex));
  }

  function removeExtra(i: number) {
    setExtras(extras.filter((_, idx) => idx !== i));
    select("cover");
  }

  function makeCover(i: number) {
    if (coverUrl == null) return;
    const prevCover: BannerImage = { url: coverUrl, position: coverPosition };
    const target = extras[i];
    setCoverUrl(target.url);
    setCoverPosition(target.position);
    const next = [...extras];
    next[i] = prevCover;
    setExtras(next);
    select("cover");
  }

  // ── Editor da imagem selecionada (REUSA BannerUpload) ──────────────────────
  let editor: React.ReactNode = null;
  if (selected === "new") {
    editor = (
      <BannerUpload
        value={null}
        onChange={(url) => {
          if (url) {
            setExtras([...extras, { url, position: { x: 50, y: 50 } }]);
            select(extras.length); // índice da recém-adicionada
          }
        }}
        uploadPath={uploadPath}
        position={{ x: 50, y: 50 }}
        aspectRatio="75/16"
        label="Nova imagem do carrossel"
        hint={HINT}
        cropWindows={COURSE_CROP_WINDOWS}
      />
    );
  } else if (selected === "cover") {
    editor = (
      <BannerUpload
        value={coverUrl}
        onChange={(url) => {
          setCoverUrl(url);
          if (url) {
            setCoverPosition({ x: 50, y: 50 });
            setMode("reposition");
          } else {
            setCoverPosition({ x: 50, y: 50 });
            setMode("view");
          }
        }}
        uploadPath={uploadPath}
        position={coverPosition}
        onPositionChange={setCoverPosition}
        mode={mode}
        onModeChange={setMode}
        aspectRatio="75/16"
        label="Capa (slide 1)"
        hint={HINT}
        cropWindows={COURSE_CROP_WINDOWS}
      />
    );
  } else {
    const i = selected;
    const img = extras[i];
    if (img) {
      editor = (
        <BannerUpload
          value={img.url}
          onChange={(url) => {
            if (!url) {
              removeExtra(i);
              return;
            }
            const next = [...extras];
            next[i] = { ...next[i], url };
            setExtras(next);
          }}
          uploadPath={uploadPath}
          position={img.position}
          onPositionChange={(pos) => {
            const next = [...extras];
            next[i] = { ...next[i], position: pos };
            setExtras(next);
          }}
          mode={mode}
          onModeChange={setMode}
          aspectRatio="75/16"
          label={`Imagem ${i + 2} do carrossel`}
          hint={HINT}
          cropWindows={COURSE_CROP_WINDOWS}
        />
      );
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Banners do curso (carrossel)
        </label>
        <span className="text-xs text-gray-500">{total} de {MAX_TOTAL}</span>
      </div>

      {/* Strip de thumbnails: Capa (fixa, slide 1) + extras (reordenáveis) + Adicionar */}
      <div className="flex items-stretch gap-2 mb-3 overflow-x-visible flex-wrap">
        {/* Capa */}
        {coverUrl && (
          <button
            type="button"
            onClick={() => select("cover")}
            className={`relative w-28 rounded-lg overflow-hidden border-2 transition shrink-0 ${
              selected === "cover" ? "border-primary" : "border-transparent hover:border-gray-300 dark:hover:border-gray-600"
            }`}
            style={{ aspectRatio: "75/16" }}
            title="Capa (slide 1)"
          >
            <Image src={coverUrl} alt="Capa" fill sizes="112px" className="object-cover" style={{ objectPosition: `${coverPosition.x}% ${coverPosition.y}%` }} />
            <span className="absolute top-0.5 left-0.5 bg-primary text-white text-[9px] leading-none px-1 py-0.5 rounded">Capa</span>
          </button>
        )}

        {/* Extras reordenáveis */}
        {extras.length > 0 && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={extras.map((e) => e.url)} strategy={horizontalListSortingStrategy}>
              <div className="flex items-stretch gap-2">
                {extras.map((img, i) => (
                  <SortableThumb
                    key={img.url}
                    id={img.url}
                    img={img}
                    selected={selected === i}
                    onSelect={() => select(i)}
                    onRemove={() => removeExtra(i)}
                    onMakeCover={() => makeCover(i)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Adicionar */}
        {canAdd && (
          <button
            type="button"
            onClick={() => select("new")}
            className={`w-28 rounded-lg border-2 border-dashed transition shrink-0 flex flex-col items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 ${
              selected === "new" ? "border-primary text-primary" : "border-gray-300 dark:border-gray-600 hover:border-gray-400"
            }`}
            style={{ aspectRatio: "75/16" }}
            title="Adicionar imagem"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-[10px] mt-0.5">Adicionar</span>
          </button>
        )}
      </div>

      {/* Editor da imagem selecionada */}
      {editor}
    </div>
  );
}

function SortableThumb({
  id,
  img,
  selected,
  onSelect,
  onRemove,
  onMakeCover,
}: {
  id: string;
  img: BannerImage;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onMakeCover: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={{ ...style, aspectRatio: "75/16" }}
      className={`relative group w-28 rounded-lg overflow-hidden border-2 shrink-0 ${
        selected ? "border-primary" : "border-transparent"
      }`}
    >
      <button type="button" onClick={onSelect} className="absolute inset-0" title="Editar imagem">
        <Image src={img.url} alt="Banner extra" fill sizes="112px" className="object-cover" style={{ objectPosition: `${img.position.x}% ${img.position.y}%` }} />
      </button>
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute top-0.5 left-0.5 bg-black/55 text-white rounded p-0.5 cursor-grab active:cursor-grabbing touch-none opacity-0 group-hover:opacity-100 transition"
        aria-label="Arrastar para reordenar"
      >
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
          <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
        </svg>
      </button>
      {/* Remover */}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-0.5 right-0.5 bg-black/55 hover:bg-red-600/80 text-white rounded p-0.5 opacity-0 group-hover:opacity-100 transition"
        title="Remover"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      {/* Tornar capa */}
      <button
        type="button"
        onClick={onMakeCover}
        className="absolute bottom-0.5 left-1/2 -translate-x-1/2 bg-black/60 hover:bg-black/80 text-white text-[9px] leading-none px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap"
        title="Tornar capa"
      >
        Tornar capa
      </button>
    </div>
  );
}

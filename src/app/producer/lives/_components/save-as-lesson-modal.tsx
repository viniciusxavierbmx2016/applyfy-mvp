"use client";

import { useState } from "react";
import type { LiveItem, CourseOption, ModuleOption } from "../_types";
import { inputCls, labelCls } from "../_lib/helpers";

interface SaveAsLessonModalProps {
  live: LiveItem;
  courses: CourseOption[];
  onClose: () => void;
  onSaved: () => void;
}

export function SaveAsLessonModal({
  live,
  courses,
  onClose,
  onSaved,
}: SaveAsLessonModalProps) {
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [lessonForm, setLessonForm] = useState({
    courseId: "",
    moduleId: "",
    title: live.title,
    description: live.description || "",
    videoUrl: live.recordingUrl || "",
  });
  const [savingLesson, setSavingLesson] = useState(false);

  async function handleLessonCourseChange(courseId: string) {
    setLessonForm((f) => ({ ...f, courseId, moduleId: "" }));
    setModules([]);
    if (!courseId) return;
    try {
      const res = await fetch(`/api/courses/${courseId}`);
      if (res.ok) {
        const data = await res.json();
        setModules(
          (data.course?.modules || []).map((m: ModuleOption) => ({
            id: m.id,
            title: m.title,
          }))
        );
      }
    } catch {
      // ignore
    }
  }

  async function handleSaveAsLesson() {
    if (!lessonForm.courseId || !lessonForm.moduleId || !lessonForm.title.trim() || !lessonForm.videoUrl.trim()) return;
    setSavingLesson(true);
    try {
      const res = await fetch(`/api/modules/${lessonForm.moduleId}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: lessonForm.title.trim(),
          description: lessonForm.description?.trim() || null,
          videoUrl: lessonForm.videoUrl.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Erro ao criar aula");
        return;
      }
      const data = await res.json();
      const lessonId = data.lesson?.id;

      if (lessonId) {
        await fetch(`/api/producer/lives/${live.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ savedAsLessonId: lessonId }),
        });
      }

      onClose();
      onSaved();
    } finally {
      setSavingLesson(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-950 border border-gray-200 dark:border-white/10 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">Salvar como aula</h2>
          <p className="text-gray-400 text-sm">
            Crie uma aula a partir da live &quot;{live.title}&quot;
          </p>

          <div>
            <label className={labelCls}>Curso *</label>
            <select
              className={inputCls}
              value={lessonForm.courseId}
              onChange={(e) => handleLessonCourseChange(e.target.value)}
            >
              <option value="">Selecione um curso</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Módulo *</label>
            <select
              className={inputCls}
              value={lessonForm.moduleId}
              onChange={(e) => setLessonForm((f) => ({ ...f, moduleId: e.target.value }))}
              disabled={!lessonForm.courseId || modules.length === 0}
            >
              <option value="">
                {!lessonForm.courseId
                  ? "Selecione um curso primeiro"
                  : modules.length === 0
                    ? "Nenhum módulo encontrado"
                    : "Selecione um módulo"}
              </option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>{m.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Título da aula *</label>
            <input
              className={inputCls}
              value={lessonForm.title}
              onChange={(e) => setLessonForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Título da aula"
            />
          </div>

          <div>
            <label className={labelCls}>Descrição</label>
            <textarea
              className={`${inputCls} resize-none`}
              rows={3}
              value={lessonForm.description}
              onChange={(e) => setLessonForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Descrição da aula"
            />
          </div>

          <div>
            <label className={labelCls}>URL do vídeo *</label>
            <input
              className={inputCls}
              value={lessonForm.videoUrl}
              onChange={(e) => setLessonForm((f) => ({ ...f, videoUrl: e.target.value }))}
              placeholder="Cole o link do YouTube, Vimeo, Google Drive..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveAsLesson}
              disabled={
                savingLesson ||
                !lessonForm.courseId ||
                !lessonForm.moduleId ||
                !lessonForm.title.trim() ||
                !lessonForm.videoUrl.trim()
              }
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              {savingLesson ? "Criando..." : "Criar aula"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

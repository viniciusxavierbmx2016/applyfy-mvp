"use client";

import { useState } from "react";
import Image from "next/image";
import type { LiveItem, CourseOption } from "../_types";
import {
  PLATFORMS,
  inputCls,
  labelCls,
  extractYouTubeEmbedUrl,
  toLocalDatetimeValue,
} from "../_lib/helpers";

interface CreateEditLiveModalProps {
  editingLive: LiveItem | null;
  courses: CourseOption[];
  onClose: () => void;
  onSaved: () => void;
}

export function CreateEditLiveModal({
  editingLive,
  courses,
  onClose,
  onSaved,
}: CreateEditLiveModalProps) {
  const [form, setForm] = useState(() =>
    editingLive
      ? {
          title: editingLive.title,
          description: editingLive.description || "",
          platform: editingLive.platform,
          externalUrl: editingLive.externalUrl,
          embedUrl: editingLive.embedUrl || "",
          scheduledAt: editingLive.scheduledAt ? toLocalDatetimeValue(editingLive.scheduledAt) : "",
          courseId: editingLive.courseId || "",
          thumbnailUrl: editingLive.thumbnailUrl || "",
          recordingUrl: editingLive.recordingUrl || "",
          visibility: editingLive.visibility || "PUBLIC",
        }
      : {
          title: "",
          description: "",
          platform: "YOUTUBE_LIVE",
          externalUrl: "",
          embedUrl: "",
          scheduledAt: "",
          courseId: "",
          thumbnailUrl: "",
          recordingUrl: "",
          visibility: "PUBLIC",
        }
  );
  const [saving, setSaving] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);

  async function handleThumbnailUpload(file: File) {
    setUploadingThumb(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("path", `lives/${Date.now()}`);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        setForm((f) => ({ ...f, thumbnailUrl: data.url }));
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao enviar imagem");
      }
    } catch {
      alert("Erro ao enviar imagem");
    } finally {
      setUploadingThumb(false);
    }
  }

  function handleUrlChange(url: string) {
    setForm((f) => {
      const embed = f.platform === "YOUTUBE_LIVE" ? extractYouTubeEmbedUrl(url) : null;
      return { ...f, externalUrl: url, ...(embed ? { embedUrl: embed } : {}) };
    });
  }

  function handlePlatformChange(platform: string) {
    setForm((f) => {
      const embed = platform === "YOUTUBE_LIVE" ? extractYouTubeEmbedUrl(f.externalUrl) : "";
      return { ...f, platform, embedUrl: embed || "" };
    });
  }

  async function handleSave() {
    if (!form.title.trim() || !form.externalUrl.trim() || !form.scheduledAt) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title,
        description: form.description || null,
        platform: form.platform,
        externalUrl: form.externalUrl,
        embedUrl: form.embedUrl || null,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        courseId: form.courseId || null,
        thumbnailUrl: form.thumbnailUrl || null,
        visibility: form.visibility,
      };

      if (editingLive) {
        payload.recordingUrl = form.recordingUrl || null;
      }

      const url = editingLive
        ? `/api/producer/lives/${editingLive.id}`
        : "/api/producer/lives";
      const method = editingLive ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onClose();
        onSaved();
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao salvar");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-950 border border-gray-200 dark:border-white/10 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">
            {editingLive ? "Editar Live" : "Nova Live"}
          </h2>

          <div>
            <label className={labelCls}>Título *</label>
            <input
              className={inputCls}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Nome da transmissão"
            />
          </div>

          <div>
            <label className={labelCls}>Descrição</label>
            <textarea
              className={`${inputCls} resize-none`}
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Descrição opcional"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Plataforma *</label>
              <select
                className={inputCls}
                value={form.platform}
                onChange={(e) => handlePlatformChange(e.target.value)}
              >
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Data e Hora *</label>
              <input
                type="datetime-local"
                className={inputCls}
                value={form.scheduledAt}
                onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Link da Live *</label>
            <input
              className={inputCls}
              value={form.externalUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://youtube.com/live/..."
            />
          </div>

          {form.platform === "YOUTUBE_LIVE" && form.embedUrl && (
            <div>
              <label className={labelCls}>Embed URL (auto-detectado)</label>
              <input
                className={`${inputCls} text-gray-500`}
                value={form.embedUrl}
                onChange={(e) => setForm((f) => ({ ...f, embedUrl: e.target.value }))}
              />
            </div>
          )}

          {form.platform !== "YOUTUBE_LIVE" && (
            <div>
              <label className={labelCls}>Embed URL (opcional)</label>
              <input
                className={inputCls}
                value={form.embedUrl}
                onChange={(e) => setForm((f) => ({ ...f, embedUrl: e.target.value }))}
                placeholder="URL para embed (iframe)"
              />
            </div>
          )}

          <div>
            <label className={labelCls}>Visibilidade</label>
            <div className="space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  value="PUBLIC"
                  checked={form.visibility === "PUBLIC"}
                  onChange={() => setForm((f) => ({ ...f, visibility: "PUBLIC" }))}
                  className="mt-0.5 accent-primary"
                />
                <div>
                  <span className="text-sm text-white">Pública</span>
                  <p className="text-xs text-gray-500">Todos os alunos do workspace</p>
                </div>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  value="COURSE_ONLY"
                  checked={form.visibility === "COURSE_ONLY"}
                  onChange={() => setForm((f) => ({ ...f, visibility: "COURSE_ONLY" }))}
                  className="mt-0.5 accent-primary"
                />
                <div>
                  <span className="text-sm text-white">Restrita ao curso</span>
                  <p className="text-xs text-gray-500">Apenas alunos matriculados no curso</p>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className={labelCls}>
              Curso vinculado {form.visibility === "COURSE_ONLY" ? "*" : ""}
            </label>
            <select
              className={inputCls}
              value={form.courseId}
              onChange={(e) => setForm((f) => ({ ...f, courseId: e.target.value }))}
            >
              <option value="">{form.visibility === "COURSE_ONLY" ? "Selecione um curso" : "Nenhum"}</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Thumbnail</label>
            {form.thumbnailUrl ? (
              <div className="flex items-center gap-3">
                <Image src={form.thumbnailUrl} alt="" width={96} height={56} className="w-24 h-14 object-cover rounded-lg border border-white/10" />
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, thumbnailUrl: "" }))}
                  className="text-xs text-red-400 hover:text-red-300 transition"
                >
                  Remover
                </button>
                <label className="text-xs text-primary hover:text-primary transition cursor-pointer">
                  Trocar
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleThumbnailUpload(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            ) : (
              <label className={`${inputCls} flex items-center justify-center gap-2 cursor-pointer border-dashed`}>
                {uploadingThumb ? (
                  <span className="text-gray-400 text-sm">Enviando...</span>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-gray-500 text-sm">Clique para enviar imagem</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  disabled={uploadingThumb}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleThumbnailUpload(file);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
            <p className="text-xs text-gray-500 mt-2">Tamanho ideal: 1280×720px (16:9). PNG, JPG ou WebP, máx. 5MB.</p>
          </div>

          {editingLive?.status === "ENDED" && (
            <div>
              <label className={labelCls}>URL da Gravação</label>
              <input
                className={inputCls}
                value={form.recordingUrl}
                onChange={(e) => setForm((f) => ({ ...f, recordingUrl: e.target.value }))}
                placeholder="Cole o link do YouTube, Vimeo, Google Drive..."
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.title.trim() || !form.externalUrl.trim() || !form.scheduledAt || (form.visibility === "COURSE_ONLY" && !form.courseId)}
              className="bg-primary hover:bg-primary disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              {saving ? "Salvando..." : editingLive ? "Salvar" : "Criar Live"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

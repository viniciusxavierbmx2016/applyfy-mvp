"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { SkeletonLiveCard } from "@/components/ui/skeleton";
import { HelpTooltip } from "@/components/help-tooltip";

interface LiveItem {
  id: string;
  title: string;
  description: string | null;
  platform: string;
  externalUrl: string;
  embedUrl: string | null;
  status: string;
  scheduledAt: string;
  startedAt: string | null;
  endedAt: string | null;
  recordingUrl: string | null;
  thumbnailUrl: string | null;
  courseId: string | null;
  savedAsLessonId: string | null;
  visibility: string;
  course: { id: string; title: string } | null;
  _count: { messages: number };
  createdAt: string;
}

interface CourseOption {
  id: string;
  title: string;
}

interface ModuleOption {
  id: string;
  title: string;
}

type StatusFilter = "ALL" | "SCHEDULED" | "LIVE" | "ENDED";

const PLATFORMS = [
  { value: "YOUTUBE_LIVE", label: "YouTube Live" },
  { value: "GOOGLE_MEET", label: "Google Meet" },
  { value: "ZOOM", label: "Zoom" },
  { value: "CUSTOM", label: "Outro link" },
];

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Agendada",
  LIVE: "Ao Vivo",
  ENDED: "Encerrada",
};

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-yellow-500/20 text-yellow-400",
  LIVE: "bg-red-500/20 text-red-400 animate-pulse",
  ENDED: "bg-gray-500/20 text-gray-400",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function extractYouTubeEmbedUrl(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/)([a-zA-Z0-9_-]+)/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
  }
  return null;
}

function toLocalDatetimeValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ProducerLivesPage() {
  const router = useRouter();
  const [lives, setLives] = useState<LiveItem[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [showModal, setShowModal] = useState(false);
  const [editingLive, setEditingLive] = useState<LiveItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [confirmAction, setConfirmAction] = useState<{
    type: "start" | "end" | "delete";
    live: LiveItem;
  } | null>(null);

  const [form, setForm] = useState({
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
  });

  // Save as lesson modal
  const [lessonModal, setLessonModal] = useState<LiveItem | null>(null);
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [lessonForm, setLessonForm] = useState({
    courseId: "",
    moduleId: "",
    title: "",
    description: "",
    videoUrl: "",
  });
  const [savingLesson, setSavingLesson] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);

  const fetchLives = useCallback(async () => {
    try {
      const res = await fetch("/api/producer/lives");
      if (res.ok) {
        const data = await res.json();
        setLives(data.lives);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCourses = useCallback(async () => {
    try {
      const res = await fetch("/api/courses?filter=all");
      if (res.ok) {
        const data = await res.json();
        setCourses(
          (data.courses || []).map((c: CourseOption) => ({
            id: c.id,
            title: c.title,
          }))
        );
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchLives();
    fetchCourses();
  }, [fetchLives, fetchCourses]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = filter === "ALL" ? lives : lives.filter((l) => l.status === filter);

  function openCreate() {
    setEditingLive(null);
    setForm({
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
    });
    setShowModal(true);
  }

  function openEdit(live: LiveItem) {
    setEditingLive(live);
    setForm({
      title: live.title,
      description: live.description || "",
      platform: live.platform,
      externalUrl: live.externalUrl,
      embedUrl: live.embedUrl || "",
      scheduledAt: live.scheduledAt ? toLocalDatetimeValue(live.scheduledAt) : "",
      courseId: live.courseId || "",
      thumbnailUrl: live.thumbnailUrl || "",
      recordingUrl: live.recordingUrl || "",
      visibility: live.visibility || "PUBLIC",
    });
    setShowModal(true);
  }

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
        setShowModal(false);
        fetchLives();
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao salvar");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(live: LiveItem, newStatus: string) {
    try {
      const res = await fetch(`/api/producer/lives/${live.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchLives();
      } else {
        const data = await res.json();
        alert(data.error || "Erro");
      }
    } catch {
      alert("Erro de conexão");
    }
    setConfirmAction(null);
  }

  async function handleDelete(live: LiveItem) {
    try {
      const res = await fetch(`/api/producer/lives/${live.id}`, { method: "DELETE" });
      if (res.ok) {
        fetchLives();
      } else {
        const data = await res.json();
        alert(data.error || "Erro");
      }
    } catch {
      alert("Erro de conexão");
    }
    setConfirmAction(null);
  }

  function copyLink(url: string) {
    navigator.clipboard.writeText(url);
  }

  async function openLessonModal(live: LiveItem) {
    setLessonModal(live);
    setModules([]);
    setLessonForm({
      courseId: "",
      moduleId: "",
      title: live.title,
      description: live.description || "",
      videoUrl: live.recordingUrl || "",
    });
  }

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
    if (!lessonModal) return;
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
        await fetch(`/api/producer/lives/${lessonModal.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ savedAsLessonId: lessonId }),
        });
      }

      setLessonModal(null);
      setToast("Aula criada com sucesso!");
      fetchLives();
    } finally {
      setSavingLesson(false);
    }
  }

  const liveCount = lives.filter((l) => l.status === "LIVE").length;
  const scheduledCount = lives.filter((l) => l.status === "SCHEDULED").length;

  const inputCls =
    "w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2.5 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors text-sm";
  const labelCls = "block text-xs text-gray-400 mb-1.5";

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[60] bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-slide-up">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Lives
            <HelpTooltip text="Agende e gerencie transmissões ao vivo para seus alunos. Integre com YouTube, Zoom ou qualquer plataforma." />
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {liveCount > 0 && (
              <span className="text-red-400 font-medium mr-3">
                {liveCount} ao vivo agora
              </span>
            )}
            {scheduledCount > 0 && (
              <span>{scheduledCount} agendada{scheduledCount > 1 ? "s" : ""}</span>
            )}
            {liveCount === 0 && scheduledCount === 0 && "Gerencie suas transmissões ao vivo"}
          </p>
        </div>
        <div className="flex items-center gap-0">
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nova Live
          </button>
          <HelpTooltip text="Crie uma nova live com data, horário, link da transmissão e notifique seus alunos automaticamente." />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(["ALL", "SCHEDULED", "LIVE", "ENDED"] as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === s
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
            }`}
          >
            {s === "ALL" ? "Todas" : STATUS_LABELS[s]}
            {s === "LIVE" && liveCount > 0 && (
              <span className="ml-1.5 inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonLiveCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl p-10 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-gray-900 dark:text-white font-semibold text-lg mb-2">
            {filter === "ALL" ? "Nenhuma live criada" : `Nenhuma live ${STATUS_LABELS[filter]?.toLowerCase()}`}
          </h3>
          <p className="text-gray-500 text-sm">
            {filter === "ALL" ? "Crie sua primeira transmissão ao vivo" : "Altere o filtro para ver outras lives"}
          </p>
          {filter === "ALL" && (
            <button
              onClick={openCreate}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition text-sm mt-4"
            >
              Criar Live
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((live) => (
            <div
              key={live.id}
              className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl p-4 hover:border-gray-300 dark:hover:border-white/10 transition"
            >
              <div className="flex items-start gap-4">
                {/* Thumbnail */}
                {live.thumbnailUrl && (
                  <div className="w-32 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-black/30">
                    <img
                      src={live.thumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[live.status]}`}>
                      {live.status === "LIVE" && (
                        <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full mr-1" />
                      )}
                      {STATUS_LABELS[live.status]}
                    </span>
                    <span className="text-xs text-gray-500">
                      {PLATFORMS.find((p) => p.value === live.platform)?.label}
                    </span>
                    {live.savedAsLessonId && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                        Salva como aula
                      </span>
                    )}
                  </div>

                  <h3 className="text-white font-medium truncate">{live.title}</h3>

                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                    <span>
                      {live.status === "LIVE" && live.startedAt
                        ? `Iniciou ${formatDate(live.startedAt)}`
                        : live.status === "ENDED" && live.endedAt
                          ? `Encerrou ${formatDate(live.endedAt)}`
                          : `Agendada para ${formatDate(live.scheduledAt)}`}
                    </span>
                    {live.course && (
                      <span className="text-blue-400">{live.course.title}</span>
                    )}
                    {live._count.messages > 0 && (
                      <span>{live._count.messages} mensagens</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {live.status === "SCHEDULED" && (
                    <button
                      onClick={() => setConfirmAction({ type: "start", live })}
                      className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition"
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Iniciar
                    </button>
                  )}
                  {live.status === "LIVE" && (
                    <>
                      <button
                        onClick={() => router.push(`/producer/lives/${live.id}`)}
                        className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Entrar
                      </button>
                      <button
                        onClick={() => setConfirmAction({ type: "end", live })}
                        className="flex items-center gap-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition"
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <rect x="6" y="6" width="12" height="12" rx="1" />
                        </svg>
                        Encerrar
                      </button>
                    </>
                  )}
                  {live.status === "ENDED" && !live.savedAsLessonId && (
                    <button
                      onClick={() => openLessonModal(live)}
                      className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      Salvar como aula
                    </button>
                  )}
                  <button
                    onClick={() => copyLink(live.externalUrl)}
                    className="p-1.5 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 hover:text-white transition"
                    title="Copiar link"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  </button>
                  <button
                    onClick={() => openEdit(live)}
                    className="p-1.5 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 hover:text-white transition"
                    title="Editar"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setConfirmAction({ type: "delete", live })}
                    className="p-1.5 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 hover:text-red-400 transition"
                    title="Excluir"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowModal(false)} />
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
                      className="mt-0.5 accent-blue-500"
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
                      className="mt-0.5 accent-blue-500"
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
                    <label className="text-xs text-blue-400 hover:text-blue-300 transition cursor-pointer">
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
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.title.trim() || !form.externalUrl.trim() || !form.scheduledAt || (form.visibility === "COURSE_ONLY" && !form.courseId)}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                >
                  {saving ? "Salvando..." : editingLive ? "Salvar" : "Criar Live"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmAction(null)} />
          <div className="relative bg-white dark:bg-gray-950 border border-gray-200 dark:border-white/10 rounded-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-white mb-2">
              {confirmAction.type === "start"
                ? "Iniciar Live?"
                : confirmAction.type === "end"
                  ? "Encerrar Live?"
                  : "Excluir Live?"}
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              {confirmAction.type === "start"
                ? `"${confirmAction.live.title}" será marcada como ao vivo. O chat será liberado para os alunos.`
                : confirmAction.type === "end"
                  ? `"${confirmAction.live.title}" será encerrada. O chat será desabilitado.`
                  : `"${confirmAction.live.title}" será excluída permanentemente com todas as mensagens.`}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (confirmAction.type === "delete") {
                    handleDelete(confirmAction.live);
                  } else {
                    handleStatusChange(
                      confirmAction.live,
                      confirmAction.type === "start" ? "LIVE" : "ENDED"
                    );
                  }
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  confirmAction.type === "delete"
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : confirmAction.type === "start"
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-gray-600 hover:bg-gray-700 text-white"
                }`}
              >
                {confirmAction.type === "start"
                  ? "Iniciar"
                  : confirmAction.type === "end"
                    ? "Encerrar"
                    : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save as Lesson Modal */}
      {lessonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setLessonModal(null)} />
          <div className="relative bg-white dark:bg-gray-950 border border-gray-200 dark:border-white/10 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <h2 className="text-lg font-bold text-white">Salvar como aula</h2>
              <p className="text-gray-400 text-sm">
                Crie uma aula a partir da live &quot;{lessonModal.title}&quot;
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
                  onClick={() => setLessonModal(null)}
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
      )}
    </div>
  );
}

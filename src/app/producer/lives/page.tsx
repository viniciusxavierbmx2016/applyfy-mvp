"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { SkeletonLiveCard } from "@/components/ui/skeleton";
import { HelpTooltip } from "@/components/help-tooltip";
import type {
  LiveItem,
  CourseOption,
  StatusFilter,
} from "./_types";
import {
  PLATFORMS,
  STATUS_LABELS,
  STATUS_COLORS,
  formatDate,
} from "./_lib/helpers";
import { ConfirmModal } from "./_components/confirm-modal";
import { SaveAsLessonModal } from "./_components/save-as-lesson-modal";
import { CreateEditLiveModal } from "./_components/create-edit-live-modal";

export default function ProducerLivesPage() {
  const router = useRouter();
  const [lives, setLives] = useState<LiveItem[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [showModal, setShowModal] = useState(false);
  const [editingLive, setEditingLive] = useState<LiveItem | null>(null);
  const [toast, setToast] = useState("");
  const [confirmAction, setConfirmAction] = useState<{
    type: "start" | "end" | "delete";
    live: LiveItem;
  } | null>(null);

  // Save as lesson modal
  const [lessonModal, setLessonModal] = useState<LiveItem | null>(null);

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
    setShowModal(true);
  }

  function openEdit(live: LiveItem) {
    setEditingLive(live);
    setShowModal(true);
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

  function openLessonModal(live: LiveItem) {
    setLessonModal(live);
  }

  const liveCount = lives.filter((l) => l.status === "LIVE").length;
  const scheduledCount = lives.filter((l) => l.status === "SCHEDULED").length;

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
            className="flex items-center gap-2 bg-primary hover:bg-primary text-white px-4 py-2 rounded-lg transition text-sm font-medium"
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
                ? "bg-primary text-white"
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
          <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              className="bg-primary hover:bg-primary text-white px-4 py-2 rounded-lg transition text-sm mt-4"
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
                    <Image
                      src={live.thumbnailUrl}
                      alt=""
                      width={128}
                      height={80}
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
                      <span className="text-primary">{live.course.title}</span>
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
                        className="flex items-center gap-1 bg-primary hover:bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-medium transition"
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
        <CreateEditLiveModal
          key={editingLive?.id ?? "new"}
          editingLive={editingLive}
          courses={courses}
          onClose={() => setShowModal(false)}
          onSaved={fetchLives}
        />
      )}

      {/* Confirm Modal */}
      {confirmAction && (
        <ConfirmModal
          action={confirmAction}
          onCancel={() => setConfirmAction(null)}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Save as Lesson Modal */}
      {lessonModal && (
        <SaveAsLessonModal
          key={lessonModal.id}
          live={lessonModal}
          courses={courses}
          onClose={() => setLessonModal(null)}
          onSaved={() => {
            setToast("Aula criada com sucesso!");
            fetchLives();
          }}
        />
      )}
    </div>
  );
}

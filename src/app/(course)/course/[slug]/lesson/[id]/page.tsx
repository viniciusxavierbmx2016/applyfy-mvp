"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { VideoPlayer } from "@/components/video-player";
import { AutoplayCountdown } from "@/components/autoplay-countdown";
import { LessonComments } from "@/components/lesson-comments";
import {
  LessonsSidebar,
  type SidebarModule,
} from "@/components/lessons-sidebar";
import { useUserStore } from "@/stores/user-store";
import type { ParsedVideo } from "@/lib/video";

interface ViewData {
  lesson: {
    id: string;
    title: string;
    description: string | null;
    moduleId: string;
    video: ParsedVideo;
    completed: boolean;
  };
  course: {
    id: string;
    slug: string;
    title: string;
    modules: SidebarModule[];
  };
  prev: { id: string; title: string } | null;
  next: { id: string; title: string } | null;
}

export default function LessonPage({
  params,
}: {
  params: { slug: string; id: string };
}) {
  const router = useRouter();
  const { setUser, user } = useUserStore();
  const [data, setData] = useState<ViewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"description" | "comments">(
    "description"
  );
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load lesson
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setShowCountdown(false);

    fetch(`/api/lessons/${params.id}/view`)
      .then(async (res) => {
        if (res.status === 403 || res.status === 404) {
          if (!cancelled) router.replace(`/course/${params.slug}`);
          return null;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Erro ao carregar aula");
        }
        return res.json();
      })
      .then((d: ViewData | null) => {
        if (d && !cancelled) setData(d);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [params.id, params.slug, router]);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  };

  const markCompleted = useCallback(
    async (completed: boolean) => {
      if (!data) return;
      setMarking(true);
      try {
        const res = await fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lessonId: data.lesson.id, completed }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Erro");

        // Update local state — mark current lesson in sidebar
        setData((prev) =>
          prev
            ? {
                ...prev,
                lesson: { ...prev.lesson, completed },
                course: {
                  ...prev.course,
                  modules: prev.course.modules.map((m) => ({
                    ...m,
                    lessons: m.lessons.map((l) =>
                      l.id === prev.lesson.id ? { ...l, completed } : l
                    ),
                  })),
                },
              }
            : prev
        );

        // Gamification feedback
        if (completed && body.pointsAwarded > 0) {
          let msg = `+${body.pointsAwarded} pontos!`;
          if (body.courseCompleted) msg += " 🎉 Curso concluído!";
          else if (body.moduleCompleted) msg += " ✨ Módulo concluído!";
          if (body.leveledUp) msg += " Você subiu de nível!";
          showToast(msg);

          // Update local user store if available
          if (user && body.user) {
            setUser({
              ...user,
              points: body.user.points,
              level: body.user.level,
            });
          }
        }

        return body;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro";
        showToast(`Erro: ${msg}`);
      } finally {
        setMarking(false);
      }
    },
    [data, setUser, user]
  );

  const handleEnded = useCallback(async () => {
    if (!data) return;
    // Auto-mark complete on end if not already
    if (!data.lesson.completed) {
      await markCompleted(true);
    }
    if (data.next) {
      setShowCountdown(true);
    }
  }, [data, markCompleted]);

  const goToNext = useCallback(() => {
    if (!data?.next) return;
    setShowCountdown(false);
    router.push(`/course/${data.course.slug}/lesson/${data.next.id}`);
  }, [data, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center">
        <p className="text-red-400 mb-4">{error || "Aula não encontrada"}</p>
        <Link
          href={`/course/${params.slug}`}
          className="text-blue-400 hover:text-blue-300 text-sm"
        >
          ← Voltar ao curso
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-5 lg:py-6 max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
      {/* Main content */}
      <div className="min-w-0">
        <div className="relative">
          <VideoPlayer video={data.lesson.video} onEnded={handleEnded} />
          {showCountdown && data.next && (
            <AutoplayCountdown
              nextLessonTitle={data.next.title}
              onComplete={goToNext}
              onCancel={() => setShowCountdown(false)}
            />
          )}
        </div>

        {/* Mobile: botão abrir lista */}
        <div className="lg:hidden mt-4">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-white/5 text-gray-900 dark:text-white rounded-xl text-sm font-medium flex items-center justify-between transition-all duration-200 hover:bg-gray-50 dark:hover:bg-white/5"
          >
            <span>Lista de aulas</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        <div className="mt-6">
          <Link
            href={`/course/${data.course.slug}`}
            className="inline-block text-xs text-blue-500 hover:text-blue-400 font-medium tracking-wide transition-colors duration-200"
          >
            {data.course.title}
          </Link>
          <h1 className="text-xl lg:text-2xl font-semibold tracking-tight text-gray-900 dark:text-white mt-1">
            {data.lesson.title}
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => markCompleted(!data.lesson.completed)}
              disabled={marking}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 ${
                data.lesson.completed
                  ? "bg-gradient-to-b from-emerald-500/15 to-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/20 hover:ring-emerald-500/40"
                  : "bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-sm hover:from-emerald-500 hover:to-emerald-500 hover:shadow"
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                {data.lesson.completed && (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {data.lesson.completed ? "Concluída" : "Marcar como concluída"}
              </span>
            </button>

            {data.prev && (
              <Link
                href={`/course/${data.course.slug}/lesson/${data.prev.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 text-sm font-medium transition-all duration-200"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                Anterior
              </Link>
            )}
            {data.next && (
              <Link
                href={`/course/${data.course.slug}/lesson/${data.next.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 text-sm font-medium transition-all duration-200"
              >
                Próxima
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
              </Link>
            )}
          </div>

          {/* Tabs */}
          <div className="mt-6 border-b border-gray-200 dark:border-white/5 flex gap-6">
            <button
              type="button"
              onClick={() => setActiveTab("description")}
              className={`relative px-0.5 py-2.5 text-sm font-medium transition-colors duration-200 ${
                activeTab === "description"
                  ? "text-gray-900 dark:text-white"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Descrição
              {activeTab === "description" && (
                <span className="absolute inset-x-0 -bottom-px h-[2px] bg-blue-500 rounded-full" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("comments")}
              className={`relative px-0.5 py-2.5 text-sm font-medium transition-colors duration-200 ${
                activeTab === "comments"
                  ? "text-gray-900 dark:text-white"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Comentários
              {activeTab === "comments" && (
                <span className="absolute inset-x-0 -bottom-px h-[2px] bg-blue-500 rounded-full" />
              )}
            </button>
          </div>

          <div className="mt-5">
            {activeTab === "description" ? (
              data.lesson.description ? (
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed whitespace-pre-wrap">
                  {data.lesson.description}
                </p>
              ) : (
                <p className="text-gray-500 text-sm">Sem descrição para esta aula.</p>
              )
            ) : (
              <LessonComments lessonId={data.lesson.id} />
            )}
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <LessonsSidebar
          courseSlug={data.course.slug}
          courseTitle={data.course.title}
          modules={data.course.modules}
          currentLessonId={data.lesson.id}
        />
      </div>

      {/* Mobile sidebar drawer */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-black/70" />
          <div
            className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white dark:bg-gray-950 p-3 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                aria-label="Fechar"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <LessonsSidebar
              courseSlug={data.course.slug}
              courseTitle={data.course.title}
              modules={data.course.modules}
              currentLessonId={data.lesson.id}
            />
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-blue-600 text-white rounded-lg shadow-xl text-sm font-medium animate-in fade-in slide-in-from-bottom-4">
          {toast}
        </div>
      )}
    </div>
  );
}

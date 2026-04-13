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
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
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
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
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
            className="w-full px-4 py-2.5 bg-gray-900 border border-gray-800 text-white rounded-lg text-sm font-medium flex items-center justify-between"
          >
            <span>Lista de aulas</span>
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
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        <div className="mt-6">
          <p className="text-sm text-blue-400 font-medium mb-1">
            {data.course.title}
          </p>
          <h1 className="text-xl lg:text-2xl font-bold text-white mb-2">
            {data.lesson.title}
          </h1>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => markCompleted(!data.lesson.completed)}
              disabled={marking}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                data.lesson.completed
                  ? "bg-green-600/20 text-green-400 border border-green-600/40 hover:bg-green-600/30"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              } disabled:opacity-50`}
            >
              {data.lesson.completed ? "✓ Concluída" : "Marcar como concluída"}
            </button>

            {data.prev && (
              <Link
                href={`/course/${data.course.slug}/lesson/${data.prev.id}`}
                className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium"
              >
                ← Anterior
              </Link>
            )}
            {data.next && (
              <Link
                href={`/course/${data.course.slug}/lesson/${data.next.id}`}
                className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium"
              >
                Próxima →
              </Link>
            )}
          </div>

          {/* Tabs */}
          <div className="mt-6 border-b border-gray-800 flex gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("description")}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                activeTab === "description"
                  ? "border-blue-500 text-white"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              Descrição
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("comments")}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                activeTab === "comments"
                  ? "border-blue-500 text-white"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              Comentários
            </button>
          </div>

          <div className="mt-5">
            {activeTab === "description" ? (
              data.lesson.description ? (
                <p className="text-gray-400 text-sm whitespace-pre-wrap">
                  {data.lesson.description}
                </p>
              ) : (
                <p className="text-gray-500 text-sm">
                  Sem descrição para esta aula.
                </p>
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
            className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-gray-950 p-3 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className="p-2 text-gray-400 hover:text-white"
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

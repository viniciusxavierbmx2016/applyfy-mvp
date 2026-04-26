"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { SkeletonPlayer, SkeletonLessonsSidebar } from "@/components/ui/skeleton";

const VideoPlayer = dynamic(
  () => import("@/components/video-player").then((m) => m.VideoPlayer),
  {
    ssr: false,
    loading: () => (
      <div className="w-full aspect-video bg-black animate-pulse rounded-lg" />
    ),
  }
);
import { AutoplayCountdown } from "@/components/autoplay-countdown";
import { LessonComments } from "@/components/lesson-comments";
import { LessonQuiz } from "@/components/lesson-quiz";
import {
  LessonsSidebar,
  type SidebarModule,
} from "@/components/lessons-sidebar";
import { useUserStore } from "@/stores/user-store";
import type { ParsedVideo } from "@/lib/video";
import { formatPhoneDisplay, formatWhatsappLink } from "@/lib/utils";

interface MaterialData {
  id: string;
  name: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
}

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
    lessonCommentsEnabled?: boolean;
    supportEmail?: string | null;
    supportWhatsapp?: string | null;
    showLessonSupport?: boolean;
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "description" | "comments" | "support"
  >("description");
  const [materials, setMaterials] = useState<MaterialData[]>([]);
  const [reactionData, setReactionData] = useState<{
    enabled: boolean;
    likeCount: number;
    dislikeCount: number;
    userReaction: "LIKE" | "DISLIKE" | null;
  } | null>(null);
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

  useEffect(() => {
    if (!data) return;
    fetch(`/api/lessons/${params.id}/materials`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.materials) setMaterials(d.materials); })
      .catch(() => {});
  }, [data, params.id]);

  useEffect(() => {
    if (!data) return;
    setReactionData(null);
    fetch(`/api/lessons/${params.id}/reaction`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setReactionData(d); })
      .catch(() => {});
  }, [data, params.id]);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  };

  async function handleReaction(type: "LIKE" | "DISLIKE") {
    if (!reactionData?.enabled || !data) return;
    const prev = { ...reactionData };
    const isRemoving = reactionData.userReaction === type;
    const wasOther = reactionData.userReaction !== null && reactionData.userReaction !== type;
    setReactionData({
      ...reactionData,
      userReaction: isRemoving ? null : type,
      likeCount:
        reactionData.likeCount +
        (type === "LIKE" ? (isRemoving ? -1 : 1) : 0) +
        (wasOther && reactionData.userReaction === "LIKE" ? -1 : 0),
      dislikeCount:
        reactionData.dislikeCount +
        (type === "DISLIKE" ? (isRemoving ? -1 : 1) : 0) +
        (wasOther && reactionData.userReaction === "DISLIKE" ? -1 : 0),
    });
    try {
      const res = await fetch(`/api/lessons/${data.lesson.id}/reaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (res.ok) {
        const d = await res.json();
        setReactionData({ ...reactionData, ...d });
      }
    } catch {
      setReactionData(prev);
    }
  }

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
      <div className="flex flex-col h-screen bg-white dark:bg-[#0a0a12]">
        <div className="h-[52px] shrink-0 border-b border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-[#0f0f12]" />
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 lg:p-8">
            <SkeletonPlayer />
          </div>
          <div className="hidden lg:block w-[340px] border-l border-gray-200 dark:border-white/5">
            <SkeletonLessonsSidebar />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col h-screen bg-white dark:bg-[#0a0a12]">
        <div className="h-[52px] shrink-0 border-b border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-[#0f0f12]" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-400 mb-4">{error || "Aula não encontrada"}</p>
            <Link
              href={`/course/${params.slug}`}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              ← Voltar ao curso
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-[#0a0a12]">
      {/* Topbar */}
      <div className="h-[52px] shrink-0 border-b border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-[#0f0f12] flex items-center justify-between px-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/course/${data.course.slug}`}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm font-medium transition-colors shrink-0"
          >
            ← Voltar ao painel
          </Link>
          <span className="hidden sm:block text-gray-300 dark:text-white/10">|</span>
          <p className="hidden sm:block text-sm text-gray-700 dark:text-gray-300 font-medium truncate">
            {data.course.title}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (window.innerWidth < 1024) {
              setMobileSidebarOpen(!mobileSidebarOpen);
            } else {
              setSidebarOpen(!sidebarOpen);
            }
          }}
          className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
          aria-label="Toggle sidebar"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="relative bg-black w-full flex-shrink-0" style={{ maxHeight: "65vh" }}>
            <div className="w-full" style={{ aspectRatio: "16/9", maxHeight: "65vh" }}>
              <VideoPlayer video={data.lesson.video} onEnded={handleEnded} />
            </div>
            {showCountdown && data.next && (
              <AutoplayCountdown
                nextLessonTitle={data.next.title}
                onComplete={goToNext}
                onCancel={() => setShowCountdown(false)}
              />
            )}
          </div>

          <div className="px-4 sm:px-6 lg:px-8 py-5 max-w-[960px]">
            {(() => {
              const currentModule = data.course.modules.find(m => m.lessons.some(l => l.id === data.lesson.id));
              const currentModuleTitle = currentModule?.title || "";
              return (
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <Link href={`/course/${data.course.slug}`} className="text-blue-500 dark:text-blue-400 hover:underline">{data.course.title}</Link>
                      {currentModuleTitle && (
                        <>
                          <span>·</span>
                          <span className="truncate">{currentModuleTitle}</span>
                        </>
                      )}
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                      {data.lesson.title}
                    </h1>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 sm:pt-3">
                    <button
                      type="button"
                      onClick={() => markCompleted(!data.lesson.completed)}
                      disabled={marking}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 disabled:opacity-50 ${
                        data.lesson.completed
                          ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                          : "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:brightness-110"
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {data.lesson.completed ? "Concluída" : "Concluir aula"}
                    </button>

                    {reactionData?.enabled && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleReaction("LIKE")}
                          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm transition-colors ${
                            reactionData.userReaction === "LIKE"
                              ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                              : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={reactionData.userReaction === "LIKE" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                          </svg>
                          {reactionData.likeCount > 0 && (
                            <span className="text-xs tabular-nums">{reactionData.likeCount}</span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReaction("DISLIKE")}
                          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm transition-colors ${
                            reactionData.userReaction === "DISLIKE"
                              ? "bg-red-500/15 text-red-600 dark:text-red-400"
                              : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
                          }`}
                        >
                          <svg className="w-3.5 h-3.5 rotate-180" viewBox="0 0 24 24" fill={reactionData.userReaction === "DISLIKE" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                          </svg>
                          {reactionData.dislikeCount > 0 && (
                            <span className="text-xs tabular-nums">{reactionData.dislikeCount}</span>
                          )}
                        </button>
                      </>
                    )}

                    {(data.prev || data.next) && (
                      <>
                        <div className="w-px h-6 bg-gray-200 dark:bg-white/10 mx-1" />
                        {data.prev && (
                          <Link
                            href={`/course/${data.course.slug}/lesson/${data.prev.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-colors"
                          >
                            ← Anterior
                          </Link>
                        )}
                        {data.next && (
                          <Link
                            href={`/course/${data.course.slug}/lesson/${data.next.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-colors"
                          >
                            Próxima →
                          </Link>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="h-px bg-gray-200 dark:bg-white/5 mb-4" />

            {(() => {
              const commentsEnabled = data.course.lessonCommentsEnabled !== false;
              const supportTabEnabled = data.course.showLessonSupport !== false;
              const hasSupport =
                supportTabEnabled &&
                !!(data.course.supportEmail || data.course.supportWhatsapp);
              const waHref = formatWhatsappLink(data.course.supportWhatsapp);
              const shownTab =
                (activeTab === "comments" && !commentsEnabled) ||
                (activeTab === "support" && !hasSupport)
                  ? "description"
                  : activeTab;
              return (
                <>
                  <div className="mt-6 border-b border-gray-200 dark:border-white/5 flex gap-6">
                    <button
                      type="button"
                      onClick={() => setActiveTab("description")}
                      className={`relative px-0.5 py-2.5 text-sm font-medium transition-colors duration-200 ${
                        shownTab === "description"
                          ? "text-gray-900 dark:text-white"
                          : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                      }`}
                    >
                      Descrição
                      {shownTab === "description" && (
                        <span className="absolute inset-x-0 -bottom-px h-[2px] bg-blue-500 rounded-full" />
                      )}
                    </button>
                    {commentsEnabled && (
                      <button
                        type="button"
                        onClick={() => setActiveTab("comments")}
                        className={`relative px-0.5 py-2.5 text-sm font-medium transition-colors duration-200 ${
                          shownTab === "comments"
                            ? "text-gray-900 dark:text-white"
                            : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                        }`}
                      >
                        Comentários
                        {shownTab === "comments" && (
                          <span className="absolute inset-x-0 -bottom-px h-[2px] bg-blue-500 rounded-full" />
                        )}
                      </button>
                    )}
                    {hasSupport && (
                      <button
                        type="button"
                        onClick={() => setActiveTab("support")}
                        className={`relative inline-flex items-center gap-1.5 px-0.5 py-2.5 text-sm font-medium transition-colors duration-200 ${
                          shownTab === "support"
                            ? "text-gray-900 dark:text-white"
                            : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                          <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                        </svg>
                        Suporte
                        {shownTab === "support" && (
                          <span className="absolute inset-x-0 -bottom-px h-[2px] bg-blue-500 rounded-full" />
                        )}
                      </button>
                    )}
                  </div>

                  <div className="mt-5">
                    {shownTab === "description" && (
                      data.lesson.description ? (
                        <div
                          className="prose-lesson text-sm leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: data.lesson.description }}
                        />
                      ) : (
                        <p className="text-gray-500 text-sm">Sem descrição para esta aula.</p>
                      )
                    )}
                    {shownTab === "comments" && (
                      <LessonComments lessonId={data.lesson.id} />
                    )}
                    {shownTab === "support" && (
                      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                        {data.course.supportEmail && (
                          <a
                            href={`mailto:${data.course.supportEmail}`}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/60 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition"
                          >
                            <span className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 inline-flex items-center justify-center">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            </span>
                            <span className="truncate">{data.course.supportEmail}</span>
                          </a>
                        )}
                        {waHref && (
                          <a
                            href={waHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/60 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition"
                          >
                            <span className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 inline-flex items-center justify-center">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h2.28a1 1 0 01.95.68l1.5 4.49a1 1 0 01-.5 1.21l-1.9.95a11 11 0 005.52 5.52l.95-1.9a1 1 0 011.21-.5l4.49 1.5a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C9.72 21 3 14.28 3 6V5z" />
                              </svg>
                            </span>
                            <span>{formatPhoneDisplay(data.course.supportWhatsapp)}</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}

            {materials.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Downloads
                </h3>
                <div className="space-y-2">
                  {materials.map((mat) => {
                    const icon = getMaterialIcon(mat.fileType);
                    return (
                      <a
                        key={mat.id}
                        href={mat.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-white/5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group"
                      >
                        <span className={`inline-flex items-center justify-center w-9 h-9 rounded-lg text-[10px] font-bold ${icon.color}`}>
                          {icon.label}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{mat.name}</p>
                          <p className="text-xs text-gray-500">{mat.fileName} · {formatFileSize(mat.fileSize)}</p>
                        </div>
                        <span className="text-xs text-blue-500 group-hover:text-blue-400 font-medium shrink-0">Baixar</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            <LessonQuiz lessonId={data.lesson.id} />
          </div>
        </div>

        {/* Desktop sidebar — collapsible */}
        <div
          className={`hidden lg:block border-l border-gray-200 dark:border-white/5 overflow-y-auto transition-all duration-300 ${
            sidebarOpen ? "w-[340px]" : "w-0"
          }`}
        >
          <div className={`${sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"} transition-opacity duration-200 w-[340px]`}>
            <LessonsSidebar
              courseSlug={data.course.slug}
              courseTitle={data.course.title}
              modules={data.course.modules}
              currentLessonId={data.lesson.id}
            />
          </div>
        </div>
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
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getMaterialIcon(type: string): { color: string; label: string } {
  if (type === "application/pdf") return { color: "text-red-500 bg-red-50 dark:bg-red-500/10", label: "PDF" };
  if (type.includes("spreadsheet") || type.includes("excel") || type === "text/csv")
    return { color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10", label: "XLS" };
  if (type.includes("word") || type === "application/msword")
    return { color: "text-blue-500 bg-blue-50 dark:bg-blue-500/10", label: "DOC" };
  if (type.includes("presentation") || type.includes("powerpoint"))
    return { color: "text-orange-500 bg-orange-50 dark:bg-orange-500/10", label: "PPT" };
  if (type.startsWith("image/")) return { color: "text-purple-500 bg-purple-50 dark:bg-purple-500/10", label: "IMG" };
  if (type.startsWith("audio/")) return { color: "text-pink-500 bg-pink-50 dark:bg-pink-500/10", label: "MP3" };
  if (type.startsWith("video/")) return { color: "text-blue-500 bg-blue-50 dark:bg-blue-500/10", label: "MP4" };
  if (type.includes("zip") || type.includes("rar")) return { color: "text-yellow-600 bg-yellow-50 dark:bg-yellow-500/10", label: "ZIP" };
  return { color: "text-gray-500 bg-gray-50 dark:bg-gray-500/10", label: "FILE" };
}

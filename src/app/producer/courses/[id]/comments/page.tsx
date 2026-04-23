"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { CourseEditTabs } from "@/components/course-edit-tabs";
import { formatRelativeTime } from "@/lib/utils";
import { useConfirm } from "@/hooks/use-confirm";

interface LessonOption {
  id: string;
  title: string;
  module: { title: string };
}

interface ReplyItem {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    role: string;
  };
}

interface CommentItem {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    role: string;
  };
  lesson: {
    id: string;
    title: string;
    module: { id: string; title: string };
  };
  replies: ReplyItem[];
}

function RoleBadge({ role }: { role: string }) {
  if (role === "ADMIN")
    return <span className="text-[9px] px-1 rounded bg-blue-600/30 text-blue-300">ADMIN</span>;
  if (role === "PRODUCER")
    return <span className="text-[9px] px-1 rounded bg-purple-600/30 text-purple-300">PRODUTOR</span>;
  if (role === "COLLABORATOR")
    return <span className="text-[9px] px-1 rounded bg-emerald-600/30 text-emerald-300">EQUIPE</span>;
  return null;
}

export default function CourseCommentsPage({
  params,
}: {
  params: { id: string };
}) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [lessons, setLessons] = useState<LessonOption[]>([]);
  const [lessonFilter, setLessonFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseSlug, setCourseSlug] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  useEffect(() => {
    fetch(`/api/courses/${params.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.course) { setCourseTitle(d.course.title); setCourseSlug(d.course.slug); } })
      .catch(() => {});
  }, [params.id]);

  useEffect(() => {
    setLoading(true);
    const qs = lessonFilter ? `?lessonId=${lessonFilter}` : "";
    fetch(`/api/courses/${params.id}/comments${qs}`)
      .then((r) => (r.ok ? r.json() : { comments: [], lessons: [] }))
      .then((d) => {
        setComments(d.comments || []);
        setLessons(d.lessons || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.id, lessonFilter]);

  async function handleReply(commentId: string, lessonId: string) {
    if (!replyText.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyText.trim(), parentId: commentId }),
      });
      if (res.ok) {
        const d = await res.json();
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId
              ? { ...c, replies: [...c.replies, d.comment] }
              : c
          )
        );
        setReplyText("");
        setReplyingTo(null);
        showToast("Resposta enviada");
      } else {
        showToast("Erro ao responder");
      }
    } catch {
      showToast("Erro de rede");
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(commentId: string, lessonId: string, isReply: boolean, parentId?: string) {
    if (!(await confirm({ title: "Excluir comentário", message: "Excluir este comentário?", variant: "danger", confirmText: "Excluir" }))) return;
    try {
      const res = await fetch(
        `/api/lessons/${lessonId}/comments?commentId=${commentId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        if (isReply && parentId) {
          setComments((prev) =>
            prev.map((c) =>
              c.id === parentId
                ? { ...c, replies: c.replies.filter((r) => r.id !== commentId) }
                : c
            )
          );
        } else {
          setComments((prev) => prev.filter((c) => c.id !== commentId));
        }
        showToast("Comentário excluído");
      } else {
        showToast("Erro ao excluir");
      }
    } catch {
      showToast("Erro de rede");
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <Link
          href="/producer/courses"
          className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
              {courseTitle || "Curso"}
            </h1>
            {courseSlug && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                /{courseSlug}
              </p>
            )}
          </div>
          {courseSlug && (
            <a
              href={`/course/${courseSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 bg-transparent dark:bg-[#1a1e2e] border border-gray-300 dark:border-[#1f2335] hover:bg-gray-100 dark:hover:bg-[#1f2335] text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl transition flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Pré-visualizar
            </a>
          )}
        </div>
      </div>

      <CourseEditTabs courseId={params.id} active="comments" />

      <div className="mb-4">
        <select
          value={lessonFilter}
          onChange={(e) => setLessonFilter(e.target.value)}
          className="bg-white dark:bg-[#0f1320] border border-gray-200 dark:border-[#1a1e2e] rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 w-full sm:w-auto sm:min-w-[280px]"
        >
          <option value="">Todas as aulas</option>
          {lessons.map((l) => (
            <option key={l.id} value={l.id}>
              {l.module.title} → {l.title}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-[#0a0e19] border border-gray-200 dark:border-[#1a1e2e] rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-[#1a1e2e] animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-3 w-2/3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="bg-white dark:bg-[#0a0e19] border border-gray-200 dark:border-[#1a1e2e] rounded-xl p-8 text-center">
          <p className="text-gray-500 text-sm">
            {lessonFilter ? "Nenhum comentário nesta aula." : "Nenhum comentário neste curso ainda."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div
              key={c.id}
              className="bg-white dark:bg-[#0a0e19] border border-gray-200 dark:border-[#1a1e2e] rounded-xl p-4"
            >
              <div className="flex items-start gap-3">
                <Avatar src={c.user.avatarUrl} name={c.user.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {c.user.name}
                    </span>
                    <RoleBadge role={c.user.role} />
                    <span className="text-xs text-gray-500">
                      {formatRelativeTime(new Date(c.createdAt))}
                    </span>
                  </div>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {c.lesson.module.title} → {c.lesson.title}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 whitespace-pre-wrap break-words">
                    {c.content}
                  </p>

                  <div className="flex items-center gap-3 mt-2">
                    <button
                      onClick={() => {
                        setReplyingTo(replyingTo === c.id ? null : c.id);
                        setReplyText("");
                      }}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                    >
                      Responder
                    </button>
                    <button
                      onClick={() => handleDelete(c.id, c.lesson.id, false)}
                      className="text-xs text-red-500 hover:text-red-400 font-medium"
                    >
                      Excluir
                    </button>
                  </div>

                  {replyingTo === c.id && (
                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleReply(c.id, c.lesson.id)}
                        placeholder="Escreva sua resposta..."
                        className="flex-1 min-w-0 px-3 py-2 bg-gray-100 dark:bg-[#0f1320] border border-gray-300 dark:border-[#1a1e2e] rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
                        autoFocus
                      />
                      <button
                        onClick={() => handleReply(c.id, c.lesson.id)}
                        disabled={sending || !replyText.trim()}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
                      >
                        {sending ? "..." : "Enviar"}
                      </button>
                      <button
                        onClick={() => { setReplyingTo(null); setReplyText(""); }}
                        className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {c.replies.length > 0 && (
                <div className="ml-12 mt-3 space-y-2 border-l-2 border-gray-200 dark:border-[#1a1e2e] pl-4">
                  {c.replies.map((r) => (
                    <div key={r.id} className="flex items-start gap-2">
                      <Avatar src={r.user.avatarUrl} name={r.user.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {r.user.name}
                          </span>
                          <RoleBadge role={r.user.role} />
                          <span className="text-xs text-gray-500">
                            {formatRelativeTime(new Date(r.createdAt))}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap break-words">
                          {r.content}
                        </p>
                        <button
                          onClick={() => handleDelete(r.id, c.lesson.id, true, c.id)}
                          className="text-xs text-red-500 hover:text-red-400 font-medium mt-1"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-indigo-600 text-white rounded-xl shadow-xl text-sm font-medium">
          {toast}
        </div>
      )}
      <ConfirmDialog />
    </div>
  );
}

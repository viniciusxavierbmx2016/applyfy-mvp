"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { CourseEditTabs } from "@/components/course-edit-tabs";
import { formatRelativeTime } from "@/lib/utils";

interface LessonOption {
  id: string;
  title: string;
  module: { title: string };
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
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  useEffect(() => {
    fetch(`/api/courses/${params.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.course && setCourseTitle(d.course.title))
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

  async function handleReply(lessonId: string) {
    if (!replyText.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyText.trim() }),
      });
      if (res.ok) {
        const d = await res.json();
        setComments((prev) => [
          {
            ...d.comment,
            lesson: comments.find((c) => c.lesson.id === lessonId)?.lesson ?? {
              id: lessonId,
              title: "",
              module: { id: "", title: "" },
            },
          },
          ...prev,
        ]);
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

  return (
    <div className="max-w-4xl mx-auto">
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
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white truncate">
          {courseTitle || "Curso"}
        </h1>
      </div>

      <CourseEditTabs courseId={params.id} active="comments" />

      <div className="mb-4">
        <select
          value={lessonFilter}
          onChange={(e) => setLessonFilter(e.target.value)}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 w-full sm:w-auto sm:min-w-[280px]"
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
            <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse shrink-0" />
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
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-500 text-sm">
            {lessonFilter ? "Nenhum comentário nesta aula." : "Nenhum comentário neste curso ainda."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div
              key={c.id}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4"
            >
              <div className="flex items-start gap-3">
                <Avatar src={c.user.avatarUrl} name={c.user.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {c.user.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatRelativeTime(new Date(c.createdAt))}
                    </span>
                  </div>
                  <p className="text-xs text-primary-600 dark:text-primary-400 mt-0.5">
                    {c.lesson.module.title} → {c.lesson.title}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 whitespace-pre-wrap break-words">
                    {c.content}
                  </p>

                  {replyingTo === c.id ? (
                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleReply(c.lesson.id)}
                        placeholder="Escreva sua resposta..."
                        className="flex-1 min-w-0 px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                        autoFocus
                      />
                      <button
                        onClick={() => handleReply(c.lesson.id)}
                        disabled={sending || !replyText.trim()}
                        className="px-3 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
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
                  ) : (
                    <button
                      onClick={() => setReplyingTo(c.id)}
                      className="mt-2 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                    >
                      Responder
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-primary-600 text-white rounded-lg shadow-xl text-sm font-medium">
          {toast}
        </div>
      )}
    </div>
  );
}

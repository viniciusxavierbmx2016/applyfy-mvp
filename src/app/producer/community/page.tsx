"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { formatRelativeTime } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { useConfirm } from "@/hooks/use-confirm";

interface AdminPost {
  id: string;
  content: string;
  type: "QUESTION" | "RESULT" | "FEEDBACK" | "FREE";
  pinned: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
    role: "STUDENT" | "ADMIN";
  };
  course: { id: string; title: string; slug: string };
  _count: { likes: number; comments: number };
}

interface CourseOption {
  id: string;
  title: string;
  slug: string;
}

const typeLabels: Record<AdminPost["type"], { label: string; color: string }> =
  {
    QUESTION: { label: "Dúvida", color: "bg-yellow-500/20 text-yellow-400" },
    RESULT: { label: "Resultado", color: "bg-green-500/20 text-green-400" },
    FEEDBACK: { label: "Feedback", color: "bg-purple-500/20 text-purple-400" },
    FREE: { label: "Livre", color: "bg-blue-500/20 text-blue-400" },
  };

export default function AdminCommunityPage() {
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [courseFilter, setCourseFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const { confirm, ConfirmDialog } = useConfirm();

  async function load(courseId: string) {
    setLoading(true);
    try {
      const url = courseId
        ? `/api/producer/community?courseId=${courseId}`
        : "/api/producer/community";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts);
        setCourses(data.courses);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(courseFilter);
  }, [courseFilter]);

  async function togglePin(id: string) {
    const res = await fetch(`/api/posts/${id}/pin`, { method: "POST" });
    if (res.ok) {
      const body = await res.json();
      setPosts((prev) => {
        const next = prev.map((p) =>
          p.id === id ? { ...p, pinned: body.pinned } : p
        );
        next.sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
        return next;
      });
    }
  }

  async function deletePost(id: string) {
    if (!(await confirm({ title: "Excluir post", message: "Excluir este post?", variant: "danger", confirmText: "Excluir" }))) return;
    const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPosts((prev) => prev.filter((p) => p.id !== id));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Moderação da Comunidade
        </h1>
        <select
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className="bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition"
        >
          <option value="">Todos os cursos</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/[0.06] animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 bg-gray-200 dark:bg-white/[0.06] rounded animate-pulse" />
                  <div className="h-3 w-48 bg-gray-200 dark:bg-white/[0.06] rounded animate-pulse" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full bg-gray-200 dark:bg-white/[0.06] rounded animate-pulse" />
                <div className="h-3 w-2/3 bg-gray-200 dark:bg-white/[0.06] rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-10 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-indigo-500/10 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">Nenhum post na comunidade ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const typeMeta = typeLabels[post.type];
            return (
              <div
                key={post.id}
                className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-4"
              >
                <div className="flex items-start gap-3 mb-2">
                  <Avatar
                    src={post.user.avatarUrl}
                    name={post.user.name}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-gray-900 dark:text-white font-medium text-sm">
                        {post.user.name}
                      </span>
                      {post.user.role === "ADMIN" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600/30 text-blue-300">
                          ADMIN
                        </span>
                      )}
                      {post.pinned && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                          📌 Fixado
                        </span>
                      )}
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${typeMeta.color}`}
                      >
                        {typeMeta.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      <Link
                        href={`/course/${post.course.slug}/community`}
                        className="hover:text-gray-900 dark:hover:text-white"
                      >
                        {post.course.title}
                      </Link>
                      {" · "}
                      {formatRelativeTime(new Date(post.createdAt))}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => togglePin(post.id)}
                      title={post.pinned ? "Desafixar" : "Fixar"}
                      className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-amber-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                    >
                      📌
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePost(post.id)}
                      title="Excluir"
                      className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V4a2 2 0 012-2h4a2 2 0 012 2v3"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                <div
                  className="post-content text-sm text-gray-800 dark:text-gray-200 break-words"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }}
                />
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                  <span>❤️ {post._count.likes}</span>
                  <span>💬 {post._count.comments}</span>
                  <Link
                    href={`/course/${post.course.slug}/community`}
                    className="text-indigo-400 hover:text-indigo-300 ml-auto"
                  >
                    Responder →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <ConfirmDialog />
    </div>
  );
}

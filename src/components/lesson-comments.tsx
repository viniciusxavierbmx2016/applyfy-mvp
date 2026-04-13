"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { formatRelativeTime } from "@/lib/utils";

interface LessonCommentUser {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: "STUDENT" | "ADMIN";
}

interface LessonCommentItem {
  id: string;
  content: string;
  createdAt: string;
  user: LessonCommentUser;
}

export function LessonComments({ lessonId }: { lessonId: string }) {
  const [comments, setComments] = useState<LessonCommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/lessons/${lessonId}/comments`)
      .then((r) => (r.ok ? r.json() : { comments: [] }))
      .then((d) => {
        if (!cancelled) setComments(d.comments || []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const body = await res.json();
        setComments((prev) => [body.comment, ...prev]);
        setContent("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <form onSubmit={submit} className="mb-5">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Deixe uma dúvida ou comentário sobre a aula..."
          rows={3}
          maxLength={1000}
          className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-blue-500 resize-none"
        />
        <div className="mt-2 flex justify-end">
          <button
            type="submit"
            disabled={!content.trim() || submitting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
          >
            {submitting ? "Enviando..." : "Comentar"}
          </button>
        </div>
      </form>

      {loading ? (
        <p className="text-sm text-gray-500">Carregando...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-500">
          Nenhum comentário ainda. Seja o primeiro!
        </p>
      ) : (
        <ul className="space-y-4">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <Avatar src={c.user.avatarUrl} name={c.user.name} size="sm" />
              <div className="flex-1 bg-gray-800/60 rounded-lg px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {c.user.name}
                  </span>
                  {c.user.role === "ADMIN" && (
                    <span className="text-[9px] px-1 rounded bg-blue-600/30 text-blue-300">
                      ADMIN
                    </span>
                  )}
                  <span className="text-[10px] text-gray-500">
                    {formatRelativeTime(new Date(c.createdAt))}
                  </span>
                </div>
                <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words mt-1">
                  {c.content}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

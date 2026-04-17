"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { formatRelativeTime } from "@/lib/utils";

interface LessonCommentUser {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: string;
}

interface LessonCommentItem {
  id: string;
  content: string;
  createdAt: string;
  user: LessonCommentUser;
  replies?: LessonCommentItem[];
}

function RoleBadge({ role }: { role: string }) {
  if (role === "ADMIN") {
    return (
      <span className="text-[9px] px-1 rounded bg-blue-600/30 text-blue-300">
        ADMIN
      </span>
    );
  }
  if (role === "PRODUCER") {
    return (
      <span className="text-[9px] px-1 rounded bg-purple-600/30 text-purple-300">
        PRODUTOR
      </span>
    );
  }
  if (role === "COLLABORATOR") {
    return (
      <span className="text-[9px] px-1 rounded bg-emerald-600/30 text-emerald-300">
        EQUIPE
      </span>
    );
  }
  return null;
}

function CommentBubble({
  comment,
  lessonId,
  onReplyAdded,
  indent = false,
}: {
  comment: LessonCommentItem;
  lessonId: string;
  onReplyAdded: (reply: LessonCommentItem, parentId: string) => void;
  indent?: boolean;
}) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitReply() {
    if (!replyText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyText.trim(), parentId: comment.id }),
      });
      if (res.ok) {
        const d = await res.json();
        onReplyAdded(d.comment, comment.id);
        setReplyText("");
        setShowReply(false);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <li className={indent ? "ml-10" : ""}>
      <div className="flex gap-3">
        <Avatar src={comment.user.avatarUrl} name={comment.user.name} size="sm" />
        <div className="flex-1 bg-gray-800/60 rounded-lg px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {comment.user.name}
            </span>
            <RoleBadge role={comment.user.role} />
            <span className="text-[10px] text-gray-500">
              {formatRelativeTime(new Date(comment.createdAt))}
            </span>
          </div>
          <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words mt-1">
            {comment.content}
          </p>
          {!indent && (
            <button
              type="button"
              onClick={() => setShowReply(!showReply)}
              className="mt-1 text-xs text-blue-400 hover:text-blue-300"
            >
              Responder
            </button>
          )}
          {showReply && (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitReply()}
                placeholder="Sua resposta..."
                className="flex-1 min-w-0 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <button
                onClick={submitReply}
                disabled={submitting || !replyText.trim()}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg disabled:opacity-50"
              >
                {submitting ? "..." : "Enviar"}
              </button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
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
        setComments((prev) => [{ ...body.comment, replies: [] }, ...prev]);
        setContent("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleReplyAdded(reply: LessonCommentItem, parentId: string) {
    setComments((prev) =>
      prev.map((c) =>
        c.id === parentId
          ? { ...c, replies: [...(c.replies || []), reply] }
          : c
      )
    );
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
            <div key={c.id} className="space-y-2">
              <CommentBubble
                comment={c}
                lessonId={lessonId}
                onReplyAdded={handleReplyAdded}
              />
              {c.replies?.map((r) => (
                <CommentBubble
                  key={r.id}
                  comment={r}
                  lessonId={lessonId}
                  onReplyAdded={handleReplyAdded}
                  indent
                />
              ))}
            </div>
          ))}
        </ul>
      )}
    </div>
  );
}

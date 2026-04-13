"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { formatRelativeTime } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/sanitize-html";

export interface PostAuthor {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: "STUDENT" | "ADMIN";
}

export interface PostItem {
  id: string;
  content: string;
  type: "QUESTION" | "RESULT" | "FEEDBACK" | "FREE";
  pinned: boolean;
  createdAt: string;
  user: PostAuthor;
  liked: boolean;
  likeCount: number;
  commentCount: number;
}

export interface CommentItem {
  id: string;
  content: string;
  createdAt: string;
  user: PostAuthor;
}

const typeLabels: Record<PostItem["type"], { label: string; color: string }> = {
  QUESTION: { label: "Dúvida", color: "bg-yellow-500/20 text-yellow-400" },
  RESULT: { label: "Resultado", color: "bg-green-500/20 text-green-400" },
  FEEDBACK: { label: "Feedback", color: "bg-purple-500/20 text-purple-400" },
  FREE: { label: "Livre", color: "bg-blue-500/20 text-blue-400" },
};

interface Props {
  post: PostItem;
  isAdmin: boolean;
  currentUserId: string;
  onUpdate: (post: PostItem) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
}

export function PostCard({
  post,
  isAdmin,
  currentUserId,
  onUpdate,
  onDelete,
  onTogglePin,
}: Props) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentItem[] | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);

  async function toggleComments() {
    const next = !showComments;
    setShowComments(next);
    if (next && comments === null) {
      setLoadingComments(true);
      try {
        const res = await fetch(`/api/posts/${post.id}/comments`);
        if (res.ok) {
          const data = await res.json();
          setComments(data.comments);
        }
      } finally {
        setLoadingComments(false);
      }
    }
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim() || posting) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments((prev) => [...(prev ?? []), data.comment]);
        setNewComment("");
        onUpdate({ ...post, commentCount: post.commentCount + 1 });
      }
    } finally {
      setPosting(false);
    }
  }

  async function toggleLike() {
    if (likeBusy) return;
    setLikeBusy(true);
    // optimistic
    const prev = { liked: post.liked, likeCount: post.likeCount };
    onUpdate({
      ...post,
      liked: !post.liked,
      likeCount: post.likeCount + (post.liked ? -1 : 1),
    });
    try {
      const res = await fetch(`/api/posts/${post.id}/like`, {
        method: "POST",
      });
      if (!res.ok) {
        onUpdate({ ...post, ...prev });
      } else {
        const data = await res.json();
        onUpdate({ ...post, liked: data.liked, likeCount: data.likeCount });
      }
    } catch {
      onUpdate({ ...post, ...prev });
    } finally {
      setLikeBusy(false);
    }
  }

  const canDelete = isAdmin || post.user.id === currentUserId;
  const typeMeta = typeLabels[post.type];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-5">
      <div className="flex items-start gap-3 mb-3">
        <Avatar src={post.user.avatarUrl} name={post.user.name} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-white font-medium text-sm">
              {post.user.name}
            </span>
            {post.user.role === "ADMIN" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600/30 text-blue-300">
                ADMIN
              </span>
            )}
            {post.pinned && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 inline-flex items-center gap-1">
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
            {formatRelativeTime(new Date(post.createdAt))}
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => onTogglePin(post.id)}
              title={post.pinned ? "Desafixar" : "Fixar"}
              className="p-1.5 text-gray-400 hover:text-amber-400 hover:bg-gray-800 rounded"
            >
              📌
            </button>
          </div>
        )}
        {canDelete && (
          <button
            type="button"
            onClick={() => {
              if (confirm("Excluir este post?")) onDelete(post.id);
            }}
            title="Excluir"
            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded flex-shrink-0"
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
        )}
      </div>

      <div
        className="post-content text-gray-200 text-sm break-words mb-3"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }}
      />

      <div className="flex items-center gap-4 border-t border-gray-800 pt-3">
        <button
          type="button"
          onClick={toggleLike}
          disabled={likeBusy}
          className={`flex items-center gap-1.5 text-sm transition ${
            post.liked
              ? "text-red-400"
              : "text-gray-400 hover:text-red-400"
          } disabled:opacity-50`}
        >
          <svg
            className="w-4 h-4"
            fill={post.liked ? "currentColor" : "none"}
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          <span>{post.likeCount}</span>
        </button>
        <button
          type="button"
          onClick={toggleComments}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition"
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
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span>{post.commentCount}</span>
        </button>
      </div>

      {showComments && (
        <div className="mt-4 space-y-3">
          {loadingComments ? (
            <p className="text-xs text-gray-500">Carregando...</p>
          ) : (
            <>
              {comments && comments.length > 0 ? (
                <div className="space-y-3">
                  {comments.map((c) => (
                    <div key={c.id} className="flex gap-2">
                      <Avatar
                        src={c.user.avatarUrl}
                        name={c.user.name}
                        size="sm"
                      />
                      <div className="flex-1 bg-gray-800/60 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-white">
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
                        <p className="text-sm text-gray-200 whitespace-pre-wrap break-words mt-0.5">
                          {c.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">Nenhum comentário ainda.</p>
              )}

              <form onSubmit={submitComment} className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Escreva um comentário..."
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || posting}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                >
                  Enviar
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}

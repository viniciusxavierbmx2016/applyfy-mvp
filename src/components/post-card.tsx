"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Avatar } from "@/components/ui/avatar";
import { formatRelativeTime } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { useConfirm } from "@/hooks/use-confirm";

const RichTextEditor = dynamic(
  () => import("@/components/rich-text-editor"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[80px] rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 animate-pulse" />
    ),
  }
);

function htmlIsEmpty(html: string) {
  return !html.replace(/<[^>]*>/g, "").trim();
}

export interface PostAuthor {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: "STUDENT" | "ADMIN" | "PRODUCER" | "COLLABORATOR";
}

export interface PostItem {
  id: string;
  content: string;
  type: "QUESTION" | "RESULT" | "FEEDBACK" | "FREE";
  pinned: boolean;
  status?: string;
  createdAt: string;
  user: PostAuthor;
  liked: boolean;
  likeCount: number;
  commentCount: number;
  group?: { id: string; name: string; slug: string; permission: string } | null;
}

export interface CommentItem {
  id: string;
  content: string;
  status?: string;
  createdAt: string;
  user: PostAuthor;
  parentId?: string | null;
  replies?: CommentItem[];
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
  isProducer?: boolean;
  currentUserId: string;
  onUpdate: (post: PostItem) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  onDeleteComment?: (postId: string, commentId: string) => void;
}

export function PostCard({
  post,
  isAdmin,
  isProducer = false,
  currentUserId,
  onUpdate,
  onDelete,
  onTogglePin,
  onDeleteComment,
}: Props) {
  const isModerator = isAdmin || isProducer;
  const { confirm, ConfirmDialog } = useConfirm();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentItem[] | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);

  // Reply state
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [postingReply, setPostingReply] = useState(false);

  // Edit post state
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [savingEdit, setSavingEdit] = useState(false);

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
    if (htmlIsEmpty(newComment) || posting) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments((prev) => [...(prev ?? []), { ...data.comment, replies: [] }]);
        setNewComment("");
        onUpdate({ ...post, commentCount: post.commentCount + 1 });
      }
    } finally {
      setPosting(false);
    }
  }

  async function submitReply(parentId: string) {
    if (htmlIsEmpty(replyContent) || postingReply) return;
    setPostingReply(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyContent, parentId }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments((prev) =>
          (prev ?? []).map((c) =>
            c.id === parentId
              ? { ...c, replies: [...(c.replies ?? []), data.comment] }
              : c
          )
        );
        setReplyContent("");
        setReplyingTo(null);
        onUpdate({ ...post, commentCount: post.commentCount + 1 });
      }
    } finally {
      setPostingReply(false);
    }
  }

  async function deleteComment(commentId: string, parentId?: string | null) {
    if (
      !(await confirm({
        title: "Excluir comentário",
        message: "Excluir este comentário?",
        variant: "danger",
        confirmText: "Excluir",
      }))
    )
      return;
    const res = await fetch(`/api/posts/${post.id}/comments/${commentId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      if (parentId) {
        setComments((prev) =>
          (prev ?? []).map((c) =>
            c.id === parentId
              ? { ...c, replies: (c.replies ?? []).filter((r) => r.id !== commentId) }
              : c
          )
        );
      } else {
        setComments((prev) => (prev ?? []).filter((x) => x.id !== commentId));
      }
      onUpdate({ ...post, commentCount: Math.max(0, post.commentCount - 1) });
      onDeleteComment?.(post.id, commentId);
    }
  }

  async function toggleLike() {
    if (likeBusy) return;
    setLikeBusy(true);
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

  async function saveEdit() {
    if (htmlIsEmpty(editContent) || savingEdit) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdate({
          ...post,
          content: data.post.content,
          likeCount: data.post._count.likes,
          commentCount: data.post._count.comments,
          group: data.post.group,
        });
        setEditing(false);
      }
    } finally {
      setSavingEdit(false);
    }
  }

  const canDelete = isModerator || post.user.id === currentUserId;
  const canEdit = isModerator || post.user.id === currentUserId;
  const typeMeta = typeLabels[post.type];

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 sm:p-5">
      <div className="flex items-start gap-3 mb-3">
        <Avatar src={post.user.avatarUrl} name={post.user.name} size="md" />
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
            {post.user.role === "PRODUCER" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-600/30 text-amber-300">
                PRODUTOR
              </span>
            )}
            {post.pinned && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 inline-flex items-center gap-1">
                Fixado
              </span>
            )}
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded ${typeMeta.color}`}
            >
              {typeMeta.label}
            </span>
            {post.group && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400">
                {post.group.name}
              </span>
            )}
            {post.status === "PENDING" && (
              <span className="px-2 py-0.5 text-[10px] bg-amber-500/15 text-amber-500 rounded-full">
                Aguardando aprovação
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">
            {formatRelativeTime(new Date(post.createdAt))}
          </p>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {isModerator && (
            <button
              type="button"
              onClick={() => onTogglePin(post.id)}
              title={post.pinned ? "Desafixar" : "Fixar"}
              className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-amber-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setEditContent(post.content);
                setEditing(true);
              }}
              title="Editar"
              className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={async () => {
                const ok = await confirm({
                  title: "Excluir post",
                  message: "Excluir este post?",
                  variant: "danger",
                  confirmText: "Excluir",
                });
                if (ok) onDelete(post.id);
              }}
              title="Excluir"
              className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V4a2 2 0 012-2h4a2 2 0 012 2v3" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Post content or edit mode */}
      {editing ? (
        <div className="mb-3 space-y-2">
          <RichTextEditor
            value={editContent}
            onChange={setEditContent}
            placeholder="Edite seu post..."
            minHeight="100px"
          />
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={saveEdit}
              disabled={htmlIsEmpty(editContent) || savingEdit}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {savingEdit ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      ) : (
        <div
          className="post-content text-gray-800 dark:text-gray-200 text-sm break-words mb-3"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }}
        />
      )}

      <div className="flex items-center gap-4 border-t border-gray-200 dark:border-gray-800 pt-3">
        <button
          type="button"
          onClick={toggleLike}
          disabled={likeBusy}
          className={`flex items-center gap-1.5 text-sm transition ${
            post.liked
              ? "text-red-400"
              : "text-gray-600 dark:text-gray-400 hover:text-red-400"
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
          className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
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
                    <div key={c.id}>
                      <CommentBlock
                        comment={c}
                        isModerator={isModerator}
                        currentUserId={currentUserId}
                        onDelete={(id) => deleteComment(id, null)}
                        onReply={() => {
                          setReplyingTo(replyingTo === c.id ? null : c.id);
                          setReplyContent("");
                        }}
                      />
                      {/* Replies */}
                      {c.replies && c.replies.length > 0 && (
                        <div className="ml-8 mt-2 space-y-2 border-l-2 border-gray-200 dark:border-gray-800 pl-3">
                          {c.replies.map((r) => (
                            <CommentBlock
                              key={r.id}
                              comment={r}
                              isModerator={isModerator}
                              currentUserId={currentUserId}
                              onDelete={(id) => deleteComment(id, c.id)}
                              isReply
                            />
                          ))}
                        </div>
                      )}
                      {/* Reply input */}
                      {replyingTo === c.id && (
                        <div className="ml-8 mt-2 space-y-2">
                          <RichTextEditor
                            value={replyContent}
                            onChange={setReplyContent}
                            placeholder="Escreva uma resposta..."
                            minHeight="80px"
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => setReplyingTo(null)}
                              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => submitReply(c.id)}
                              disabled={htmlIsEmpty(replyContent) || postingReply}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                            >
                              {postingReply ? "Enviando..." : "Responder"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">Nenhum comentário ainda.</p>
              )}

              <form onSubmit={submitComment} className="space-y-2">
                <RichTextEditor
                  value={newComment}
                  onChange={setNewComment}
                  placeholder="Escreva um comentário..."
                  minHeight="100px"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={htmlIsEmpty(newComment) || posting}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                  >
                    {posting ? "Enviando..." : "Enviar"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}
      <ConfirmDialog />
    </div>
  );
}

/* ───── Comment Block ───── */

function CommentBlock({
  comment: c,
  isModerator,
  currentUserId,
  onDelete,
  onReply,
  isReply,
}: {
  comment: CommentItem;
  isModerator: boolean;
  currentUserId: string;
  onDelete: (id: string) => void;
  onReply?: () => void;
  isReply?: boolean;
}) {
  const canDeleteComment = isModerator || c.user.id === currentUserId;

  return (
    <div className="flex gap-2">
      <Avatar
        src={c.user.avatarUrl}
        name={c.user.name}
        size="sm"
      />
      <div className="flex-1 bg-gray-100 dark:bg-gray-800/60 rounded-lg px-3 py-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-900 dark:text-white">
            {c.user.name}
          </span>
          {c.user.role === "ADMIN" && (
            <span className="text-[9px] px-1 rounded bg-blue-600/30 text-blue-300">
              ADMIN
            </span>
          )}
          {c.user.role === "PRODUCER" && (
            <span className="text-[9px] px-1 rounded bg-amber-600/30 text-amber-300">
              PRODUTOR
            </span>
          )}
          <span className="text-[10px] text-gray-500">
            {formatRelativeTime(new Date(c.createdAt))}
          </span>
          {c.status === "PENDING" && (
            <span className="px-2 py-0.5 text-[10px] bg-amber-500/15 text-amber-500 rounded-full">
              Aguardando aprovação
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            {!isReply && onReply && (
              <button
                type="button"
                onClick={onReply}
                className="text-[10px] text-gray-500 hover:text-blue-400"
              >
                Responder
              </button>
            )}
            {canDeleteComment && (
              <button
                type="button"
                onClick={() => onDelete(c.id)}
                className="text-[10px] text-gray-500 hover:text-red-400"
                title="Excluir"
              >
                Excluir
              </button>
            )}
          </div>
        </div>
        <div
          className="post-content text-sm text-gray-800 dark:text-gray-200 break-words mt-0.5"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.content) }}
        />
      </div>
    </div>
  );
}

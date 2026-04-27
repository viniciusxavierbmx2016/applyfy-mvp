"use client";

import { useEffect, useState, useCallback } from "react";
import { Avatar } from "@/components/ui/avatar";
import { formatRelativeTime } from "@/lib/utils";
import { useConfirm } from "@/hooks/use-confirm";
import { CustomSelect } from "@/components/custom-select";

interface LessonOption {
  id: string;
  title: string;
  module: { title: string };
}

interface ReplyItem {
  id: string;
  content: string;
  status?: string;
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
  status?: string;
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

function StatusBadge({ status }: { status?: string }) {
  if (status === "PENDING")
    return <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-500/15 text-amber-500 rounded-full">Pendente</span>;
  if (status === "REJECTED")
    return <span className="px-2 py-0.5 text-[10px] font-medium bg-red-500/15 text-red-500 rounded-full">Rejeitado</span>;
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
  const [statusFilter, setStatusFilter] = useState<"all" | "PENDING">("all");
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { confirm, ConfirmDialog } = useConfirm();

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  const fetchComments = useCallback(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (lessonFilter) qs.set("lessonId", lessonFilter);
    if (statusFilter === "PENDING") qs.set("status", "PENDING");
    const queryString = qs.toString() ? `?${qs.toString()}` : "";
    fetch(`/api/courses/${params.id}/comments${queryString}`)
      .then((r) => (r.ok ? r.json() : { comments: [], lessons: [], pendingCount: 0 }))
      .then((d) => {
        setComments(d.comments || []);
        setLessons(d.lessons || []);
        setPendingCount(d.pendingCount || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.id, lessonFilter, statusFilter]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

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

  async function handleModerate(id: string, action: "approve" | "reject") {
    try {
      const res = await fetch("/api/producer/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ type: "lesson_comment", id }], action }),
      });
      if (res.ok) {
        showToast(action === "approve" ? "Comentário aprovado" : "Comentário rejeitado");
        fetchComments();
        setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
      } else {
        showToast("Erro ao moderar");
      }
    } catch {
      showToast("Erro de rede");
    }
  }

  async function handleBulkApprove() {
    if (selected.size === 0) return;
    try {
      const res = await fetch("/api/producer/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: Array.from(selected).map((id) => ({ type: "lesson_comment", id })),
          action: "approve",
        }),
      });
      if (res.ok) {
        showToast(`${selected.size} comentário(s) aprovado(s)`);
        setSelected(new Set());
        fetchComments();
      } else {
        showToast("Erro ao aprovar");
      }
    } catch {
      showToast("Erro de rede");
    }
  }

  const pendingComments = comments.filter((c) => c.status === "PENDING");
  const allPendingSelected = pendingComments.length > 0 && pendingComments.every((c) => selected.has(c.id));

  function toggleSelectAll() {
    if (allPendingSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingComments.map((c) => c.id)));
    }
  }

  const tabClass = (tab: string) =>
    `px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
      (tab === "all" && statusFilter === "all") || (tab === "PENDING" && statusFilter === "PENDING")
        ? "border-blue-500 text-blue-600 dark:text-blue-400"
        : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
    }`;

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <CustomSelect
          value={lessonFilter}
          onChange={setLessonFilter}
          className="w-full sm:w-auto sm:min-w-[280px]"
          options={[
            { value: "", label: "Todas as aulas" },
            ...lessons.map((l) => ({ value: l.id, label: `${l.module.title} → ${l.title}` })),
          ]}
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-gray-200 dark:border-white/5 mb-4">
        <button type="button" onClick={() => { setStatusFilter("all"); setSelected(new Set()); }} className={tabClass("all")}>
          Todos
        </button>
        <button type="button" onClick={() => { setStatusFilter("PENDING"); setSelected(new Set()); }} className={tabClass("PENDING")}>
          Aguardando aprovação
          {pendingCount > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/15 text-amber-500 rounded-full">
              {pendingCount}
            </span>
          )}
        </button>

        {selected.size > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={handleBulkApprove}
              className="px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
            >
              Aprovar {selected.size} selecionado(s)
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-white/5 animate-pulse shrink-0" />
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
        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl p-8 text-center">
          <p className="text-gray-500 text-sm">
            {statusFilter === "PENDING"
              ? "Nenhum comentário aguardando aprovação."
              : lessonFilter
                ? "Nenhum comentário nesta aula."
                : "Nenhum comentário neste curso ainda."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Select all header for pending tab */}
          {statusFilter === "PENDING" && pendingComments.length > 0 && (
            <div className="flex items-center gap-2 px-1">
              <input
                type="checkbox"
                checked={allPendingSelected}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-500">Selecionar todos</span>
            </div>
          )}

          {comments.map((c) => (
            <div
              key={c.id}
              className={`bg-white dark:bg-white/5 border rounded-xl p-4 ${
                c.status === "PENDING"
                  ? "border-amber-300 dark:border-amber-500/30"
                  : "border-gray-200 dark:border-white/5"
              }`}
            >
              <div className="flex items-start gap-3">
                {c.status === "PENDING" && (
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => {
                      setSelected((prev) => {
                        const n = new Set(prev);
                        if (n.has(c.id)) n.delete(c.id); else n.add(c.id);
                        return n;
                      });
                    }}
                    className="w-4 h-4 mt-2.5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 shrink-0"
                  />
                )}
                <Avatar src={c.user.avatarUrl} name={c.user.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {c.user.name}
                    </span>
                    <RoleBadge role={c.user.role} />
                    <StatusBadge status={c.status} />
                    <span className="text-xs text-gray-500">
                      {formatRelativeTime(new Date(c.createdAt))}
                    </span>
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                    {c.lesson.module.title} → {c.lesson.title}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 whitespace-pre-wrap break-words">
                    {c.content}
                  </p>

                  <div className="flex items-center gap-3 mt-2">
                    {c.status === "PENDING" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleModerate(c.id, "approve")}
                          className="px-3 py-1 text-xs font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-md hover:bg-emerald-500/25 transition-colors"
                        >
                          Aprovar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleModerate(c.id, "reject")}
                          className="px-3 py-1 text-xs font-medium bg-red-500/15 text-red-600 dark:text-red-400 rounded-md hover:bg-red-500/25 transition-colors"
                        >
                          Rejeitar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id, c.lesson.id, false)}
                          className="text-xs text-red-500 hover:text-red-400 font-medium"
                        >
                          Excluir
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingTo(replyingTo === c.id ? null : c.id);
                            setReplyText("");
                          }}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-medium"
                        >
                          Responder
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id, c.lesson.id, false)}
                          className="text-xs text-red-500 hover:text-red-400 font-medium"
                        >
                          Excluir
                        </button>
                      </>
                    )}
                  </div>

                  {replyingTo === c.id && (
                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleReply(c.id, c.lesson.id)}
                        placeholder="Escreva sua resposta..."
                        className="flex-1 min-w-0 px-3 py-2.5 bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleReply(c.id, c.lesson.id)}
                        disabled={sending || !replyText.trim()}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
                      >
                        {sending ? "..." : "Enviar"}
                      </button>
                      <button
                        type="button"
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
                <div className="ml-12 mt-3 space-y-2 border-l-2 border-gray-200 dark:border-white/5 pl-4">
                  {c.replies.map((r) => (
                    <div key={r.id} className="flex items-start gap-2">
                      <Avatar src={r.user.avatarUrl} name={r.user.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {r.user.name}
                          </span>
                          <RoleBadge role={r.user.role} />
                          <StatusBadge status={r.status} />
                          <span className="text-xs text-gray-500">
                            {formatRelativeTime(new Date(r.createdAt))}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap break-words">
                          {r.content}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          {r.status === "PENDING" && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleModerate(r.id, "approve")}
                                className="px-2 py-0.5 text-[11px] font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-md hover:bg-emerald-500/25 transition-colors"
                              >
                                Aprovar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleModerate(r.id, "reject")}
                                className="px-2 py-0.5 text-[11px] font-medium bg-red-500/15 text-red-600 dark:text-red-400 rounded-md hover:bg-red-500/25 transition-colors"
                              >
                                Rejeitar
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(r.id, c.lesson.id, true, c.id)}
                            className="text-xs text-red-500 hover:text-red-400 font-medium"
                          >
                            Excluir
                          </button>
                        </div>
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-lg shadow-lg">
          {toast}
        </div>
      )}
      <ConfirmDialog />
    </>
  );
}

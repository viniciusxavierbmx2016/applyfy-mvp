"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { formatRelativeTime } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { useConfirm } from "@/hooks/use-confirm";
import { CustomSelect } from "@/components/custom-select";

interface AdminPost {
  id: string;
  content: string;
  type: "QUESTION" | "RESULT" | "FEEDBACK" | "FREE";
  pinned: boolean;
  status?: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
    role: "STUDENT" | "ADMIN";
  };
  course: { id: string; title: string; slug: string };
  group?: { id: string; name: string } | null;
  _count: { likes: number; comments: number };
}

interface PendingItem {
  id: string;
  type: "community_post" | "community_comment" | "lesson_comment";
  content: string;
  createdAt: string;
  user: { id: string; name: string; email: string; avatarUrl: string | null };
  course: { id: string; title: string; slug: string };
  group?: { id: string; name: string } | null;
  post?: { id: string; content: string } | null;
}

interface CourseOption {
  id: string;
  title: string;
  slug: string;
}

interface CommunityGroup {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isDefault: boolean;
  permission: "READ_WRITE" | "READ_ONLY";
  order: number;
  _count: { posts: number };
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
  const [groupFilter, setGroupFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<"posts" | "groups" | "pending">("posts");
  const { confirm, ConfirmDialog } = useConfirm();

  // Pending moderation state
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Groups state
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsForFilter, setGroupsForFilter] = useState<CommunityGroup[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CommunityGroup | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }

  // Load posts
  async function loadPosts(courseId: string, gId?: string) {
    setLoading(true);
    try {
      let url = courseId
        ? `/api/producer/community?courseId=${courseId}`
        : "/api/producer/community";
      if (gId) url += `${courseId ? "&" : "?"}groupId=${gId}`;
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

  // Load groups for the groups tab
  const loadGroups = useCallback(async (courseId: string) => {
    if (!courseId) {
      setGroups([]);
      return;
    }
    setGroupsLoading(true);
    try {
      const res = await fetch(
        `/api/producer/community/groups?courseId=${courseId}`
      );
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups);
      }
    } finally {
      setGroupsLoading(false);
    }
  }, []);

  // Load groups for the filter dropdown
  const loadGroupsForFilter = useCallback(async (courseId: string) => {
    if (!courseId) {
      setGroupsForFilter([]);
      return;
    }
    try {
      const res = await fetch(
        `/api/producer/community/groups?courseId=${courseId}`
      );
      if (res.ok) {
        const data = await res.json();
        setGroupsForFilter(data.groups);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const loadPending = useCallback(async (courseId: string) => {
    setPendingLoading(true);
    try {
      let url = "/api/producer/moderation/pending?type=community";
      if (courseId) url += `&courseId=${courseId}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const items = [
          ...(data.community_posts || []).map((p: Record<string, unknown>) => ({ ...p, type: "community_post" as const })),
          ...(data.community_comments || []).map((c: Record<string, unknown>) => ({ ...c, type: "community_comment" as const })),
        ];
        items.sort((a, b) => new Date(a.createdAt as string).getTime() - new Date(b.createdAt as string).getTime());
        setPendingItems(items as PendingItem[]);
        setPendingTotal(items.length);
      }
    } finally {
      setPendingLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts(courseFilter, groupFilter || undefined);
    loadGroupsForFilter(courseFilter);
    loadPending(courseFilter);
  }, [courseFilter, groupFilter, loadGroupsForFilter, loadPending]);

  useEffect(() => {
    if (subTab === "groups") loadGroups(courseFilter);
  }, [subTab, courseFilter, loadGroups]);

  // Reset group filter when course changes
  useEffect(() => {
    setGroupFilter("");
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
    if (
      !(await confirm({
        title: "Excluir post",
        message: "Excluir este post?",
        variant: "danger",
        confirmText: "Excluir",
      }))
    )
      return;
    const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPosts((prev) => prev.filter((p) => p.id !== id));
    }
  }

  async function deleteGroup(g: CommunityGroup) {
    if (g.isDefault) return;
    if (
      !(await confirm({
        title: "Excluir grupo",
        message: `Excluir o grupo "${g.name}"? Os posts serão movidos para o grupo Geral.`,
        variant: "danger",
        confirmText: "Excluir",
      }))
    )
      return;
    const res = await fetch(`/api/producer/community/groups/${g.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setGroups((prev) => prev.filter((gr) => gr.id !== g.id));
      showToast("Grupo excluído");
    }
  }

  async function handleModerate(item: PendingItem, action: "approve" | "reject") {
    const res = await fetch("/api/producer/moderation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ type: item.type, id: item.id }], action }),
    });
    if (res.ok) {
      setPendingItems((prev) => prev.filter((p) => p.id !== item.id));
      setPendingTotal((prev) => prev - 1);
      setSelected((prev) => { const s = new Set(prev); s.delete(item.id); return s; });
      showToast(action === "approve" ? "Aprovado" : "Rejeitado");
      if (action === "approve") loadPosts(courseFilter, groupFilter || undefined);
    }
  }

  async function handleBulkAction(action: "approve" | "reject") {
    if (selected.size === 0) return;
    const items = pendingItems
      .filter((p) => selected.has(p.id))
      .map((p) => ({ type: p.type, id: p.id }));
    const res = await fetch("/api/producer/moderation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, action }),
    });
    if (res.ok) {
      const ids = new Set(items.map((i) => i.id));
      setPendingItems((prev) => prev.filter((p) => !ids.has(p.id)));
      setPendingTotal((prev) => prev - items.length);
      setSelected(new Set());
      showToast(action === "approve" ? `${items.length} aprovado(s)` : `${items.length} rejeitado(s)`);
      if (action === "approve") loadPosts(courseFilter, groupFilter || undefined);
    }
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  }

  function toggleSelectAll() {
    if (selected.size === pendingItems.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingItems.map((p) => p.id)));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Comunidade
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Postagens de todos os cursos
          </p>
        </div>
        <CustomSelect
          value={courseFilter}
          onChange={setCourseFilter}
          className="sm:min-w-[200px]"
          options={[
            { value: "", label: "Todos os cursos" },
            ...courses.map((c) => ({ value: c.id, label: c.title })),
          ]}
        />
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-0 border-b border-gray-200 dark:border-white/10">
        <button
          className={`px-4 py-2 text-sm border-b-2 transition ${
            subTab === "posts"
              ? "border-blue-500 text-blue-500"
              : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          }`}
          onClick={() => setSubTab("posts")}
        >
          Posts
        </button>
        <button
          className={`px-4 py-2 text-sm border-b-2 transition ${
            subTab === "groups"
              ? "border-blue-500 text-blue-500"
              : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          }`}
          onClick={() => setSubTab("groups")}
        >
          Grupos
        </button>
        <button
          className={`px-4 py-2 text-sm border-b-2 transition flex items-center gap-1.5 ${
            subTab === "pending"
              ? "border-blue-500 text-blue-500"
              : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          }`}
          onClick={() => setSubTab("pending")}
        >
          Pendentes
          {pendingTotal > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-bold tabular-nums">
              {pendingTotal}
            </span>
          )}
        </button>
      </div>

      {/* Posts tab */}
      {subTab === "posts" && (
        <>
          {courseFilter && groupsForFilter.length > 0 && (
            <div className="flex">
              <CustomSelect
                value={groupFilter}
                onChange={setGroupFilter}
                className="min-w-[180px]"
                options={[
                  { value: "", label: "Todos os grupos" },
                  ...groupsForFilter.map((g) => ({
                    value: g.id,
                    label: g.name,
                  })),
                ]}
              />
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl p-4"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/5 animate-pulse shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-32 bg-gray-200 dark:bg-white/5 rounded animate-pulse" />
                      <div className="h-3 w-48 bg-gray-200 dark:bg-white/5 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 w-full bg-gray-200 dark:bg-white/5 rounded animate-pulse" />
                    <div className="h-3 w-2/3 bg-gray-200 dark:bg-white/5 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl p-10 text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                <svg
                  className="w-7 h-7 text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
                  />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">
                Nenhum post na comunidade ainda.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => {
                const typeMeta = typeLabels[post.type];
                return (
                  <div
                    key={post.id}
                    className={`bg-white dark:bg-white/5 border rounded-xl p-5 ${
                      post.status === "PENDING"
                        ? "border-amber-400/50"
                        : post.status === "REJECTED"
                        ? "border-red-400/50"
                        : "border-gray-200 dark:border-white/5"
                    }`}
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
                              Fixado
                            </span>
                          )}
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded ${typeMeta.color}`}
                          >
                            {typeMeta.label}
                          </span>
                          {post.group && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400">
                              {post.group.name}
                            </span>
                          )}
                          {post.status === "PENDING" && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 font-medium">
                              Pendente
                            </span>
                          )}
                          {post.status === "REJECTED" && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-medium">
                              Rejeitado
                            </span>
                          )}
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
                          className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-amber-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => deletePost(post.id)}
                          title="Excluir"
                          className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-red-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded"
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
                      className="post-content prose-lesson text-sm text-gray-700 dark:text-gray-300 leading-relaxed break-words"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtml(post.content),
                      }}
                    />
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <span>
                        <svg className="w-3.5 h-3.5 inline mr-1" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                        {post._count.likes}
                      </span>
                      <span>
                        <svg className="w-3.5 h-3.5 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                        {post._count.comments}
                      </span>
                      <Link
                        href={`/course/${post.course.slug}/community`}
                        className="text-blue-400 hover:text-blue-300 ml-auto"
                      >
                        Responder
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Groups tab */}
      {subTab === "groups" && (
        <GroupsTab
          courseId={courseFilter}
          groups={groups}
          loading={groupsLoading}
          onReload={() => loadGroups(courseFilter)}
          onDelete={deleteGroup}
          onEdit={(g) => {
            setEditingGroup(g);
            setModalOpen(true);
          }}
          onCreate={() => {
            setEditingGroup(null);
            setModalOpen(true);
          }}
          showToast={showToast}
        />
      )}

      {/* Pending tab */}
      {subTab === "pending" && (
        <>
          {selected.size > 0 && (
            <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
              <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                {selected.size} selecionado(s)
              </span>
              <div className="ml-auto flex gap-2">
                <button
                  onClick={() => handleBulkAction("approve")}
                  className="px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                >
                  Aprovar
                </button>
                <button
                  onClick={() => handleBulkAction("reject")}
                  className="px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                >
                  Rejeitar
                </button>
              </div>
            </div>
          )}

          {pendingLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : pendingItems.length === 0 ? (
            <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl p-10 text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">Nenhum item pendente de moderação.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.size === pendingItems.length}
                    onChange={toggleSelectAll}
                    className="accent-blue-500 rounded"
                  />
                  Selecionar todos
                </label>
              </div>

              {pendingItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-white/5 border border-amber-400/30 rounded-xl p-4 flex items-start gap-3"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(item.id)}
                    onChange={() => toggleSelected(item.id)}
                    className="mt-1 accent-blue-500 rounded"
                  />
                  <Avatar
                    src={item.user.avatarUrl}
                    name={item.user.name}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.user.name}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        item.type === "community_post"
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-purple-500/20 text-purple-400"
                      }`}>
                        {item.type === "community_post" ? "Post" : "Comentário"}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {item.course.title}
                        {item.group ? ` · ${item.group.name}` : ""}
                      </span>
                    </div>
                    {item.post && (
                      <p className="text-xs text-gray-500 mb-1 truncate">
                        Em resposta a: {item.post.content.replace(/<[^>]*>/g, "").slice(0, 80)}
                      </p>
                    )}
                    <div
                      className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed break-words line-clamp-3"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.content) }}
                    />
                    <p className="text-xs text-gray-500 mt-1.5">
                      {formatRelativeTime(new Date(item.createdAt))}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleModerate(item, "approve")}
                      title="Aprovar"
                      className="p-1.5 text-gray-500 hover:text-green-500 hover:bg-green-500/10 rounded transition"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleModerate(item, "reject")}
                      title="Rejeitar"
                      className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded transition"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Group modal */}
      {modalOpen && courseFilter && (
        <GroupModal
          courseId={courseFilter}
          group={editingGroup}
          onClose={() => {
            setModalOpen(false);
            setEditingGroup(null);
          }}
          onSaved={() => {
            setModalOpen(false);
            setEditingGroup(null);
            loadGroups(courseFilter);
            showToast(editingGroup ? "Grupo atualizado" : "Grupo criado");
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-3 rounded-lg shadow-2xl text-sm font-medium">
          {toast}
        </div>
      )}
      <ConfirmDialog />
    </div>
  );
}

/* ───── Groups Tab ───── */

function GroupsTab({
  courseId,
  groups,
  loading,
  onReload,
  onDelete,
  onEdit,
  onCreate,
  showToast,
}: {
  courseId: string;
  groups: CommunityGroup[];
  loading: boolean;
  onReload: () => void;
  onDelete: (g: CommunityGroup) => void;
  onEdit: (g: CommunityGroup) => void;
  onCreate: () => void;
  showToast: (msg: string) => void;
}) {
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [localGroups, setLocalGroups] = useState(groups);

  useEffect(() => {
    setLocalGroups(groups);
  }, [groups]);

  if (!courseId) {
    return (
      <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl p-10 text-center">
        <p className="text-gray-500 text-sm">
          Selecione um curso para gerenciar os grupos da comunidade.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse"
          />
        ))}
      </div>
    );
  }

  async function handleDrop() {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const items = [...localGroups];
    const dragged = items.splice(dragItem.current, 1)[0];
    items.splice(dragOverItem.current, 0, dragged);
    dragItem.current = null;
    dragOverItem.current = null;

    const reordered = items.map((g, i) => ({ ...g, order: i }));
    setLocalGroups(reordered);

    try {
      await fetch("/api/producer/community/groups/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: reordered.map((g) => ({ id: g.id, order: g.order })),
        }),
      });
      onReload();
    } catch {
      showToast("Erro ao reordenar");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={onCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo grupo
        </button>
      </div>

      {localGroups.length === 0 ? (
        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl p-10 text-center">
          <p className="text-gray-500 text-sm">Nenhum grupo criado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {localGroups.map((g, idx) => (
            <div
              key={g.id}
              draggable
              onDragStart={() => {
                dragItem.current = idx;
              }}
              onDragEnter={() => {
                dragOverItem.current = idx;
              }}
              onDragEnd={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl p-4 flex items-start gap-3 cursor-grab active:cursor-grabbing"
            >
              <span className="text-gray-400 dark:text-gray-500 mt-1 select-none text-lg leading-none">
                ⠿
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {g.name}
                  </h3>
                  {g.isDefault && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-500 font-medium">
                      Padrão
                    </span>
                  )}
                  {g.permission === "READ_ONLY" && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 font-medium">
                      Somente leitura
                    </span>
                  )}
                </div>
                {g.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{g.description}</p>
                )}
                <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                  <span>
                    {g._count.posts} {g._count.posts === 1 ? "post" : "posts"}
                  </span>
                  <span>
                    {g.permission === "READ_WRITE"
                      ? "Leitura e escrita"
                      : "Somente leitura"}
                  </span>
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => onEdit(g)}
                  title="Editar"
                  className="p-1.5 text-gray-500 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-white/5 rounded transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                {!g.isDefault && (
                  <button
                    onClick={() => onDelete(g)}
                    title="Excluir"
                    className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-white/5 rounded transition"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V4a2 2 0 012-2h4a2 2 0 012 2v3" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───── Group Modal ───── */

function GroupModal({
  courseId,
  group,
  onClose,
  onSaved,
}: {
  courseId: string;
  group: CommunityGroup | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(group?.name || "");
  const [description, setDescription] = useState(group?.description || "");
  const [permission, setPermission] = useState<"READ_WRITE" | "READ_ONLY">(
    group?.permission || "READ_WRITE"
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Nome é obrigatório");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const url = group
        ? `/api/producer/community/groups/${group.id}`
        : "/api/producer/community/groups";
      const method = group ? "PUT" : "POST";
      const body = group
        ? { name: name.trim(), description: description.trim() || null, permission }
        : {
            courseId,
            name: name.trim(),
            description: description.trim() || null,
            permission,
          };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Erro ao salvar");
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-[#0f1219] border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {group ? "Editar grupo" : "Novo grupo"}
            </h2>

            {error && (
              <p className="text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nome *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Ex: Networking"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Descrição (opcional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
                rows={2}
                className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                placeholder="Breve descrição do grupo"
              />
            </div>

            <fieldset>
              <legend className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Permissão
              </legend>
              <div className="space-y-2">
                <label className="flex items-start gap-3 p-3 border border-gray-200 dark:border-white/10 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition">
                  <input
                    type="radio"
                    name="permission"
                    value="READ_WRITE"
                    checked={permission === "READ_WRITE"}
                    onChange={() => setPermission("READ_WRITE")}
                    className="mt-0.5 accent-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Leitura e escrita
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Alunos podem ver e postar
                    </p>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-3 border border-gray-200 dark:border-white/10 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition">
                  <input
                    type="radio"
                    name="permission"
                    value="READ_ONLY"
                    checked={permission === "READ_ONLY"}
                    onChange={() => setPermission("READ_ONLY")}
                    className="mt-0.5 accent-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Somente leitura
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Alunos só visualizam
                    </p>
                  </div>
                </label>
              </div>
            </fieldset>
          </div>

          <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

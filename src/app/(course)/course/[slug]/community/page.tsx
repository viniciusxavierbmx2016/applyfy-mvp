"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { PostCard, type PostItem } from "@/components/post-card";
import { useUserStore } from "@/stores/user-store";

const RichTextEditor = dynamic(
  () => import("@/components/rich-text-editor"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[140px] rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 animate-pulse" />
    ),
  }
);

function htmlIsEmpty(html: string) {
  return !html.replace(/<[^>]*>/g, "").trim();
}

const POST_TYPES: Array<{ value: PostItem["type"]; label: string }> = [
  { value: "FREE", label: "Livre" },
  { value: "QUESTION", label: "Dúvida" },
  { value: "RESULT", label: "Resultado" },
  { value: "FEEDBACK", label: "Feedback" },
];

interface CommunityGroup {
  id: string;
  name: string;
  slug: string;
  isDefault: boolean;
  permission: string;
  _count: { posts: number };
}

export default function CommunityPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { user, setUser } = useUserStore();
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [course, setCourse] = useState<{
    id: string;
    title: string;
    slug: string;
  } | null>(null);
  const [isStaffViewer, setIsStaffViewer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [type, setType] = useState<PostItem["type"]>("FREE");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Groups
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [groupsLoaded, setGroupsLoaded] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Initial load: fetch posts + course info
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/posts?courseSlug=${params.slug}&page=1&limit=10`)
      .then(async (res) => {
        if (res.status === 403) {
          const body = await res.json().catch(() => ({}));
          if (!cancelled) setError(body.error || "Acesso negado");
          return null;
        }
        if (res.status === 404) {
          if (!cancelled) router.replace(`/course/${params.slug}`);
          return null;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Erro");
        }
        return res.json();
      })
      .then((data) => {
        if (data && !cancelled) {
          setPosts(data.posts);
          setCourse(data.course);
          setIsStaffViewer(!!data.isStaffViewer);
          setHasMore(!!data.hasMore);
          setPage(1);
        }
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
  }, [params.slug, router]);

  // Fetch groups once we have a courseId
  useEffect(() => {
    if (!course?.id) return;
    let cancelled = false;
    fetch(`/api/courses/${course.id}/groups`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && !cancelled) {
          setGroups(data.groups);
          const defaultGroup = data.groups.find(
            (g: CommunityGroup) => g.isDefault
          );
          if (defaultGroup) setActiveGroup(defaultGroup.id);
          setGroupsLoaded(true);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [course?.id]);

  // Re-fetch posts when activeGroup changes (after initial load)
  const loadPosts = useCallback(
    async (groupId: string | null) => {
      if (!course) return;
      setLoading(true);
      try {
        const url = `/api/posts?courseSlug=${params.slug}&page=1&limit=10${groupId ? `&groupId=${groupId}` : ""}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setPosts(data.posts);
          setHasMore(!!data.hasMore);
          setPage(1);
        }
      } finally {
        setLoading(false);
      }
    },
    [course, params.slug]
  );

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const url = `/api/posts?courseSlug=${params.slug}&page=${nextPage}&limit=10${activeGroup ? `&groupId=${activeGroup}` : ""}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setPosts((prev) => [...prev, ...data.posts]);
        setHasMore(!!data.hasMore);
        setPage(nextPage);
      }
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    if (!groupsLoaded) return;
    loadPosts(activeGroup);
  }, [activeGroup, groupsLoaded, loadPosts]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function submitPost(e: React.FormEvent) {
    e.preventDefault();
    if (htmlIsEmpty(content) || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          type,
          courseSlug: params.slug,
          groupId: activeGroup || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Erro ao publicar");
      setPosts((prev) => [body.post, ...prev]);
      setContent("");
      setType("FREE");
      if (user && body.user) {
        setUser({
          ...user,
          points: body.user.points,
          level: body.user.level,
        });
      }
      // Update group post count locally
      if (activeGroup) {
        setGroups((prev) =>
          prev.map((g) =>
            g.id === activeGroup
              ? { ...g, _count: { posts: g._count.posts + 1 } }
              : g
          )
        );
      }
      if (body.post.status === "PENDING") {
        showToast("Post enviado! Aguardando aprovação.");
      } else {
        let msg = `+${body.pointsAwarded} pontos!`;
        if (body.leveledUp) msg += " Subiu de nivel!";
        showToast(msg);
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro");
    } finally {
      setSubmitting(false);
    }
  }

  function updatePost(updated: PostItem) {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  async function deletePost(id: string) {
    const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPosts((prev) => prev.filter((p) => p.id !== id));
    }
  }

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

  if (loading && !groupsLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <Link
          href={`/course/${params.slug}`}
          className="text-blue-400 hover:text-blue-300 text-sm"
        >
          ← Voltar ao curso
        </Link>
      </div>
    );
  }

  const isAdmin = user?.role === "ADMIN";
  const isProducer =
    isStaffViewer &&
    (user?.role === "PRODUCER" || user?.role === "COLLABORATOR");
  const isStaff = isAdmin || isProducer;

  const activeGroupData = groups.find((g) => g.id === activeGroup);
  const canPost =
    !activeGroupData ||
    activeGroupData.permission !== "READ_ONLY" ||
    isStaff;

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href={`/course/${params.slug}`}
        className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
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
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Voltar ao curso
      </Link>

      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          Comunidade
        </h1>
        {course && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {course.title}
          </p>
        )}
      </div>

      {/* Group tabs */}
      {groups.length > 1 && (
        <div className="flex gap-1 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {groups.map((group) => (
            <button
              key={group.id}
              onClick={() => setActiveGroup(group.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                activeGroup === group.id
                  ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                  : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
              }`}
            >
              {group.name}
              {group._count.posts > 0 && (
                <span className="text-[10px] opacity-60">
                  {group._count.posts}
                </span>
              )}
              {group.permission === "READ_ONLY" && (
                <svg
                  className="w-3 h-3 opacity-50"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Create post or read-only notice */}
      {canPost ? (
        <form
          onSubmit={submitPost}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 mb-6"
        >
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="Compartilhe algo com a turma..."
            minHeight="120px"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
            <div className="flex flex-wrap gap-1.5">
              {POST_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition ${
                    type === t.value
                      ? "bg-blue-600 border-blue-500 text-white"
                      : "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-500 dark:hover:border-gray-600"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={htmlIsEmpty(content) || submitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {submitting ? "Publicando..." : "Publicar"}
            </button>
          </div>
        </form>
      ) : (
        <div className="flex items-center justify-center gap-2 py-4 mb-6 text-sm text-gray-500 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Este grupo é somente leitura
        </div>
      )}

      {/* Feed */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center">
          <svg
            className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
            />
          </svg>
          <p className="text-gray-400 dark:text-gray-500">
            Nenhum post neste grupo ainda
          </p>
          {canPost && (
            <p className="text-gray-500 text-sm mt-1">
              Seja o primeiro a publicar!
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              isAdmin={!!isAdmin}
              isProducer={isProducer}
              currentUserId={user?.id ?? ""}
              onUpdate={updatePost}
              onDelete={deletePost}
              onTogglePin={togglePin}
            />
          ))}
          {hasMore && (
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full py-3 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
            >
              {loadingMore ? "Carregando..." : "Carregar mais posts"}
            </button>
          )}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-blue-600 text-white rounded-lg shadow-xl text-sm font-medium">
          {toast}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PostCard, type PostItem } from "@/components/post-card";
import { TiptapEditor } from "@/components/tiptap-editor";
import { useUserStore } from "@/stores/user-store";

function htmlIsEmpty(html: string) {
  return !html.replace(/<[^>]*>/g, "").trim();
}

const POST_TYPES: Array<{ value: PostItem["type"]; label: string }> = [
  { value: "FREE", label: "Livre" },
  { value: "QUESTION", label: "Dúvida" },
  { value: "RESULT", label: "Resultado" },
  { value: "FEEDBACK", label: "Feedback" },
];

export default function CommunityPage() {
  const params = useParams<{ slug: string }>();
  const { user, setUser } = useUserStore();
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [course, setCourse] = useState<{ title: string; slug: string } | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [type, setType] = useState<PostItem["type"]>("FREE");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/posts?courseSlug=${params.slug}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Erro");
        }
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setPosts(data.posts);
          setCourse(data.course);
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
  }, [params.slug]);

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
      let msg = `+${body.pointsAwarded} pontos!`;
      if (body.leveledUp) msg += " 🎉 Subiu de nível!";
      showToast(msg);
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
        // re-sort: pinned first, then by date desc
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
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

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href={`/course/${params.slug}`}
        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-4"
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
        <h1 className="text-xl sm:text-2xl font-bold text-white">
          Comunidade
        </h1>
        {course && (
          <p className="text-sm text-gray-400">{course.title}</p>
        )}
      </div>

      {/* Create post */}
      <form
        onSubmit={submitPost}
        className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6"
      >
        <TiptapEditor
          value={content}
          onChange={setContent}
          placeholder="Compartilhe algo com a turma..."
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
                    : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600"
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

      {/* Feed */}
      {posts.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-500 text-sm">
            Nenhum post ainda. Seja o primeiro a publicar!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              isAdmin={!!isAdmin}
              currentUserId={user?.id ?? ""}
              onUpdate={updatePost}
              onDelete={deletePost}
              onTogglePin={togglePin}
            />
          ))}
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

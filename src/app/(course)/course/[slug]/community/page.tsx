"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { PostCard, type PostItem } from "@/components/post-card";
import { ScrollableTabs } from "@/components/scrollable-tabs";
import { hasPostContent } from "@/lib/sanitize-html";
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
  description: string | null;
  isDefault: boolean;
  permission: string;
  _count: { posts: number };
}

/**
 * Esqueleto do feed — no lugar dos dois spinners (o da tela e o do feed).
 *
 * ⚠️ As barras usam `bg-gray-200 dark:bg-gray-800/60`, e NÃO os neutros do
 * cartão. No `.course-customized` todo neutro de fundo colapsa para a mesma
 * `--member-card` (`bg-white`, `dark:bg-gray-900`, `bg-gray-100` e
 * `dark:bg-gray-800` puro, globals.css:334-341): barra e cartão ficariam da
 * mesma cor e o esqueleto sumiria nos cursos com tema. As variantes com alpha
 * (`/60`) não estão no ruleset e sobrevivem — é o mesmo par que o esqueleto do
 * curso já usa (`course/[slug]/page.tsx:345-347`). O cartão em volta continua
 * coberto, então ele acompanha o tema do produtor.
 */
function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 sm:p-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-800/60 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/3 rounded bg-gray-200 dark:bg-gray-800/60 animate-pulse" />
              <div className="h-2 w-1/4 rounded bg-gray-200 dark:bg-gray-800/60 animate-pulse" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-800/60 animate-pulse" />
            <div className="h-3 w-4/5 rounded bg-gray-200 dark:bg-gray-800/60 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
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

  // Memoizado porque agora os efeitos abaixo dependem dele. Sem `useCallback`
  // a função seria recriada a cada render e, estando nas deps de um efeito que
  // busca, o efeito refaria a busca a cada render — laço infinito. É o MESMO
  // aviso de sempre (um toast na tela, :495), só que estável.
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ⭐ Carga inicial: os GRUPOS primeiro.
  //
  // Antes eram duas buscas de posts em toda abertura: esta posição buscava o
  // feed SEM grupo (só para descobrir o curso) e, quando o grupo padrão
  // chegava, o efeito de baixo rebuscava COM o grupo. O aluno via
  // posts → spinner → posts, e nos cursos com mais de um grupo os posts dos
  // outros grupos apareciam e sumiam (a API não filtra grupo quando o
  // `groupId` vem ausente, posts/route.ts:92). Sabendo o grupo ativo ANTES, o
  // feed é buscado uma vez só, já no grupo certo.
  //
  // O portão da tela mora aqui agora. É o mesmo das duas rotas — 401, 404 de
  // curso, 403 de comunidade desativada e 403 de não-matriculado — então nada
  // afrouxou ao trocar quem chega primeiro.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/courses/${params.slug}/groups`)
      .then(async (res) => {
        if (res.status === 404) {
          if (!cancelled) router.replace(`/course/${params.slug}`);
          return null;
        }
        // 401 e 403 são fatais: sem sessão ou sem acesso, não há feed a mostrar.
        // O 401 precisa estar aqui explicitamente — cair no `.catch` de baixo o
        // trataria como falha de rede e o deslogado veria um aviso e um feed
        // vazio, em vez da tela de erro que ele via antes.
        if (res.status === 401 || res.status === 403) {
          const body = await res.json().catch(() => ({}));
          if (!cancelled) {
            setError(body.error || "Acesso negado");
            // Sem isto a tela ficaria no esqueleto para sempre: o esqueleto é
            // servido enquanto `loading && !groupsLoaded`, e nenhum dos dois
            // mudaria mais. O erro só aparece depois desse portão.
            setLoading(false);
          }
          return null;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Erro ao carregar os grupos");
        }
        return res.json();
      })
      .then((data) => {
        if (!data || cancelled) return;
        setGroups(data.groups);
        const defaultGroup = data.groups.find(
          (g: CommunityGroup) => g.isDefault
        );
        if (defaultGroup) setActiveGroup(defaultGroup.id);
        setGroupsLoaded(true);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        // Rede ou 500 nos grupos NÃO pode matar o feed — antes isto era um
        // `.catch(() => {})` mudo. Libera a carga sem escopo (activeGroup
        // segue null = todos os grupos do curso) e diz o que houve.
        showToast(e.message || "Erro ao carregar os grupos");
        setGroupsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [params.slug, router, showToast]);

  // Busca o feed, sempre já escopado no grupo ativo. É também por aqui que o
  // curso e o isStaffViewer chegam — vinham da busca que foi removida acima.
  //
  // ⚠️ O `if (!course) return` que existia aqui saiu de propósito: com os
  // grupos vindo primeiro, o curso passa a chegar NESTA resposta. Manter a
  // guarda travaria o feed para sempre (esperaria um curso que só ele traz).
  const loadPosts = useCallback(
    async (groupId: string | null) => {
      setLoading(true);
      try {
        const url = `/api/posts?courseSlug=${params.slug}&page=1&limit=10${groupId ? `&groupId=${groupId}` : ""}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setPosts(data.posts);
          setCourse(data.course);
          setIsStaffViewer(!!data.isStaffViewer);
          setHasMore(!!data.hasMore);
          setPage(1);
        } else {
          const d = await res.json().catch(() => ({}));
          showToast(d.error || "Erro ao carregar os posts");
        }
      } catch {
        showToast("Erro de rede. Tente novamente.");
      } finally {
        setLoading(false);
      }
    },
    [params.slug, showToast]
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
      } else {
        // Era o pior dos mudos: o botão voltava a dizer "Carregar mais posts"
        // como se nada tivesse acontecido, e o aluno clicava de novo.
        const d = await res.json().catch(() => ({}));
        showToast(d.error || "Erro ao carregar mais posts");
      }
    } catch {
      showToast("Erro de rede. Tente novamente.");
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    if (!groupsLoaded) return;
    loadPosts(activeGroup);
  }, [activeGroup, groupsLoaded, loadPosts]);

  async function submitPost(e: React.FormEvent) {
    e.preventDefault();
    if (!hasPostContent(content) || submitting) return;
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
      if (!res.ok) {
        // O erro do servidor sai por aqui, no molde dos 4 handlers do card
        // (9.31). Antes ele era RELANÇADO e caía no mesmo `catch` das exceções
        // — e era isso que fazia uma queda de rede escrever "Failed to fetch"
        // na tela do aluno: o `catch` não tinha como distinguir o `throw`
        // deliberado (mensagem boa, em português) de um TypeError do fetch.
        //
        // O `.catch(() => ({}))` no parse cobre um terceiro caso que passava
        // batido: resposta de erro que não é JSON (página HTML de 502 da borda,
        // por exemplo). Antes o `res.json()` rodava ANTES do `res.ok` e estourava
        // um SyntaxError, que virava "Unexpected token '<'" na tela.
        const d = await res.json().catch(() => ({}));
        showToast(d.error || "Erro ao publicar");
        return;
      }
      const body = await res.json();
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
    } catch {
      // Agora o `catch` só vê exceção de verdade — rede caída, DNS, abort. O
      // erro do servidor já foi tratado acima, então nenhuma mensagem útil se
      // perde aqui. Mesma frase dos outros 5 handlers da tela.
      showToast("Erro de rede. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  function updatePost(updated: PostItem) {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  // Estes dois são o 9.31 que faltou: os handlers de post da PÁGINA. O 9.31
  // cobriu os quatro do card (comentar, responder, excluir comentário, curtir)
  // e estes ficaram para trás — apagar um post que falha deixava o post na
  // tela, sem uma palavra.
  async function deletePost(id: string) {
    try {
      const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== id));
      } else {
        const d = await res.json().catch(() => ({}));
        showToast(d.error || "Erro ao excluir o post");
      }
    } catch {
      showToast("Erro de rede. Tente novamente.");
    }
  }

  async function togglePin(id: string) {
    try {
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
      } else {
        const d = await res.json().catch(() => ({}));
        showToast(d.error || "Erro ao fixar o post");
      }
    } catch {
      showToast("Erro de rede. Tente novamente.");
    }
  }

  // Enquanto os grupos não chegam, esqueleto no lugar do spinner. Este portão
  // é também o que garante que o composer nunca renderize com a permissão
  // desconhecida: `groupsLoaded` e `activeGroup` são gravados juntos, então
  // quando a tela passa daqui a permissão do grupo ativo já é sabida.
  if (loading && !groupsLoaded) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-12">
        <FeedSkeleton />
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
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-12">
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

      {/* Group tabs — sem scroller nativo: `touch-pan-x overflow-x-auto` é o par
          que o iOS em PWA standalone captura, travando a rolagem vertical da
          página. O ScrollableTabs resolve só a rolagem; o activeGroup e os
          botões continuam aqui. */}
      {groups.length > 1 && (
        <ScrollableTabs
          className="pb-2 mb-4"
          activeIndex={groups.findIndex((g) => g.id === activeGroup)}
        >
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
        </ScrollableTabs>
      )}

      {/* Active group description (rendered outside the tabs block so
          it also shows when there's only the default group and the tabs
          are hidden by `groups.length > 1`). */}
      {activeGroupData?.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 -mt-2 mb-4">
          {activeGroupData.description}
        </p>
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
            appendMediaAtEnd
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
              disabled={!hasPostContent(content) || submitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {submitting ? "Publicando..." : "Publicar"}
            </button>
          </div>
          {!hasPostContent(content) && !submitting && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Escreva algo ou adicione uma imagem para publicar.
            </p>
          )}
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
      {/* ⚠️ `loading && posts.length === 0`, e não `loading` puro: com o `loading`
          puro o esqueleto SUBSTITUÍA o feed a cada rebusca, e a troca de grupo
          piscava conteúdo → vazio → conteúdo. Agora o esqueleto só aparece
          quando não há nada para mostrar; havendo, os posts ficam na tela e só
          esmaecem (opacity-60 abaixo) enquanto os novos vêm. */}
      {loading && posts.length === 0 ? (
        <FeedSkeleton />
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
          {/* "neste grupo" só faz sentido quando as abas estão na tela. Elas
              só aparecem com `groups.length > 1`, e 27 dos 30 cursos têm um
              grupo só — para esses o aluno lia "grupo" sem nunca ter visto um. */}
          <p className="text-gray-400 dark:text-gray-500">
            {groups.length > 1
              ? "Nenhum post neste grupo ainda"
              : "Nenhum post por aqui ainda"}
          </p>
          {canPost && (
            <p className="text-gray-500 text-sm mt-1">
              Seja o primeiro a publicar!
            </p>
          )}
        </div>
      ) : (
        // ⚠️ A animação é do WRAPPER, nunca por card. Stagger por card criaria
        // um stacking context em cada um, e o menu ··· de um card ficaria preso
        // atrás do card seguinte.
        // O `opacity-60` é a rebusca: o feed esmaece em vez de sumir.
        <div
          className={`animate-fade-in-up space-y-4 transition-opacity ${
            loading ? "opacity-60" : ""
          }`}
        >
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
              onToast={showToast}
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

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

interface LiveMessage {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string; avatarUrl: string | null };
}

interface LiveData {
  id: string;
  title: string;
  description: string | null;
  platform: string;
  externalUrl: string;
  embedUrl: string | null;
  status: string;
  scheduledAt: string;
  startedAt: string | null;
  endedAt: string | null;
  recordingUrl: string | null;
  thumbnailUrl: string | null;
  roomOpen: boolean;
  chatEnabled: boolean;
  isModerator: boolean;
  course: { id: string; title: string } | null;
  messages: LiveMessage[];
  workspace: { id: string; slug: string; name: string };
}

const PLATFORM_LABELS: Record<string, string> = {
  YOUTUBE_LIVE: "YouTube Live",
  ZOOM: "Zoom",
  GOOGLE_MEET: "Google Meet",
  CUSTOM: "Link externo",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateFull(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getCountdownParts(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return { days, hours, mins, secs };
}

export default function LiveRoomPage() {
  const params = useParams<{ slug: string; id: string }>();
  const router = useRouter();
  const slug = params.slug;
  const liveId = params.id;

  const [live, setLive] = useState<LiveData | null>(null);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [roomClosed, setRoomClosed] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState<ReturnType<typeof getCountdownParts>>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  const fetchLive = useCallback(async () => {
    try {
      const res = await fetch(`/api/lives/${liveId}`);
      if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        if (data.error === "Sala fechada") {
          setRoomClosed(true);
        } else {
          setForbidden(true);
        }
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      setLive(data.live);
      setMessages(data.live.messages?.slice().reverse() || []);
    } finally {
      setLoading(false);
    }
  }, [liveId]);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/lives/${liveId}/messages`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages?.slice().reverse() || []);
    } catch {
      // ignore
    }
  }, [liveId]);

  useEffect(() => {
    fetchLive();
  }, [fetchLive]);

  useEffect(() => {
    if (live?.status !== "LIVE") return;
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [live?.status, fetchMessages]);

  useEffect(() => {
    if (!live || live.status !== "SCHEDULED") return;
    const update = () => setCountdown(getCountdownParts(live.scheduledAt));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [live?.scheduledAt, live?.status]);

  useEffect(() => {
    if (shouldAutoScroll.current) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  function handleChatScroll() {
    const el = chatContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    shouldAutoScroll.current = atBottom;
  }

  async function handleSend() {
    if (!chatInput.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/lives/${liveId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: chatInput.trim() }),
      });
      if (res.ok) {
        setChatInput("");
        shouldAutoScroll.current = true;
        fetchMessages();
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao enviar");
      }
    } finally {
      setSending(false);
    }
  }

  async function handleDeleteMessage(messageId: string) {
    const res = await fetch(`/api/lives/${liveId}/messages/${messageId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">Você não tem acesso a esta live</p>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Esta live é exclusiva para alunos matriculados no curso.</p>
        <button
          onClick={() => router.push(`/w/${slug}`)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          Ver cursos
        </button>
      </div>
    );
  }

  if (roomClosed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">Sala fechada</p>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">O moderador fechou a sala. Tente novamente mais tarde.</p>
        <button
          onClick={() => router.push(`/w/${slug}/lives`)}
          className="text-blue-500 hover:underline text-sm"
        >
          Voltar para lives
        </button>
      </div>
    );
  }

  if (!live) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <p className="text-gray-500 dark:text-gray-400 mb-4">Live não encontrada</p>
        <button
          onClick={() => router.push(`/w/${slug}/lives`)}
          className="text-blue-500 hover:underline text-sm"
        >
          Voltar para lives
        </button>
      </div>
    );
  }

  const isLive = live.status === "LIVE";
  const isScheduled = live.status === "SCHEDULED";
  const isEnded = live.status === "ENDED";
  const isYouTube = live.platform === "YOUTUBE_LIVE" && live.embedUrl;
  const chatReadonly = !isLive || !live.chatEnabled;

  function renderPlayer() {
    if (!live) return null;
    if (isScheduled) {
      return (
        <div className="relative w-full aspect-video bg-gray-900 rounded-xl flex flex-col items-center justify-center text-center p-6">
          {live.thumbnailUrl && (
            <img
              src={live.thumbnailUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover rounded-xl opacity-20"
            />
          )}
          <div className="relative z-10">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-white text-lg font-medium mb-2">A live começa em</p>
            {countdown ? (
              <div className="flex items-center justify-center gap-3 text-white mb-3">
                {countdown.days > 0 && (
                  <div className="text-center">
                    <div className="text-3xl font-bold">{countdown.days}</div>
                    <div className="text-xs text-gray-400">dias</div>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-3xl font-bold">{String(countdown.hours).padStart(2, "0")}</div>
                  <div className="text-xs text-gray-400">horas</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{String(countdown.mins).padStart(2, "0")}</div>
                  <div className="text-xs text-gray-400">min</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{String(countdown.secs).padStart(2, "0")}</div>
                  <div className="text-xs text-gray-400">seg</div>
                </div>
              </div>
            ) : (
              <p className="text-yellow-400 text-sm mb-3">Em breve</p>
            )}
            <p className="text-gray-400 text-sm">{formatDateFull(live.scheduledAt)}</p>
          </div>
        </div>
      );
    }

    if (isLive && isYouTube) {
      return (
        <div className="w-full aspect-video bg-black rounded-xl overflow-hidden">
          <iframe
            src={`${live.embedUrl}?autoplay=1`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }

    if (isLive) {
      return (
        <div className="w-full aspect-video bg-gray-900 rounded-xl flex flex-col items-center justify-center text-center p-6">
          <svg className="w-16 h-16 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p className="text-white text-lg font-medium mb-2">
            A live está acontecendo no {PLATFORM_LABELS[live.platform]}
          </p>
          <a
            href={live.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Entrar na live
          </a>
        </div>
      );
    }

    if (isEnded && live.recordingUrl) {
      const youtubeEmbed = extractYouTubeEmbed(live.recordingUrl);
      if (youtubeEmbed) {
        return (
          <div className="w-full aspect-video bg-black rounded-xl overflow-hidden">
            <iframe
              src={youtubeEmbed}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        );
      }
      return (
        <div className="w-full aspect-video bg-gray-900 rounded-xl flex flex-col items-center justify-center text-center p-6">
          <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-white font-medium mb-3">Gravação disponível</p>
          <a
            href={live.recordingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition text-sm"
          >
            Assistir gravação
          </a>
        </div>
      );
    }

    return (
      <div className="w-full aspect-video bg-gray-900 rounded-xl flex flex-col items-center justify-center text-center p-6">
        <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <p className="text-white font-medium mb-1">Esta live já encerrou</p>
        {live.endedAt && (
          <p className="text-gray-400 text-sm">{formatDateFull(live.endedAt)}</p>
        )}
      </div>
    );
  }

  function renderChat() {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Chat ao vivo
            </span>
            <span className="text-xs text-gray-400">
              {messages.length} {messages.length === 1 ? "mensagem" : "mensagens"}
            </span>
          </div>
        </div>

        <div
          ref={chatContainerRef}
          onScroll={handleChatScroll}
          className="flex-1 overflow-y-auto p-3 space-y-3"
        >
          {messages.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm">
                {isLive
                  ? "Nenhuma mensagem ainda. Seja o primeiro!"
                  : isScheduled
                    ? "O chat estará disponível durante a live"
                    : "Nenhuma mensagem nesta live"}
              </p>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className="group flex gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {msg.user.avatarUrl ? (
                  <img src={msg.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-medium text-blue-400">
                    {msg.user.name?.charAt(0)?.toUpperCase() || "?"}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                    {msg.user.name}
                  </span>
                  <span className="text-[10px] text-gray-400 flex-shrink-0">
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 break-words">
                  {msg.content}
                </p>
              </div>
              {live?.isModerator && (
                <button
                  onClick={() => handleDeleteMessage(msg.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-400 transition flex-shrink-0"
                  title="Deletar mensagem"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {chatReadonly ? (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-white/10">
            <p className="text-xs text-gray-400 text-center">
              {isLive && !live?.chatEnabled
                ? "Chat desativado pelo moderador"
                : isScheduled
                  ? "Chat disponível durante a live"
                  : "Chat encerrado"}
            </p>
          </div>
        ) : (
          <div className="px-3 py-3 border-t border-gray-200 dark:border-white/10">
            <div className="flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="Enviar mensagem..."
                maxLength={500}
                className="flex-1 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSend}
                disabled={!chatInput.trim() || sending}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg transition flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 lg:py-6 max-w-7xl mx-auto">
      {/* Back + header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => router.push(`/w/${slug}/lives`)}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">
              {live.title}
            </h1>
            {isLive && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 flex-shrink-0">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                Ao Vivo
              </span>
            )}
            {isScheduled && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400 flex-shrink-0">
                Agendada
              </span>
            )}
            {isEnded && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400 flex-shrink-0">
                Encerrada
              </span>
            )}
          </div>
        </div>
        <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:block">
          {messages.length} mensagens
        </span>
      </div>

      {/* Desktop: side by side */}
      <div className="hidden lg:grid lg:grid-cols-[1fr,360px] gap-4 h-[calc(100vh-180px)]">
        <div className="flex flex-col">
          {renderPlayer()}
          {live.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">{live.description}</p>
          )}
        </div>
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl overflow-hidden flex flex-col">
          {renderChat()}
        </div>
      </div>

      {/* Mobile: stacked */}
      <div className="lg:hidden space-y-4">
        {renderPlayer()}
        {live.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{live.description}</p>
        )}
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl overflow-hidden h-[400px] flex flex-col">
          {renderChat()}
        </div>
      </div>
    </div>
  );
}

function extractYouTubeEmbed(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/)([a-zA-Z0-9_-]+)/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
  }
  return null;
}

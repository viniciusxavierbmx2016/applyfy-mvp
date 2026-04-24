"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

interface LiveMessage {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string; avatarUrl: string | null };
}

interface Moderator {
  id: string;
  userId: string;
  user: { id: string; name: string; avatarUrl: string | null; email: string };
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
  roomOpen: boolean;
  chatEnabled: boolean;
  course: { id: string; title: string } | null;
  _count: { messages: number };
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

export default function ProducerLiveRoomPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const liveId = params.id;

  const [live, setLive] = useState<LiveData | null>(null);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [moderators, setModerators] = useState<Moderator[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const fetchLive = useCallback(async () => {
    try {
      const res = await fetch(`/api/producer/lives/${liveId}`);
      if (!res.ok) return;
      const data = await res.json();
      setLive(data.live);
    } finally {
      setLoading(false);
    }
  }, [liveId]);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/lives/${liveId}/messages`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages((data.messages || []).slice().reverse());
    } catch {
      // ignore
    }
  }, [liveId]);

  const fetchModerators = useCallback(async () => {
    try {
      const res = await fetch(`/api/producer/lives/${liveId}/moderators`);
      if (!res.ok) return;
      const data = await res.json();
      setModerators(data.moderators || []);
    } catch {
      // ignore
    }
  }, [liveId]);

  useEffect(() => {
    fetchLive();
    fetchMessages();
    fetchModerators();
  }, [fetchLive, fetchMessages, fetchModerators]);

  useEffect(() => {
    if (live?.status !== "LIVE") return;
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [live?.status, fetchMessages]);

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
      }
    } finally {
      setSending(false);
    }
  }

  async function toggleRoom() {
    if (!live) return;
    const prev = live.roomOpen;
    setLive((l) => l ? { ...l, roomOpen: !prev } : l);
    setToast(prev ? "Sala fechada" : "Sala aberta");
    const res = await fetch(`/api/producer/lives/${liveId}/moderate`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomOpen: !prev }),
    });
    if (!res.ok) setLive((l) => l ? { ...l, roomOpen: prev } : l);
  }

  async function toggleChat() {
    if (!live) return;
    const prev = live.chatEnabled;
    setLive((l) => l ? { ...l, chatEnabled: !prev } : l);
    setToast(prev ? "Chat desativado" : "Chat ativado");
    const res = await fetch(`/api/producer/lives/${liveId}/moderate`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatEnabled: !prev }),
    });
    if (!res.ok) setLive((l) => l ? { ...l, chatEnabled: prev } : l);
  }

  async function handleDeleteMessage(messageId: string) {
    const removed = messages.find((m) => m.id === messageId);
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    setDeleteConfirm(null);
    setToast("Mensagem deletada");
    const res = await fetch(`/api/lives/${liveId}/messages/${messageId}`, {
      method: "DELETE",
    });
    if (!res.ok && removed) {
      setMessages((prev) => [...prev, removed].sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ));
      setToast("Erro ao deletar mensagem");
    }
  }

  async function addModerator(userId: string) {
    setToast("Moderador adicionado");
    const res = await fetch(`/api/producer/lives/${liveId}/moderators`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      fetchModerators();
    }
  }

  async function removeModerator(userId: string) {
    setModerators((prev) => prev.filter((m) => m.userId !== userId));
    setToast("Moderador removido");
    const res = await fetch(`/api/producer/lives/${liveId}/moderators`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      fetchModerators();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!live) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-gray-400 mb-4">Live não encontrada</p>
        <button onClick={() => router.push("/producer/lives")} className="text-purple-400 hover:underline text-sm">
          Voltar
        </button>
      </div>
    );
  }

  const isLive = live.status === "LIVE";
  const modUserIds = new Set(moderators.map((m) => m.userId));

  const recentUsers = (() => {
    const tenMinAgo = Date.now() - 10 * 60 * 1000;
    const seen = new Map<string, LiveMessage["user"]>();
    for (const msg of [...messages].reverse()) {
      if (new Date(msg.createdAt).getTime() > tenMinAgo && !seen.has(msg.user.id)) {
        seen.set(msg.user.id, msg.user);
      }
    }
    return Array.from(seen.values());
  })();

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[60] bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-[#1a1a2e] border border-white/10 rounded-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-white mb-2">Deletar mensagem?</h3>
            <p className="text-gray-400 text-sm mb-4">Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition">
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteMessage(deleteConfirm)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                Deletar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/producer/lives")}
          className="flex items-center gap-1 text-gray-400 hover:text-white transition text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-white truncate">{live.title}</h1>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              isLive ? "bg-red-500/20 text-red-400" : live.status === "SCHEDULED" ? "bg-yellow-500/20 text-yellow-400" : "bg-gray-500/20 text-gray-400"
            }`}>
              {isLive && <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full mr-1 animate-pulse" />}
              {isLive ? "Ao Vivo" : live.status === "SCHEDULED" ? "Agendada" : "Encerrada"}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            {PLATFORM_LABELS[live.platform]} {live.course ? `• ${live.course.title}` : ""}
          </p>
        </div>
        <a
          href={live.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Abrir link
        </a>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-4" style={{ height: "calc(100vh - 200px)" }}>
        {/* Left: Player preview */}
        <div className="flex flex-col gap-4">
          {live.embedUrl && isLive ? (
            <div className="w-full aspect-video bg-black rounded-xl overflow-hidden">
              <iframe
                src={`${live.embedUrl}?autoplay=1`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="w-full aspect-video bg-gray-900 rounded-xl flex items-center justify-center">
              <p className="text-gray-500 text-sm">
                {isLive ? `Live em ${PLATFORM_LABELS[live.platform]}` : live.status === "SCHEDULED" ? "Aguardando início" : "Live encerrada"}
              </p>
            </div>
          )}

          {live.description && (
            <p className="text-sm text-gray-400">{live.description}</p>
          )}
        </div>

        {/* Right: Moderation panel */}
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden flex flex-col min-h-0">
          {/* Controls */}
          <div className="p-3 border-b border-white/10 space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Controles</p>
            <div className="flex gap-3">
              <button
                onClick={toggleRoom}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition ${
                  live.roomOpen
                    ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                    : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${live.roomOpen ? "bg-green-500" : "bg-red-500"}`} />
                Sala {live.roomOpen ? "Aberta" : "Fechada"}
              </button>
              <button
                onClick={toggleChat}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition ${
                  live.chatEnabled
                    ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                    : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${live.chatEnabled ? "bg-green-500" : "bg-red-500"}`} />
                Chat {live.chatEnabled ? "Ativo" : "Desativado"}
              </button>
            </div>
          </div>

          {/* Chat */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-400">Chat</span>
              <span className="text-xs text-gray-600">{messages.length} msgs</span>
            </div>

            <div
              ref={chatContainerRef}
              onScroll={handleChatScroll}
              className="flex-1 overflow-y-auto p-3 space-y-2"
            >
              {messages.length === 0 && (
                <p className="text-center text-gray-600 text-xs py-4">Nenhuma mensagem</p>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className="group flex gap-2 items-start">
                  <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {msg.user.avatarUrl ? (
                      <img src={msg.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-medium text-purple-400">
                        {msg.user.name?.charAt(0)?.toUpperCase() || "?"}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs font-medium text-gray-300 truncate">
                        {modUserIds.has(msg.user.id) && <span className="text-yellow-400 mr-0.5">★</span>}
                        {msg.user.name}
                      </span>
                      <span className="text-[10px] text-gray-600">{formatTime(msg.createdAt)}</span>
                    </div>
                    <p className="text-xs text-gray-400 break-words">{msg.content}</p>
                  </div>
                  <button
                    onClick={() => setDeleteConfirm(msg.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-600 hover:text-red-400 transition flex-shrink-0"
                    title="Deletar mensagem"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {isLive && (
              <div className="px-3 py-2 border-t border-white/10">
                <div className="flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    placeholder="Enviar mensagem..."
                    maxLength={500}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!chatInput.trim() || sending}
                    className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition flex-shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Participants */}
          <div className="border-t border-white/10 p-3 max-h-48 overflow-y-auto">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Assistindo ({recentUsers.length})
            </p>
            {recentUsers.length === 0 ? (
              <p className="text-xs text-gray-600">Nenhum participante recente</p>
            ) : (
              <ul className="space-y-1.5">
                {recentUsers.map((u) => (
                  <li key={u.id} className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[9px] font-medium text-gray-400">
                          {u.name?.charAt(0)?.toUpperCase() || "?"}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-300 flex-1 truncate">
                      {modUserIds.has(u.id) && <span className="text-yellow-400 mr-0.5">★</span>}
                      {u.name}
                    </span>
                    {modUserIds.has(u.id) ? (
                      <button
                        onClick={() => removeModerator(u.id)}
                        className="text-[10px] text-red-400 hover:text-red-300 transition"
                      >
                        -mod
                      </button>
                    ) : (
                      <button
                        onClick={() => addModerator(u.id)}
                        className="text-[10px] text-purple-400 hover:text-purple-300 transition"
                      >
                        +mod
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

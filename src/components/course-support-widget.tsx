"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// F2 — Per-course support widget for STUDENTS.
//
// Distinct from src/components/support-chat-widget.tsx (producer↔admin).
// Three views:
//   - list  : the student's tickets in this course + "Novo chamado" CTA
//   - new   : compose form (subject + body)
//   - chat  : message thread for a single ticket + reply input
//
// Polling: when in the chat view, fetch messages every 10s so producer
// replies show up without a page refresh.
//
// Attachments: the API accepts them but this widget doesn't surface upload
// or display yet — the existing signed-url route is hardwired to
// TicketMessage, so a CourseSupportMessage-aware route is needed first.

type Status = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
type View = "list" | "new" | "chat";

interface TicketPreviewMessage {
  id: string;
  body: string;
  createdAt: string;
  senderRole: string;
}

interface TicketSummary {
  id: string;
  subject: string;
  status: Status;
  lastMessageAt: string;
  lastReadByStudentAt: string | null;
  messages: TicketPreviewMessage[];
  _count: { messages: number };
}

interface ChatMessage {
  id: string;
  body: string;
  attachments: string[];
  senderId: string;
  senderRole: string;
  createdAt: string;
}

interface Props {
  courseId: string;
  courseTitle: string;
  buttonColor?: string | null;
  buttonImage?: string | null;
}

const STATUS_LABEL: Record<Status, string> = {
  OPEN: "Aberto",
  IN_PROGRESS: "Em andamento",
  RESOLVED: "Resolvido",
  CLOSED: "Fechado",
};

const STATUS_DOT: Record<Status, string> = {
  OPEN: "bg-amber-500",
  IN_PROGRESS: "bg-blue-500",
  RESOLVED: "bg-emerald-500",
  CLOSED: "bg-gray-500",
};

const POLL_MS = 10_000;

function isUnreadForStudent(t: TicketSummary): boolean {
  if (!t.lastReadByStudentAt) return false; // student's own first message
  return (
    new Date(t.lastMessageAt).getTime() >
    new Date(t.lastReadByStudentAt).getTime()
  );
}

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  const diffMs = Date.now() - t;
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CourseSupportWidget({
  courseId,
  courseTitle,
  buttonColor,
  buttonImage,
}: Props) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("list");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [reply, setReply] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = tickets.filter(isUnreadForStudent).length;

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(
        `/api/course-support/tickets?courseId=${encodeURIComponent(courseId)}`,
        { cache: "no-store" }
      );
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Erro");
      setTickets(json.tickets || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  const loadMessages = useCallback(async (ticketId: string) => {
    try {
      const r = await fetch(
        `/api/course-support/tickets/${ticketId}/messages`,
        { cache: "no-store" }
      );
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Erro");
      setMessages(json.messages || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    }
  }, []);

  // Whenever the panel opens (or view returns to list), pull a fresh list.
  useEffect(() => {
    if (!open) return;
    if (view !== "list") return;
    loadTickets();
  }, [open, view, loadTickets]);

  // Chat view: initial load + 10s polling. Stops when leaving the view.
  useEffect(() => {
    if (!open || view !== "chat" || !activeId) return;
    loadMessages(activeId);
    const t = setInterval(() => loadMessages(activeId), POLL_MS);
    return () => clearInterval(t);
  }, [open, view, activeId, loadMessages]);

  // Auto-scroll to the bottom whenever new messages arrive.
  useEffect(() => {
    if (view !== "chat") return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, view]);

  async function submitNew(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !body.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch("/api/course-support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          subject: subject.trim(),
          body: body.trim(),
        }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Erro ao criar ticket");
      setSubject("");
      setBody("");
      setActiveId(json.ticket.id);
      setView("chat");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim() || !activeId || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch(
        `/api/course-support/tickets/${activeId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: reply.trim() }),
        }
      );
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Erro ao enviar");
      setReply("");
      await loadMessages(activeId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setSubmitting(false);
    }
  }

  const activeTicket = activeId
    ? tickets.find((t) => t.id === activeId)
    : null;

  // Use member primary as fallback to inherit the workspace/course theming.
  const buttonStyle: React.CSSProperties = {
    background:
      buttonColor || "var(--member-primary, var(--primary, #3b82f6))",
  };

  return (
    <>
      {/* FLOATING BUTTON */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-transform hover:scale-105 active:scale-95"
        style={buttonStyle}
        aria-label={open ? "Fechar suporte" : "Abrir suporte"}
      >
        {buttonImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={buttonImage}
            alt=""
            className="w-full h-full object-cover rounded-full"
          />
        ) : open ? (
          <CloseIcon />
        ) : (
          <HeadphonesIcon />
        )}
        {!open && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-gray-900">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* PANEL */}
      {open && (
        <div
          role="dialog"
          aria-label="Suporte do curso"
          className="fixed bottom-20 right-4 z-50 w-[calc(100vw-2rem)] sm:w-[380px] max-h-[min(540px,calc(100vh-6rem))] flex flex-col rounded-2xl shadow-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 overflow-hidden animate-[fadeIn_120ms_ease-out]"
          style={{
            // local keyframe — avoids touching global CSS
            animationName: "fadeIn",
          }}
        >
          <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>

          {/* HEADER */}
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-200 dark:border-white/10">
            <div className="min-w-0 flex items-center gap-2">
              {view === "chat" && (
                <button
                  type="button"
                  onClick={() => {
                    setView("list");
                    setActiveId(null);
                    setMessages([]);
                  }}
                  className="text-gray-500 hover:text-gray-900 dark:hover:text-white"
                  aria-label="Voltar"
                >
                  <BackIcon />
                </button>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {view === "chat" && activeTicket
                    ? activeTicket.subject
                    : "Suporte"}
                </p>
                <p className="text-[11px] text-gray-500 truncate">
                  {view === "chat" && activeTicket ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[activeTicket.status]}`}
                      />
                      {STATUS_LABEL[activeTicket.status]}
                    </span>
                  ) : (
                    courseTitle
                  )}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-gray-500 hover:text-gray-900 dark:hover:text-white"
              aria-label="Fechar"
            >
              <CloseIcon />
            </button>
          </div>

          {/* BODY */}
          {view === "list" && (
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="px-3 pt-3 pb-2">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setView("new");
                  }}
                  className="w-full text-sm font-medium text-white rounded-lg py-2.5 transition-opacity hover:opacity-90"
                  style={buttonStyle}
                >
                  + Novo chamado
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-3">
                {loading ? (
                  <p className="text-center text-xs text-gray-500 py-8">
                    Carregando…
                  </p>
                ) : tickets.length === 0 ? (
                  <p className="text-center text-xs text-gray-500 py-8">
                    Nenhum chamado aberto.
                    <br />
                    Precisa de ajuda? Clique em <strong>Novo chamado</strong>.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {tickets.map((t) => {
                      const unread = isUnreadForStudent(t);
                      const preview = t.messages[0]?.body || "";
                      return (
                        <li key={t.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveId(t.id);
                              setMessages([]);
                              setView("chat");
                            }}
                            className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-white/5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate flex items-center gap-1.5">
                                {unread && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                                )}
                                {t.subject}
                              </p>
                              <span className="text-[10px] text-gray-500 flex-shrink-0">
                                {formatRelative(t.lastMessageAt)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                              {preview}
                            </p>
                            <p className="text-[10px] mt-1 inline-flex items-center gap-1.5 text-gray-500">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[t.status]}`}
                              />
                              {STATUS_LABEL[t.status]}
                            </p>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}

          {view === "new" && (
            <form onSubmit={submitNew} className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
                    Assunto
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    maxLength={200}
                    required
                    className="w-full px-3 py-2 text-sm rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-gray-900 dark:text-white"
                    placeholder="Sobre o que é seu chamado?"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
                    Descreva sua dúvida
                  </label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    maxLength={20000}
                    required
                    rows={6}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none text-gray-900 dark:text-white"
                    placeholder="Conte com o máximo de detalhes…"
                  />
                </div>
                {error && (
                  <p className="text-xs text-red-500 dark:text-red-400">
                    {error}
                  </p>
                )}
              </div>
              <div className="px-4 py-3 border-t border-gray-200 dark:border-white/10 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setView("list");
                  }}
                  className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white"
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!subject.trim() || !body.trim() || submitting}
                  className="text-sm font-medium text-white rounded-lg px-4 py-2 transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={buttonStyle}
                >
                  {submitting ? "Enviando…" : "Enviar"}
                </button>
              </div>
            </form>
          )}

          {view === "chat" && (
            <>
              <div
                ref={scrollRef}
                className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-2 bg-gray-50/50 dark:bg-black/20"
              >
                {messages.length === 0 ? (
                  <p className="text-center text-xs text-gray-500 py-8">
                    Carregando…
                  </p>
                ) : (
                  messages.map((m) => {
                    const isStudent = m.senderRole === "STUDENT";
                    return (
                      <div
                        key={m.id}
                        className={`flex ${isStudent ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                            isStudent
                              ? "bg-blue-600 text-white rounded-br-sm"
                              : "bg-white dark:bg-white/10 text-gray-900 dark:text-white border border-gray-200 dark:border-white/5 rounded-bl-sm"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">
                            {m.body}
                          </p>
                          <p
                            className={`text-[10px] mt-1 ${
                              isStudent
                                ? "text-blue-100/80"
                                : "text-gray-400 dark:text-gray-500"
                            }`}
                          >
                            {formatTime(m.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              {activeTicket?.status === "CLOSED" ? (
                <div className="px-4 py-3 border-t border-gray-200 dark:border-white/10 text-center text-xs text-gray-500">
                  Este chamado foi encerrado.
                </div>
              ) : (
                <form
                  onSubmit={submitReply}
                  className="px-3 py-2 border-t border-gray-200 dark:border-white/10 flex gap-2"
                >
                  <input
                    type="text"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    maxLength={20000}
                    placeholder="Escreva uma mensagem…"
                    className="flex-1 px-3 py-2 text-sm rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-gray-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={!reply.trim() || submitting}
                    className="text-sm font-medium text-white rounded-lg px-4 py-2 transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={buttonStyle}
                    aria-label="Enviar"
                  >
                    <SendIcon />
                  </button>
                </form>
              )}
              {error && (
                <p className="px-4 pb-2 text-xs text-red-500 dark:text-red-400">
                  {error}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}

function HeadphonesIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-6 h-6"
    >
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

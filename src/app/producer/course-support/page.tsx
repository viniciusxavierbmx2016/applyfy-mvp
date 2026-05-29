"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CustomSelect } from "@/components/custom-select";

// F2 — Producer-side course support inbox. Distinct from /admin/support
// (which is the producer↔admin platform support page).
//
// Layout: ticket list (left) + chat panel (right) on desktop; single-pane
// navigation on mobile via the activeTicketId state.

type Status = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

interface TicketStudent {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface TicketCourse {
  id: string;
  title: string;
  slug: string;
}

interface TicketSummary {
  id: string;
  subject: string;
  status: Status;
  lastMessageAt: string;
  lastReadByProducerAt: string | null;
  student: TicketStudent;
  course: TicketCourse;
  messages: Array<{ id: string; body: string; senderRole: string; createdAt: string }>;
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

interface FullTicket {
  id: string;
  subject: string;
  status: Status;
  closedAt: string | null;
  lastMessageAt: string;
  student: TicketStudent;
  course: TicketCourse;
  messages: ChatMessage[];
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

const POLL_LIST_MS = 30_000;
const POLL_CHAT_MS = 10_000;

function isUnreadForProducer(t: TicketSummary): boolean {
  if (!t.lastReadByProducerAt) return true;
  return (
    new Date(t.lastMessageAt).getTime() >
    new Date(t.lastReadByProducerAt).getTime()
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

export default function CourseSupportInboxPage() {
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [active, setActive] = useState<FullTicket | null>(null);
  const [reply, setReply] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Dropdown options are derived from the loaded ticket set — keeps this page
  // independent from a course-listing endpoint. New courses without tickets
  // simply aren't filterable, which is fine.
  const courseOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of tickets) {
      map.set(t.course.id, t.course.title);
    }
    const opts = Array.from(map.entries()).map(([value, label]) => ({
      value,
      label,
    }));
    return [{ value: "all", label: "Todos os cursos" }, ...opts];
  }, [tickets]);

  const fetchTickets = useCallback(async () => {
    try {
      const url =
        courseFilter === "all"
          ? "/api/producer/course-support/tickets"
          : `/api/producer/course-support/tickets?courseId=${encodeURIComponent(courseFilter)}`;
      const r = await fetch(url, { cache: "no-store" });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Erro");
      setTickets(json.tickets || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoadingList(false);
    }
  }, [courseFilter]);

  const fetchTicket = useCallback(
    async (id: string, opts?: { silent?: boolean }) => {
      // silent = background refresh (polling / post-action). Don't toggle the
      // loading state so the chat panel never blanks out (no flicker).
      if (!opts?.silent) setLoadingChat(true);
      try {
        const r = await fetch(`/api/producer/course-support/tickets/${id}`, {
          cache: "no-store",
        });
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || "Erro");
        // Keep the previous object reference when nothing changed, so a poll
        // that returns identical data triggers no re-render of the thread.
        setActive((prev) => {
          const next: FullTicket = json.ticket;
          if (
            prev &&
            prev.id === next.id &&
            prev.lastMessageAt === next.lastMessageAt &&
            (prev.messages?.length ?? 0) === (next.messages?.length ?? 0) &&
            prev.status === next.status
          ) {
            return prev;
          }
          return next;
        });
        // Mark thread read (server-side fire-and-forget happens on /messages GET).
        fetch(`/api/producer/course-support/tickets/${id}/messages`, {
          cache: "no-store",
        }).catch(() => {});
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro");
      } finally {
        if (!opts?.silent) setLoadingChat(false);
      }
    },
    []
  );

  // Initial + filter-change list reload + 30s background refresh.
  useEffect(() => {
    fetchTickets();
    const i = setInterval(fetchTickets, POLL_LIST_MS);
    return () => clearInterval(i);
  }, [fetchTickets]);

  // Chat reload + 10s polling for live producer view.
  useEffect(() => {
    if (!activeId) {
      setActive(null);
      return;
    }
    fetchTicket(activeId);
    const i = setInterval(
      () => fetchTicket(activeId, { silent: true }),
      POLL_CHAT_MS
    );
    return () => clearInterval(i);
  }, [activeId, fetchTicket]);

  // Auto-scroll the chat panel on new messages.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [active?.messages.length]);

  async function submitReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim() || !activeId || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch(
        `/api/producer/course-support/tickets/${activeId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: reply.trim() }),
        }
      );
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Erro ao enviar");
      setReply("");
      await Promise.all([
        fetchTicket(activeId, { silent: true }),
        fetchTickets(),
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setSubmitting(false);
    }
  }

  async function changeStatus(status: Status) {
    if (!activeId || !active) return;
    if (status === active.status) return;
    try {
      const r = await fetch(`/api/producer/course-support/tickets/${activeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Erro");
      // Refresh both panels so the badge color + sidebar list reflect it.
      await Promise.all([
        fetchTicket(activeId, { silent: true }),
        fetchTickets(),
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Suporte dos Cursos
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Chamados abertos pelos seus alunos.
          </p>
        </div>
        <div className="w-full sm:w-64">
          <CustomSelect
            value={courseFilter}
            onChange={(v) => {
              setCourseFilter(v);
              setActiveId(null);
            }}
            options={courseOptions}
            placeholder="Filtrar por curso"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4 h-[calc(100vh-12rem)] min-h-[500px]">
        {/* LIST */}
        <aside
          className={`rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 flex flex-col overflow-hidden ${
            activeId ? "hidden lg:flex" : "flex"
          }`}
        >
          <div className="px-4 py-3 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {tickets.length} chamado{tickets.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {loadingList ? (
              <p className="text-center text-xs text-gray-500 py-10">
                Carregando…
              </p>
            ) : tickets.length === 0 ? (
              <p className="text-center text-xs text-gray-500 py-10 px-6">
                Nenhum chamado{" "}
                {courseFilter !== "all" ? "neste curso" : "ainda"}.
              </p>
            ) : (
              <ul>
                {tickets.map((t) => {
                  const unread = isUnreadForProducer(t);
                  const isActiveTicket = activeId === t.id;
                  const preview = t.messages[0]?.body || "";
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => setActiveId(t.id)}
                        className={`w-full text-left px-4 py-3 border-b border-gray-200/60 dark:border-white/5 transition-colors ${
                          isActiveTicket
                            ? "bg-blue-50 dark:bg-blue-500/10"
                            : unread
                              ? "bg-amber-50/40 dark:bg-amber-500/5 hover:bg-amber-50/70 dark:hover:bg-amber-500/10"
                              : "hover:bg-gray-50 dark:hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate flex items-center gap-1.5">
                            {unread && (
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                            )}
                            {t.student.name}
                          </p>
                          <span className="text-[10px] text-gray-500 flex-shrink-0">
                            {formatRelative(t.lastMessageAt)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 dark:text-gray-300 truncate mt-0.5 font-medium">
                          {t.subject}
                        </p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {preview}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] inline-flex items-center gap-1 text-gray-500">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[t.status]}`}
                            />
                            {STATUS_LABEL[t.status]}
                          </span>
                          {courseFilter === "all" && (
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                              · {t.course.title}
                            </span>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* CHAT */}
        <section
          className={`rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 flex flex-col overflow-hidden ${
            activeId ? "flex" : "hidden lg:flex"
          }`}
        >
          {!activeId ? (
            <div className="flex-1 flex items-center justify-center px-6 text-center text-sm text-gray-500">
              Selecione um chamado para ver a conversa.
            </div>
          ) : !active ? (
            <div className="flex-1 flex items-center justify-center text-xs text-gray-500">
              Carregando…
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-gray-200 dark:border-white/10 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveId(null)}
                      className="lg:hidden text-gray-500 hover:text-gray-900 dark:hover:text-white"
                      aria-label="Voltar"
                    >
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
                    </button>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {active.subject}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {active.student.name} · {active.student.email}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                    {active.course.title}
                  </p>
                </div>
                <div className="w-44 flex-shrink-0">
                  <CustomSelect
                    value={active.status}
                    onChange={(v) => changeStatus(v as Status)}
                    options={(
                      ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as Status[]
                    ).map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
                  />
                </div>
              </div>

              {/* Messages-only loading gate: shows "Carregando…" solely on a
                  first load with no messages yet; silent refetches never hit
                  this, so the thread + input stay mounted (no flicker). */}
              {loadingChat && active.messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-xs text-gray-500">
                  Carregando…
                </div>
              ) : (
                <div
                  ref={scrollRef}
                  className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-2 bg-gray-50/50 dark:bg-black/20"
                >
                  {active.messages.map((m) => {
                    const isProducer = m.senderRole === "PRODUCER";
                    return (
                      <div
                        key={m.id}
                        className={`flex ${isProducer ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                            isProducer
                              ? "bg-blue-600 text-white rounded-br-sm"
                              : "bg-white dark:bg-white/10 text-gray-900 dark:text-white border border-gray-200 dark:border-white/5 rounded-bl-sm"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">
                            {m.body}
                          </p>
                          <p
                            className={`text-[10px] mt-1 ${
                              isProducer
                                ? "text-blue-100/80"
                                : "text-gray-400 dark:text-gray-500"
                            }`}
                          >
                            {formatTime(m.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {active.status === "CLOSED" ? (
                <div className="px-4 py-3 border-t border-gray-200 dark:border-white/10 text-center text-xs text-gray-500">
                  Este chamado está encerrado. Mude o status para responder.
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
                    placeholder="Responder…"
                    className="flex-1 px-3 py-2 text-sm rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-gray-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={!reply.trim() || submitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? "…" : "Enviar"}
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
        </section>
      </div>
    </div>
  );
}

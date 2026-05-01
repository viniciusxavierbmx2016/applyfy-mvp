"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useUserStore } from "@/stores/user-store";

interface TicketSummary {
  id: string;
  subject: string;
  status: "OPEN" | "IN_PROGRESS" | "WAITING_RESPONSE" | "RESOLVED" | "CLOSED";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  lastMessageAt: string;
  lastReadByAdminAt: string | null;
  producer: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
  assignedTo: { id: string; name: string; email: string } | null;
  _count: { messages: number };
}

interface MessageSender {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: string;
}

interface TicketMessage {
  id: string;
  body: string;
  attachments: string[];
  senderId: string;
  createdAt: string;
  sender: MessageSender;
}

interface FullTicket extends TicketSummary {
  producerId: string;
  messages: TicketMessage[];
}

const STATUS_LABELS: Record<TicketSummary["status"], string> = {
  OPEN: "Aberto",
  IN_PROGRESS: "Em andamento",
  WAITING_RESPONSE: "Aguardando produtor",
  RESOLVED: "Resolvido",
  CLOSED: "Fechado",
};

const STATUS_DOT_CLS: Record<TicketSummary["status"], string> = {
  OPEN: "bg-amber-500",
  IN_PROGRESS: "bg-blue-500",
  WAITING_RESPONSE: "bg-orange-500",
  RESOLVED: "bg-emerald-500",
  CLOSED: "bg-gray-500",
};

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "application/pdf",
]);
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 5;

function isUnreadByAdmin(t: TicketSummary): boolean {
  if (!t.lastReadByAdminAt) return true;
  return new Date(t.lastMessageAt).getTime() > new Date(t.lastReadByAdminAt).getTime();
}

function formatDay(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString())
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function AdminSupportPageInner() {
  const search = useSearchParams();
  const { user } = useUserStore();
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(
    search.get("ticket") ?? null
  );
  const [active, setActive] = useState<FullTicket | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const loadList = useCallback(async () => {
    const url = statusFilter
      ? `/api/support/tickets?status=${statusFilter}`
      : "/api/support/tickets";
    try {
      const r = await fetch(url);
      if (r.ok) {
        const d = await r.json();
        setTickets(d.tickets ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const loadActive = useCallback(async (id: string) => {
    const r = await fetch(`/api/support/tickets/${id}`);
    if (!r.ok) return null;
    const d = await r.json();
    return d.ticket as FullTicket;
  }, []);

  useEffect(() => {
    loadList();
    const i = setInterval(loadList, 30000);
    return () => clearInterval(i);
  }, [loadList]);

  useEffect(() => {
    if (!activeId) {
      setActive(null);
      return;
    }
    let cancelled = false;
    loadActive(activeId).then((t) => {
      if (!cancelled && t) setActive(t);
    });
    fetch(`/api/support/tickets/${activeId}/read`, { method: "POST" }).catch(
      () => {}
    );
    return () => {
      cancelled = true;
    };
  }, [activeId, loadActive]);

  function handleSelect(id: string) {
    setActiveId(id);
  }

  async function afterReply() {
    if (!activeId) return;
    const t = await loadActive(activeId);
    if (t) setActive(t);
    loadList();
  }

  async function afterAction() {
    await afterReply();
  }

  return (
    <div className="-m-4 lg:-m-6 h-[calc(100vh-3rem)] flex">
      <aside className="w-80 border-r border-gray-200 dark:border-white/[0.08] flex flex-col">
        <div className="p-4 border-b border-gray-100 dark:border-white/[0.04]">
          <h1 className="text-base font-bold text-gray-900 dark:text-white">
            Suporte
          </h1>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="mt-2 w-full bg-white dark:bg-white/[0.04] border border-gray-300 dark:border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white"
          >
            <option value="">Todos os status</option>
            <option value="OPEN">Abertos</option>
            <option value="IN_PROGRESS">Em andamento</option>
            <option value="WAITING_RESPONSE">Aguardando produtor</option>
            <option value="RESOLVED">Resolvidos</option>
            <option value="CLOSED">Fechados</option>
          </select>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="px-4 py-10 text-center text-sm text-gray-500">
              Carregando…
            </p>
          ) : tickets.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
              Nenhum ticket.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-white/[0.04]">
              {tickets.map((t) => {
                const unread = isUnreadByAdmin(t);
                const isActive = t.id === activeId;
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => handleSelect(t.id)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/[0.02] flex items-start gap-2 ${
                        isActive
                          ? "bg-blue-50 dark:bg-blue-500/10 border-l-2 border-blue-500"
                          : ""
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${STATUS_DOT_CLS[t.status]}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <p
                            className={`text-sm truncate ${unread ? "font-semibold text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"}`}
                          >
                            {t.subject}
                          </p>
                          <span className="text-[10px] text-gray-400 flex-shrink-0">
                            {formatDay(t.lastMessageAt)}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                          {t.producer.name}
                          {unread && <span className="ml-1 text-red-500">●</span>}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      <section className="flex-1 flex flex-col bg-gray-50 dark:bg-white/[0.02] min-w-0">
        {!activeId ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
            Selecione um ticket à esquerda
          </div>
        ) : !active ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
            Carregando…
          </div>
        ) : (
          <TicketDetail
            ticket={active}
            currentUserId={user?.id || ""}
            onAfterReply={afterReply}
            onAfterAction={afterAction}
          />
        )}
      </section>
    </div>
  );
}

function TicketDetail({
  ticket,
  currentUserId,
  onAfterReply,
  onAfterAction,
}: {
  ticket: FullTicket;
  currentUserId: string;
  onAfterReply: () => void;
  onAfterAction: () => void;
}) {
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<
    { path: string; name: string; contentType: string; size: number }[]
  >([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [ticket.messages.length]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = "";
    if (attachments.length >= MAX_FILES) {
      setError("Máximo 5 arquivos");
      return;
    }
    if (!ALLOWED_TYPES.has(f.type)) {
      setError("Apenas imagens e PDF");
      return;
    }
    if (f.size > MAX_BYTES) {
      setError("Arquivo excede 10 MB");
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.append("file", f);
    const r = await fetch("/api/support/attachments/upload", {
      method: "POST",
      body: fd,
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      setError(d.error || "Falha no upload");
      return;
    }
    setAttachments((prev) => [...prev, d]);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() && attachments.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch(`/api/support/tickets/${ticket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: body.trim() || "(anexo)",
          attachments: attachments.map((a) => a.path),
        }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setError(d.error || "Falha ao enviar");
        setSubmitting(false);
        return;
      }
      setBody("");
      setAttachments([]);
      setSubmitting(false);
      onAfterReply();
    } catch {
      setError("Erro ao enviar");
      setSubmitting(false);
    }
  }

  async function changeStatus(status: TicketSummary["status"]) {
    const r = await fetch(`/api/support/tickets/${ticket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (r.ok) onAfterAction();
  }

  async function assignToMe() {
    const r = await fetch(`/api/support/tickets/${ticket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedToId: currentUserId }),
    });
    if (r.ok) onAfterAction();
  }

  async function unassign() {
    const r = await fetch(`/api/support/tickets/${ticket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedToId: null }),
    });
    if (r.ok) onAfterAction();
  }

  const isClosed = ticket.status === "CLOSED";

  return (
    <>
      <header className="px-5 py-3 bg-white dark:bg-[#0a0a1a] border-b border-gray-200 dark:border-white/[0.08]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white truncate">
              {ticket.subject}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {ticket.producer.name} ({ticket.producer.email}) · criado{" "}
              {formatDay(ticket.lastMessageAt)}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium rounded-full ${
                ticket.status === "RESOLVED" || ticket.status === "CLOSED"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : ticket.status === "WAITING_RESPONSE"
                    ? "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_CLS[ticket.status]}`} />
              {STATUS_LABELS[ticket.status]}
            </span>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-gray-500 dark:text-gray-400">
            Atribuído a:{" "}
            <span className="text-gray-700 dark:text-gray-300">
              {ticket.assignedTo?.name ?? "—"}
            </span>
          </span>
          {ticket.assignedTo?.id === currentUserId ? (
            <button
              onClick={unassign}
              className="text-[11px] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              remover
            </button>
          ) : (
            <button
              onClick={assignToMe}
              className="text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-500"
            >
              atribuir a mim
            </button>
          )}
          <span className="ml-auto flex gap-1">
            {ticket.status !== "IN_PROGRESS" && !isClosed && (
              <button
                onClick={() => changeStatus("IN_PROGRESS")}
                className="text-[11px] px-2 py-1 border border-blue-500/20 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-500/5"
              >
                Em andamento
              </button>
            )}
            {ticket.status !== "RESOLVED" && !isClosed && (
              <button
                onClick={() => changeStatus("RESOLVED")}
                className="text-[11px] px-2 py-1 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded hover:bg-emerald-500/5"
              >
                Resolver
              </button>
            )}
            {!isClosed && (
              <button
                onClick={() => changeStatus("CLOSED")}
                className="text-[11px] px-2 py-1 border border-gray-300 dark:border-white/[0.1] text-gray-600 dark:text-gray-400 rounded hover:bg-gray-100 dark:hover:bg-white/[0.04]"
              >
                Fechar
              </button>
            )}
          </span>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3">
        {ticket.messages.map((m) => {
          const isProducer = m.senderId === ticket.producerId;
          return (
            <div
              key={m.id}
              className={`flex ${isProducer ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                  isProducer
                    ? "bg-white dark:bg-white/[0.06] text-gray-900 dark:text-white border border-gray-200 dark:border-white/[0.06] rounded-bl-sm"
                    : "bg-blue-600 text-white rounded-br-sm"
                }`}
              >
                <p className="text-[10px] opacity-70 mb-0.5 font-medium">
                  {m.sender.name}
                  {!isProducer && " (suporte)"}
                </p>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                {m.attachments.length > 0 && (
                  <div className="mt-1.5 space-y-1">
                    {m.attachments.map((p) => (
                      <AttachmentLink key={p} path={p} own={!isProducer} />
                    ))}
                  </div>
                )}
                <p
                  className={`text-[10px] mt-1 ${isProducer ? "text-gray-500 dark:text-gray-400" : "text-white/70"}`}
                >
                  {formatTime(m.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {isClosed ? (
        <div className="border-t border-gray-200 dark:border-white/[0.08] p-4 bg-white dark:bg-[#0a0a1a] text-center text-xs text-gray-500 dark:text-gray-400">
          Este ticket foi fechado. Reabra mudando o status para responder.
        </div>
      ) : (
        <form
          onSubmit={handleSend}
          className="border-t border-gray-200 dark:border-white/[0.08] p-3 bg-white dark:bg-[#0a0a1a]"
        >
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {attachments.map((a) => (
                <div
                  key={a.path}
                  className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 rounded text-xs"
                >
                  <span className="truncate max-w-[160px]">{a.name}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setAttachments((prev) => prev.filter((x) => x.path !== a.path))
                    }
                    className="text-blue-700 dark:text-blue-300 hover:text-red-500"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
          <div className="flex items-end gap-2">
            <input
              ref={fileInput}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={attachments.length >= MAX_FILES}
              className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white disabled:opacity-30"
              aria-label="Anexar"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSend(e as unknown as React.FormEvent);
                }
              }}
              placeholder="Resposta… (Cmd/Ctrl+Enter pra enviar)"
              rows={2}
              className="flex-1 px-3 py-2 bg-gray-100 dark:bg-white/[0.04] border border-gray-300 dark:border-white/[0.08] rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500/50 resize-none max-h-40"
            />
            <button
              type="submit"
              disabled={submitting || (!body.trim() && attachments.length === 0)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white text-sm font-medium rounded-lg"
            >
              {submitting ? "Enviando…" : "Enviar"}
            </button>
          </div>
        </form>
      )}
    </>
  );
}

function AttachmentLink({ path, own }: { path: string; own: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  const filename = path.split("/").pop() ?? path;
  const isImage = /\.(png|jpe?g|webp|gif)$/i.test(filename);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/support/attachments/signed-url?path=${encodeURIComponent(path)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.url) setUrl(d.url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!url) {
    return (
      <div className={`text-[11px] ${own ? "text-white/70" : "text-gray-500"}`}>
        Carregando anexo…
      </div>
    );
  }

  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={filename} className="max-w-full max-h-48 rounded" />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-1.5 text-[11px] underline ${own ? "text-white" : "text-blue-600 dark:text-blue-400"}`}
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      {filename}
    </a>
  );
}

export default function AdminSupportPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Carregando…</div>}>
      <AdminSupportPageInner />
    </Suspense>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUserStore } from "@/stores/user-store";

interface TicketSummary {
  id: string;
  subject: string;
  status: "OPEN" | "IN_PROGRESS" | "WAITING_RESPONSE" | "RESOLVED" | "CLOSED";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  lastMessageAt: string;
  lastReadByProducerAt: string | null;
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
  messages: TicketMessage[];
  producerId: string;
}

interface PendingAttachment {
  path: string;
  name: string;
  size: number;
  contentType: string;
}

const STATUS_LABELS: Record<TicketSummary["status"], string> = {
  OPEN: "Aberto",
  IN_PROGRESS: "Em andamento",
  WAITING_RESPONSE: "Aguardando você",
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

function isUnread(t: TicketSummary): boolean {
  if (!t.lastReadByProducerAt) return true;
  return new Date(t.lastMessageAt).getTime() > new Date(t.lastReadByProducerAt).getTime();
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDay(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Hoje";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function SupportChatWidget() {
  const { user, isLoading } = useUserStore();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"list" | "new" | "chat">("list");
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [activeTicket, setActiveTicket] = useState<FullTicket | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    try {
      const r = await fetch("/api/support/tickets");
      if (!r.ok) return;
      const d = await r.json();
      setTickets(d.tickets ?? []);
    } catch {}
  }, []);

  const loadTicket = useCallback(async (id: string) => {
    try {
      const r = await fetch(`/api/support/tickets/${id}`);
      if (!r.ok) return null;
      const d = await r.json();
      return d.ticket as FullTicket;
    } catch {
      return null;
    }
  }, []);

  // Initial fetch + open-state polling.
  useEffect(() => {
    if (isLoading || !user || user.role !== "PRODUCER") return;
    loadTickets();
    const intervalMs = open ? 15000 : 60000;
    const t = setInterval(loadTickets, intervalMs);
    return () => clearInterval(t);
  }, [user, isLoading, open, loadTickets]);

  // Poll active ticket while open.
  useEffect(() => {
    if (!open || view !== "chat" || !activeId) return;
    let cancelled = false;
    async function pull() {
      const t = await loadTicket(activeId!);
      if (!cancelled && t) setActiveTicket(t);
    }
    pull();
    const i = setInterval(pull, 15000);
    return () => {
      cancelled = true;
      clearInterval(i);
    };
  }, [open, view, activeId, loadTicket]);

  // Mark as read when chat view opens.
  useEffect(() => {
    if (view !== "chat" || !activeId) return;
    fetch(`/api/support/tickets/${activeId}/read`, { method: "POST" }).catch(
      () => {}
    );
  }, [view, activeId]);

  if (isLoading || !user || user.role !== "PRODUCER") return null;

  const unreadCount = tickets.filter(isUnread).length;

  function openTicket(t: TicketSummary) {
    setActiveId(t.id);
    setView("chat");
    setActiveTicket(null); // shows "carregando" until loadTicket fires
  }

  function backToList() {
    setActiveId(null);
    setActiveTicket(null);
    setView("list");
    loadTickets();
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir suporte"
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg flex items-center justify-center transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-3rem)] bg-white dark:bg-[#0a0a1a] border border-gray-200 dark:border-white/[0.08] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-white/[0.08] flex items-center gap-2">
            {view !== "list" && (
              <button
                onClick={backToList}
                className="text-gray-500 hover:text-gray-900 dark:hover:text-white"
                aria-label="Voltar"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {view === "chat" && activeTicket
                  ? activeTicket.subject
                  : "Suporte Members Club"}
              </p>
              {view === "chat" && activeTicket && (
                <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_CLS[activeTicket.status]}`} />
                  {STATUS_LABELS[activeTicket.status]}
                </p>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-500 hover:text-gray-900 dark:hover:text-white"
              aria-label="Fechar"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {view === "list" && (
              <TicketListView
                tickets={tickets}
                onOpen={openTicket}
                onNew={() => setView("new")}
              />
            )}
            {view === "new" && (
              <NewTicketForm
                onCreated={(id) => {
                  setActiveId(id);
                  setView("chat");
                  loadTickets();
                }}
                onCancel={backToList}
              />
            )}
            {view === "chat" && (
              <TicketChatView
                ticket={activeTicket}
                producerId={user.id}
                onAfterReply={async () => {
                  const t = await loadTicket(activeId!);
                  if (t) setActiveTicket(t);
                  loadTickets();
                }}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

function TicketListView({
  tickets,
  onOpen,
  onNew,
}: {
  tickets: TicketSummary[];
  onOpen: (t: TicketSummary) => void;
  onNew: () => void;
}) {
  return (
    <>
      <div className="px-4 py-3 border-b border-gray-100 dark:border-white/[0.04]">
        <button
          onClick={onNew}
          className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg"
        >
          + Novo ticket
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {tickets.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nenhum ticket ainda.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Clique em &ldquo;Novo ticket&rdquo; para falar com o suporte.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-white/[0.04]">
            {tickets.map((t) => {
              const unread = isUnread(t);
              return (
                <li key={t.id}>
                  <button
                    onClick={() => onOpen(t)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/[0.02] flex items-start gap-2"
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
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {STATUS_LABELS[t.status]} · {t._count.messages} mensagem
                        {t._count.messages === 1 ? "" : "s"}
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
    </>
  );
}

function NewTicketForm({
  onCreated,
  onCancel,
}: {
  onCreated: (id: string) => void;
  onCancel: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

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
    setAttachments((prev) => [...prev, d as PendingAttachment]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          body: body.trim(),
          attachments: attachments.map((a) => a.path),
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(d.error || "Falha ao criar ticket");
        setSubmitting(false);
        return;
      }
      onCreated(d.ticket.id);
    } catch {
      setError("Erro ao criar ticket");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col p-4 gap-3 overflow-y-auto">
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Assunto
        </label>
        <input
          type="text"
          required
          maxLength={200}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Ex: Erro ao gerar certificado"
          className="w-full px-3 py-2 bg-gray-100 dark:bg-white/[0.04] border border-gray-300 dark:border-white/[0.08] rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
        />
      </div>
      <div className="flex-1 flex flex-col">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Mensagem
        </label>
        <textarea
          required
          maxLength={20000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Descreva o que está acontecendo…"
          className="flex-1 min-h-[120px] px-3 py-2 bg-gray-100 dark:bg-white/[0.04] border border-gray-300 dark:border-white/[0.08] rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 resize-none"
        />
      </div>

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {attachments.map((a) => (
            <div
              key={a.path}
              className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 rounded text-xs"
            >
              <span className="truncate max-w-[140px]">{a.name}</span>
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

      <input
        ref={fileInput}
        type="file"
        accept="image/*,application/pdf"
        onChange={handleFile}
        className="hidden"
      />

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={attachments.length >= MAX_FILES}
          className="text-gray-500 hover:text-gray-900 dark:hover:text-white disabled:opacity-30"
          aria-label="Anexar arquivo"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="ml-auto px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting || !subject.trim() || !body.trim()}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-medium rounded"
        >
          {submitting ? "Enviando…" : "Enviar"}
        </button>
      </div>
    </form>
  );
}

function TicketChatView({
  ticket,
  producerId,
  onAfterReply,
}: {
  ticket: FullTicket | null;
  producerId: string;
  onAfterReply: () => void;
}) {
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages.
  useEffect(() => {
    if (!ticket) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [ticket]);

  if (!ticket) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
        Carregando…
      </div>
    );
  }

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
    setAttachments((prev) => [...prev, d as PendingAttachment]);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() && attachments.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch(`/api/support/tickets/${ticket!.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: body.trim() || "(anexo)",
          attachments: attachments.map((a) => a.path),
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
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

  const isClosed = ticket.status === "CLOSED";

  return (
    <>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {ticket.messages.map((m) => {
          const own = m.senderId === producerId;
          return (
            <div
              key={m.id}
              className={`flex ${own ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                  own
                    ? "bg-blue-600 text-white rounded-br-sm"
                    : "bg-gray-100 dark:bg-white/[0.06] text-gray-900 dark:text-white rounded-bl-sm"
                }`}
              >
                {!own && (
                  <p className="text-[10px] opacity-70 mb-0.5">
                    {m.sender.name}
                  </p>
                )}
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                {m.attachments.length > 0 && (
                  <div className="mt-1.5 space-y-1">
                    {m.attachments.map((p) => (
                      <AttachmentLink key={p} path={p} own={own} />
                    ))}
                  </div>
                )}
                <p className={`text-[10px] mt-0.5 ${own ? "text-white/70" : "text-gray-500 dark:text-gray-400"}`}>
                  {formatTime(m.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {isClosed ? (
        <div className="p-3 border-t border-gray-200 dark:border-white/[0.08] text-center text-xs text-gray-500 dark:text-gray-400">
          Este ticket foi fechado. Abra um novo se precisar de mais ajuda.
        </div>
      ) : (
        <form
          onSubmit={handleSend}
          className="border-t border-gray-200 dark:border-white/[0.08] p-2"
        >
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2 px-1">
              {attachments.map((a) => (
                <div
                  key={a.path}
                  className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 rounded text-xs"
                >
                  <span className="truncate max-w-[120px]">{a.name}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setAttachments((prev) =>
                        prev.filter((x) => x.path !== a.path)
                      )
                    }
                    className="text-blue-700 dark:text-blue-300 hover:text-red-500"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {error && <p className="text-xs text-red-500 mb-1 px-1">{error}</p>}
          <div className="flex items-end gap-1">
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
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e as unknown as React.FormEvent);
                }
              }}
              placeholder="Escreva uma mensagem…"
              rows={1}
              className="flex-1 px-3 py-2 bg-gray-100 dark:bg-white/[0.04] border border-gray-300 dark:border-white/[0.08] rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500/50 resize-none max-h-32"
            />
            <button
              type="submit"
              disabled={submitting || (!body.trim() && attachments.length === 0)}
              className="p-2 text-blue-600 hover:text-blue-500 disabled:opacity-30"
              aria-label="Enviar"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
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
        <img
          src={url}
          alt={filename}
          className="max-w-full max-h-48 rounded"
        />
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

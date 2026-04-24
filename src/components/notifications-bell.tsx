"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatRelativeTime } from "@/lib/utils";

interface Notification {
  id: string;
  type: "LIKE" | "COMMENT" | "REPLY" | "ENROLLMENT" | "LEVEL_UP" | "LIVE_SCHEDULED" | "LIVE_STARTED";
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

const POLL_MS = 60_000;

const ICON: Record<Notification["type"], string> = {
  LIKE: "♥",
  COMMENT: "💬",
  REPLY: "↩",
  ENROLLMENT: "🎓",
  LEVEL_UP: "★",
  LIVE_SCHEDULED: "📅",
  LIVE_STARTED: "🔴",
};

export function NotificationsBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?page=1", {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setItems((data.notifications || []).slice(0, 10));
        setUnread(data.unread || 0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function handleClick(n: Notification) {
    if (!n.read) {
      setItems((prev) =>
        prev.map((i) => (i.id === n.id ? { ...i, read: true } : i))
      );
      setUnread((c) => Math.max(0, c - 1));
      fetch(`/api/notifications/${n.id}/read`, { method: "PATCH" }).catch(
        () => {}
      );
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  async function markAllRead() {
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    setUnread(0);
    await fetch("/api/notifications/read-all", { method: "PATCH" });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notificações"
        className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 11-6 0"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.4)]">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed sm:absolute inset-x-2 sm:inset-x-auto sm:right-0 top-16 sm:top-auto sm:mt-2 sm:w-96 max-h-[80vh] bg-white dark:bg-[#0f0f1e] border border-gray-200 dark:border-white/[0.08] rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-white/[0.06]">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notificações</h3>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {loading && items.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                Carregando...
              </div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                Nenhuma notificação ainda
              </div>
            ) : (
              <ul className="divide-y divide-gray-800">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleClick(n)}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-800/50 transition ${
                        n.read ? "" : "bg-blue-500/5"
                      }`}
                    >
                      <span className="mt-0.5 w-8 h-8 shrink-0 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm">
                        {ICON[n.type]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm ${
                            n.read ? "text-gray-600 dark:text-gray-400" : "text-gray-900 dark:text-white font-medium"
                          }`}
                        >
                          {n.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatRelativeTime(new Date(n.createdAt))}
                        </p>
                      </div>
                      {!n.read && (
                        <span className="mt-2 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

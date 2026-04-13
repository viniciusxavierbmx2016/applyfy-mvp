"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const ACTIVE_WORKSPACE_COOKIE = "active_workspace_id";

interface WorkspaceRow {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  isActive: boolean;
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}
function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export function WorkspaceSwitcher() {
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/workspaces")
      .then((r) => (r.ok ? r.json() : { workspaces: [] }))
      .then((d) => {
        const list: WorkspaceRow[] = d.workspaces || [];
        setWorkspaces(list);
        const cookie = readCookie(ACTIVE_WORKSPACE_COOKIE);
        const current =
          (cookie && list.find((w) => w.id === cookie)?.id) ||
          list[0]?.id ||
          null;
        if (current) {
          setActiveId(current);
          if (current !== cookie) setCookie(ACTIVE_WORKSPACE_COOKIE, current);
        }
      });
  }, []);

  if (!workspaces) {
    return (
      <div className="mx-3 mb-2 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
    );
  }

  if (workspaces.length === 0) {
    return (
      <div className="mx-3 mb-2 rounded-lg bg-blue-500/10 border border-blue-500/30 p-3 text-xs">
        <p className="text-blue-700 dark:text-blue-300 font-medium">
          Sem workspace
        </p>
        <p className="text-blue-700/80 dark:text-blue-300/80 mt-0.5 mb-2">
          Crie seu primeiro para receber alunos.
        </p>
        <Link
          href="/admin/workspaces/new"
          className="inline-block text-[11px] font-medium px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white"
        >
          Criar workspace
        </Link>
      </div>
    );
  }

  const active = workspaces.find((w) => w.id === activeId) || workspaces[0];

  function choose(ws: WorkspaceRow) {
    setActiveId(ws.id);
    setCookie(ACTIVE_WORKSPACE_COOKIE, ws.id);
    setOpen(false);
    // Force reload so all data re-fetches scoped to the new workspace
    window.location.reload();
  }

  return (
    <div className="mx-3 mb-2 relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
      >
        <div className="w-6 h-6 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {active.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={active.logoUrl}
              alt={active.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">
              {active.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
            {active.name}
          </p>
          <p className="text-[10px] text-gray-500 truncate font-mono">
            /w/{active.slug}
          </p>
        </div>
        <svg
          className={cn(
            "w-3.5 h-3.5 text-gray-500 transition-transform",
            open && "rotate-180"
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-1 z-40 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg p-1">
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              type="button"
              onClick={() => choose(ws)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs",
                ws.id === active.id
                  ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                  : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200"
              )}
            >
              <div className="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {ws.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ws.logoUrl}
                    alt={ws.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[9px] font-bold text-gray-700 dark:text-gray-300">
                    {ws.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="flex-1 truncate">{ws.name}</span>
              {!ws.isActive && (
                <span className="text-[9px] text-gray-500">inativo</span>
              )}
            </button>
          ))}
          <Link
            href="/admin/workspaces/new"
            onClick={() => setOpen(false)}
            className="mt-1 w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Novo workspace
          </Link>
        </div>
      )}
    </div>
  );
}

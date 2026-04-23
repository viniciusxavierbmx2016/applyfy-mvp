"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/hooks/use-confirm";

interface WorkspaceRow {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  loginBgColor: string | null;
  isActive: boolean;
  _count: { courses: number; members: number };
}

export default function AdminWorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  useEffect(() => {
    fetch("/api/workspaces")
      .then((r) => (r.ok ? r.json() : { workspaces: [] }))
      .then((d) => setWorkspaces(d.workspaces || []))
      .finally(() => setLoading(false));
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function workspaceUrl(slug: string) {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/w/${slug}`;
    }
    return `${process.env.NEXT_PUBLIC_APP_URL || ""}/w/${slug}`;
  }

  async function copyLink(slug: string) {
    try {
      await navigator.clipboard.writeText(workspaceUrl(slug));
      showToast("Link copiado!");
    } catch {
      showToast("Não foi possível copiar");
    }
  }

  async function toggleActive(ws: WorkspaceRow) {
    if (
      ws.isActive &&
      !(await confirm({ title: "Desativar workspace", message: `Desativar o workspace "${ws.name}"? Alunos não conseguirão mais acessar.`, variant: "danger", confirmText: "Desativar" }))
    )
      return;
    const res = await fetch(`/api/workspaces/${ws.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !ws.isActive }),
    });
    if (res.ok) {
      setWorkspaces((prev) =>
        prev.map((x) => (x.id === ws.id ? { ...x, isActive: !ws.isActive } : x))
      );
      showToast(ws.isActive ? "Workspace desativado" : "Workspace reativado");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Workspaces
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Cada workspace é um espaço isolado com cursos e alunos próprios.
          </p>
        </div>
        <Link
          href="/producer/workspaces/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Criar workspace
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : workspaces.length === 0 ? (
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-10 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
            <svg
              className="w-7 h-7 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Crie seu primeiro workspace
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
            Um workspace tem URL própria, alunos próprios e cursos próprios.
          </p>
          <Link
            href="/producer/workspaces/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg"
          >
            Criar workspace
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.map((ws) => (
            <div
              key={ws.id}
              className="flex flex-col bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl overflow-hidden"
            >
              <div className="p-4 flex items-start gap-3">
                <div
                  className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-white/[0.04] flex items-center justify-center flex-shrink-0 overflow-hidden"
                  style={
                    ws.loginBgColor ? { backgroundColor: ws.loginBgColor } : {}
                  }
                >
                  {ws.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={ws.logoUrl}
                      alt={ws.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-bold text-gray-700 dark:text-gray-300">
                      {ws.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                      {ws.name}
                    </h2>
                    <span
                      className={cn(
                        "text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0",
                        ws.isActive
                          ? "bg-green-500/10 text-green-600 dark:text-green-400"
                          : "bg-gray-500/10 text-gray-500"
                      )}
                    >
                      {ws.isActive ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    /w/{ws.slug}
                  </p>
                </div>
              </div>

              <div className="px-4 pb-3">
                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Compartilhe este link com seus alunos
                </p>
                <div className="flex items-stretch gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={workspaceUrl(ws.slug)}
                    onFocus={(e) => e.currentTarget.select()}
                    className="flex-1 min-w-0 px-2.5 py-1.5 text-[11px] font-mono bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-md text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => copyLink(ws.slug)}
                    className="px-2.5 py-1.5 text-[11px] font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-md flex-shrink-0"
                  >
                    Copiar
                  </button>
                </div>
              </div>

              <div className="px-4 pb-3 grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  {ws._count.courses} cursos
                </div>
                <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a3 3 0 015.356-1.857M17 10.87a3 3 0 100-5.74M7 10a3 3 0 110-6 3 3 0 010 6zm10 0a3 3 0 100-6 3 3 0 000 6z" />
                  </svg>
                  {ws._count.members} alunos
                </div>
              </div>

              <div className="mt-auto border-t border-gray-200 dark:border-white/[0.06] p-2 flex gap-2">
                <Link
                  href={`/producer/workspaces/${ws.id}/edit`}
                  className="flex-1 text-center text-xs font-medium px-3 py-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Editar
                </Link>
                <button
                  type="button"
                  onClick={() => toggleActive(ws)}
                  className={cn(
                    "flex-1 text-xs font-medium px-3 py-2 rounded-lg",
                    ws.isActive
                      ? "text-red-600 dark:text-red-400 hover:bg-red-500/10"
                      : "text-green-600 dark:text-green-400 hover:bg-green-500/10"
                  )}
                >
                  {ws.isActive ? "Desativar" : "Reativar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-blue-600 text-white rounded-lg shadow-xl text-sm font-medium">
          {toast}
        </div>
      )}
      <ConfirmDialog />
    </div>
  );
}

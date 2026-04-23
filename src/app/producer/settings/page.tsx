"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useActiveWorkspace } from "@/hooks/use-active-workspace";

interface WorkspaceDetail {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  customDomain: string | null;
}

export default function SettingsGeneralPage() {
  const activeWs = useActiveWorkspace();
  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeWs?.id) return;
    fetch(`/api/workspaces/${activeWs.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.workspace) setWorkspace(d.workspace);
      })
      .finally(() => setLoading(false));
  }, [activeWs?.id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6">
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 dark:bg-gray-900 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-8 text-center">
        <p className="text-sm text-gray-500">Nenhum workspace encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
          Workspace
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
          Informações gerais do seu workspace
        </p>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            {workspace.logoUrl ? (
              <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0 ring-1 ring-black/5 dark:ring-white/10">
                <Image
                  src={workspace.logoUrl}
                  alt={workspace.name}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center text-xl font-semibold flex-shrink-0 shadow-sm">
                {workspace.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {workspace.name}
              </p>
              <p className="text-sm text-gray-500 truncate">
                /{workspace.slug}
              </p>
            </div>
          </div>

          {workspace.customDomain && (
            <div className="flex items-center gap-2 text-sm">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              <span className="text-gray-600 dark:text-gray-400">{workspace.customDomain}</span>
            </div>
          )}

          <Link
            href={`/producer/workspaces/${workspace.id}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editar workspace
          </Link>
        </div>
      </section>
    </div>
  );
}

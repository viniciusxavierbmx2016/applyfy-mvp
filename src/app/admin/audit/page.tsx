"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface AuditLogEntry {
  id: string;
  action: string;
  target: string | null;
  details: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    name: string;
    email: string;
    role: string;
  } | null;
}

interface Response {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  pages: number;
  actions: string[];
}

const ACTION_LABELS: Record<string, string> = {
  admin_login: "Login admin",
  producer_login: "Login produtor",
  impersonate: "Impersonar",
  suspend_producer: "Suspender produtor",
  activate_producer: "Ativar produtor",
  moderate_approve: "Moderação: aprovar",
  moderate_reject: "Moderação: rejeitar",
  subscription_activate: "Assinatura: ativar",
  subscription_suspend: "Assinatura: suspender",
  subscription_cancel: "Assinatura: cancelar",
  subscription_reactivate: "Assinatura: reativar",
  subscription_exempt: "Assinatura: isentar",
  subscription_remove_exempt: "Assinatura: remover isenção",
  subscription_change_plan: "Assinatura: trocar plano",
  subscription_extend: "Assinatura: estender",
};

function formatDateTime(s: string): string {
  try {
    const d = new Date(s);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return s;
  }
}

export default function AdminAuditPage() {
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    if (actionFilter) params.set("action", actionFilter);
    fetch(`/api/admin/audit?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [page, actionFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Logs de auditoria
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Histórico de ações sensíveis: logins, impersonação, suspensões,
          mudanças de assinatura e moderação.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={actionFilter}
          onChange={(e) => {
            setPage(1);
            setActionFilter(e.target.value);
          }}
          className="bg-white dark:bg-white/[0.04] border border-gray-300 dark:border-white/[0.08] rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
        >
          <option value="">Todas as ações</option>
          {(data?.actions ?? []).map((a) => (
            <option key={a} value={a}>
              {ACTION_LABELS[a] ?? a}
            </option>
          ))}
        </select>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {data ? `${data.total} registro(s)` : ""}
        </span>
      </div>

      <div className="bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/[0.08] text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">Data / hora</th>
                <th className="px-4 py-3 font-medium">Usuário</th>
                <th className="px-4 py-3 font-medium">Ação</th>
                <th className="px-4 py-3 font-medium">Alvo</th>
                <th className="px-4 py-3 font-medium">IP</th>
                <th className="px-4 py-3 font-medium">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.04]">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-4 py-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  </tr>
                ))
              ) : data?.logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-gray-500 dark:text-gray-400"
                  >
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                data?.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-900 dark:text-white font-medium">
                        {log.user?.name ?? "—"}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {log.user?.email ?? "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs font-medium">
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">
                      {log.target ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">
                      {log.ip ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs max-w-md truncate">
                      {log.details ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {data && data.pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Página {data.page} de {data.pages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm bg-white dark:bg-white/[0.04] border border-gray-300 dark:border-white/[0.08] rounded-lg text-gray-700 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-white/[0.08]"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
              disabled={page >= data.pages}
              className="px-3 py-1.5 text-sm bg-white dark:bg-white/[0.04] border border-gray-300 dark:border-white/[0.08] rounded-lg text-gray-700 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-white/[0.08]"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

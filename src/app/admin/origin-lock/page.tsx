"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface OriginLockEntry {
  id: string;
  path: string;
  method: string;
  ip: string | null;
  userAgent: string | null;
  reason: string;
  createdAt: string;
}

interface AggregateRow {
  path: string;
  reason: string;
  count: number;
  lastSeen: string | null;
}

interface Response {
  logs: OriginLockEntry[];
  total: number;
  page: number;
  pages: number;
  aggregate: AggregateRow[];
}

// 2.4 Peça B.1 — a tela de OBSERVAÇÃO. Webhook/cron são rotulados "esperado/
// isento", NUNCA "ameaça". "no-stamp" é o que a B.2 bloquearia.
const REASON_LABELS: Record<string, { label: string; tone: string }> = {
  "no-stamp": {
    label: "Sem carimbo (suspeito)",
    tone: "text-amber-600 dark:text-amber-400",
  },
  "webhook-external": {
    label: "Webhook externo (esperado)",
    tone: "text-gray-500 dark:text-gray-400",
  },
  "exempt-cron": {
    label: "Cron interno (isento)",
    tone: "text-gray-500 dark:text-gray-400",
  },
};

function reasonMeta(reason: string) {
  return REASON_LABELS[reason] ?? { label: reason, tone: "text-gray-500" };
}

function formatDateTime(s: string | null): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return s;
  }
}

export default function AdminOriginLockPage() {
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/origin-lock?page=${page}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Origem (modo-observação)
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Requests que chegaram ao servidor SEM o carimbo do Cloudflare. Nada é
          bloqueado nesta fase — só registrado, pra medir o tráfego antes do
          lockdown. &quot;Webhook externo&quot; e &quot;cron&quot; são esperados;
          &quot;sem carimbo&quot; é o que o lockdown bloquearia.
        </p>
      </div>

      {loading && !data ? (
        <div className="space-y-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          {/* Agregado por rota + motivo */}
          <div className="bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-white/[0.08]">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                Resumo por rota
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/[0.08] text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Rota</th>
                    <th className="px-4 py-3 font-medium">Classificação</th>
                    <th className="px-4 py-3 font-medium">Ocorrências</th>
                    <th className="px-4 py-3 font-medium">Última</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {(data?.aggregate ?? []).map((row, i) => {
                    const m = reasonMeta(row.reason);
                    return (
                      <tr key={`${row.path}-${row.reason}-${i}`}>
                        <td className="px-4 py-3 font-mono text-xs text-gray-900 dark:text-white">
                          {row.path}
                        </td>
                        <td className={`px-4 py-3 text-xs font-medium ${m.tone}`}>
                          {m.label}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-gray-900 dark:text-white">
                          {row.count}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                          {formatDateTime(row.lastSeen)}
                        </td>
                      </tr>
                    );
                  })}
                  {(data?.aggregate ?? []).length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                      >
                        Nenhum request sem carimbo registrado ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Últimas ocorrências */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                Últimas ocorrências
              </h2>
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
                      <th className="px-4 py-3 font-medium">Método</th>
                      <th className="px-4 py-3 font-medium">Rota</th>
                      <th className="px-4 py-3 font-medium">Classificação</th>
                      <th className="px-4 py-3 font-medium">IP</th>
                      <th className="px-4 py-3 font-medium">User-Agent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                    {(data?.logs ?? []).map((log) => {
                      const m = reasonMeta(log.reason);
                      return (
                        <tr key={log.id}>
                          <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                            {formatDateTime(log.createdAt)}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-900 dark:text-white">
                            {log.method}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-900 dark:text-white">
                            {log.path}
                          </td>
                          <td className={`px-4 py-3 text-xs font-medium ${m.tone}`}>
                            {m.label}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                            {log.ip ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 max-w-[240px] truncate">
                            {log.userAgent ?? "—"}
                          </td>
                        </tr>
                      );
                    })}
                    {(data?.logs ?? []).length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                        >
                          Sem ocorrências.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {data && data.pages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-white/[0.08] text-gray-700 dark:text-gray-300 disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {data.page} / {data.pages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                disabled={page >= data.pages}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-white/[0.08] text-gray-700 dark:text-gray-300 disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

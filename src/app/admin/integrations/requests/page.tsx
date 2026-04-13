"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

type Status = "PENDING" | "REVIEWING" | "COMPLETED";

interface RequestRow {
  id: string;
  gateway: string;
  email: string;
  notes: string | null;
  status: Status;
  createdAt: string;
}

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "PENDING", label: "Pendente" },
  { value: "REVIEWING", label: "Em análise" },
  { value: "COMPLETED", label: "Concluída" },
];

const STATUS_FILTERS = ["ALL", "PENDING", "REVIEWING", "COMPLETED"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function statusBadgeClasses(status: Status) {
  switch (status) {
    case "PENDING":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
    case "REVIEWING":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30";
    case "COMPLETED":
      return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30";
  }
}

function statusLabel(status: Status) {
  return STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AdminIntegrationRequestsPage() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/integrations/requests")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.requests) setRequests(d.requests);
      })
      .finally(() => setLoading(false));
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function updateStatus(id: string, status: Status) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/integrations/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        showToast("Erro ao atualizar status");
        return;
      }
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
      showToast("Status atualizado");
    } finally {
      setUpdatingId(null);
    }
  }

  const filtered =
    filter === "ALL" ? requests : requests.filter((r) => r.status === filter);

  const counts = {
    ALL: requests.length,
    PENDING: requests.filter((r) => r.status === "PENDING").length,
    REVIEWING: requests.filter((r) => r.status === "REVIEWING").length,
    COMPLETED: requests.filter((r) => r.status === "COMPLETED").length,
  };

  return (
    <div className="max-w-5xl mx-auto">
      <Link
        href="/admin/integrations"
        className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Voltar para integrações
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          Solicitações de integração
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Gateways solicitados por administradores. Atualize o status conforme avançar.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition ${
              filter === s
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700"
            }`}
          >
            {s === "ALL" ? "Todas" : statusLabel(s as Status)}
            <span className="ml-1.5 opacity-70">{counts[s]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl bg-white dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Nenhuma solicitação {filter === "ALL" ? "registrada" : "nesse status"} ainda.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {filtered.map((r) => (
              <div
                key={r.id}
                className="p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {r.gateway}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {r.email}
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap ${statusBadgeClasses(r.status)}`}
                  >
                    {statusLabel(r.status)}
                  </span>
                </div>
                {r.notes && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-2">
                    {r.notes}
                  </p>
                )}
                <p className="text-[11px] text-gray-500 mb-3">
                  {formatDate(r.createdAt)}
                </p>
                <select
                  value={r.status}
                  disabled={updatingId === r.id}
                  onChange={(e) => updateStatus(r.id, e.target.value as Status)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-950/50 text-gray-600 dark:text-gray-400">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Gateway</th>
                  <th className="text-left font-medium px-4 py-3">Email</th>
                  <th className="text-left font-medium px-4 py-3">Observações</th>
                  <th className="text-left font-medium px-4 py-3">Data</th>
                  <th className="text-left font-medium px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filtered.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                      {r.gateway}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {r.email}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-xs">
                      {r.notes ? (
                        <span className="line-clamp-3 whitespace-pre-wrap">{r.notes}</span>
                      ) : (
                        <span className="text-gray-400 italic">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatDate(r.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5">
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-full border w-fit ${statusBadgeClasses(r.status)}`}
                        >
                          {statusLabel(r.status)}
                        </span>
                        <select
                          value={r.status}
                          disabled={updatingId === r.id}
                          onChange={(e) =>
                            updateStatus(r.id, e.target.value as Status)
                          }
                          className="text-xs px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          {STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-gray-900 dark:bg-gray-800 text-white text-sm shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

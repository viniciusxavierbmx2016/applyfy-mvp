"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/hooks/use-confirm";

interface Producer {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
  workspaceCount: number;
  courseCount: number;
  studentCount: number;
  status: "ACTIVE" | "SUSPENDED";
  subscription: { plan: string; amount: number } | null;
}

interface Response {
  producers: Producer[];
  metrics: { total: number; newLast30: number; activeWithCourse: number };
}

export default function AdminProducersPage() {
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    loadData("");
  }, []);

  function loadData(q: string) {
    setLoading(true);
    const url = q
      ? `/api/admin/producers?q=${encodeURIComponent(q)}`
      : "/api/admin/producers";
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }

  const filtered = useMemo(() => data?.producers ?? [], [data]);

  async function toggleStatus(p: Producer) {
    const action = p.status === "ACTIVE" ? "suspend" : "activate";
    if (
      action === "suspend" &&
      !(await confirm({ title: "Suspender produtor", message: `Suspender ${p.name}? Isso desativa todos os workspaces dele.`, variant: "danger", confirmText: "Suspender" }))
    ) {
      return;
    }
    setBusy(p.id);
    try {
      const res = await fetch(`/api/admin/producers/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Falha");
      loadData(query);
    } catch {
      showToast("Erro ao atualizar status");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Produtores
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Todos os produtores da plataforma.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="Total de produtores"
          value={data?.metrics.total ?? 0}
          accent="text-blue-500 dark:text-blue-400"
        />
        <MetricCard
          label="Novos (30 dias)"
          value={data?.metrics.newLast30 ?? 0}
          accent="text-emerald-500 dark:text-emerald-400"
        />
        <MetricCard
          label="Com pelo menos 1 curso"
          value={data?.metrics.activeWithCourse ?? 0}
          accent="text-amber-500 dark:text-amber-400"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") loadData(query);
          }}
          placeholder="Buscar por nome ou email…"
          className="flex-1 bg-white dark:bg-white/[0.04] border border-gray-300 dark:border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-colors duration-200"
        />
        <Button size="sm" onClick={() => loadData(query)}>
          Buscar
        </Button>
      </div>

      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">
            Nenhum produtor encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-200 dark:border-white/[0.06] text-[11px] uppercase tracking-widest text-gray-500">
                  <th className="py-3 px-4 font-medium">Produtor</th>
                  <th className="py-3 px-4 font-medium">Cadastro</th>
                  <th className="py-3 px-4 font-medium">Workspaces</th>
                  <th className="py-3 px-4 font-medium">Cursos</th>
                  <th className="py-3 px-4 font-medium">Alunos</th>
                  <th className="py-3 px-4 font-medium">Plano</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-gray-100 dark:border-white/[0.04] last:border-0 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors duration-150"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        {p.avatarUrl ? (
                          <img
                            src={p.avatarUrl}
                            alt={p.name}
                            className="w-9 h-9 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-gray-900 dark:text-white font-medium">
                            {p.name}
                          </p>
                          <p className="text-xs text-gray-500">{p.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      {formatDate(p.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                      {p.workspaceCount}
                    </td>
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                      {p.courseCount}
                    </td>
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                      {p.studentCount}
                    </td>
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                      {p.subscription ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="text-xs font-medium">
                            {p.subscription.plan}
                          </span>
                          {p.subscription.amount > 0 && (
                            <span className="text-xs text-gray-500">
                              {formatMoney(p.subscription.amount)}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">Free</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <StatusPill status={p.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex gap-2">
                        <Link
                          href={`/admin/producers/${p.id}`}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Detalhes
                        </Link>
                        <button
                          type="button"
                          disabled={busy === p.id}
                          onClick={() => toggleStatus(p)}
                          className={`text-xs hover:underline disabled:opacity-50 ${
                            p.status === "ACTIVE"
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {busy === p.id
                            ? "…"
                            : p.status === "ACTIVE"
                              ? "Suspender"
                              : "Ativar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-lg shadow-lg">
          {toast}
        </div>
      )}
      <ConfirmDialog />
    </div>
  );
}

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent: string;
}) {
  return (
    <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-5 hover:border-gray-300 dark:hover:border-white/[0.1] transition-colors duration-200">
      <p className="text-[11px] font-medium uppercase tracking-widest text-gray-500">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: "ACTIVE" | "SUSPENDED" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        status === "ACTIVE"
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
          : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
      }`}
    >
      {status === "ACTIVE" ? "Ativo" : "Suspenso"}
    </span>
  );
}

function formatDate(v: string) {
  try {
    return new Date(v).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatMoney(v: number, currency = "BRL") {
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency,
    }).format(v);
  } catch {
    return `R$ ${v.toFixed(2)}`;
  }
}

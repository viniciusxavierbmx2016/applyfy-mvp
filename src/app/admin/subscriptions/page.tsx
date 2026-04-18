"use client";

import { useCallback, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface SubUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface SubPlan {
  id: string;
  name: string;
  price: number;
}

interface Sub {
  id: string;
  userId: string;
  planId: string;
  status: string;
  currentPeriodEnd: string | null;
  exempt: boolean;
  exemptReason: string | null;
  user: SubUser;
  plan: SubPlan;
}

interface Stats {
  totalActive: number;
  totalPastDue: number;
  totalSuspended: number;
  totalCancelled: number;
  totalPending: number;
  totalExempt: number;
  mrr: number;
  revenueThisMonth: number;
  churnThisMonth: number;
}

interface PlanOption {
  id: string;
  name: string;
}

const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Ativo",
  PENDING: "Pendente",
  PAST_DUE: "Inadimplente",
  SUSPENDED: "Suspenso",
  CANCELLED: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-500/10 text-green-600 dark:text-green-400",
  PENDING: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  PAST_DUE: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  SUSPENDED: "bg-red-500/10 text-red-600 dark:text-red-400",
  CANCELLED: "bg-gray-500/10 text-gray-500",
};

type ActionType = "activate" | "suspend" | "cancel" | "reactivate" | "exempt" | "remove_exempt" | "extend" | "change_plan";

interface ActionDef {
  label: string;
  action: ActionType;
  needsInput?: "reason" | "days" | "plan";
  allowedStatuses: string[];
}

const ACTIONS: ActionDef[] = [
  { label: "Ativar", action: "activate", allowedStatuses: ["PENDING"] },
  { label: "Suspender", action: "suspend", allowedStatuses: ["ACTIVE", "PAST_DUE"] },
  { label: "Cancelar", action: "cancel", allowedStatuses: ["ACTIVE", "PAST_DUE", "SUSPENDED", "PENDING"] },
  { label: "Reativar", action: "reactivate", allowedStatuses: ["SUSPENDED", "CANCELLED"] },
  { label: "Isentar", action: "exempt", needsInput: "reason", allowedStatuses: ["PENDING", "ACTIVE", "PAST_DUE", "SUSPENDED"] },
  { label: "Remover isenção", action: "remove_exempt", allowedStatuses: ["ACTIVE"] },
  { label: "Estender período", action: "extend", needsInput: "days", allowedStatuses: ["ACTIVE", "PAST_DUE"] },
  { label: "Mudar plano", action: "change_plan", needsInput: "plan", allowedStatuses: ["ACTIVE", "PENDING"] },
];

export default function AdminSubscriptionsPage() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const [actionModal, setActionModal] = useState<{
    sub: Sub;
    def: ActionDef;
  } | null>(null);
  const [actionInput, setActionInput] = useState("");
  const [actionSaving, setActionSaving] = useState(false);

  const limit = 20;

  const loadSubs = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (statusFilter) params.set("status", statusFilter);
    if (planFilter) params.set("planId", planFilter);
    fetch(`/api/admin/subscriptions?${params}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setSubs(d.subscriptions);
          setTotal(d.total);
        }
      })
      .finally(() => setLoading(false));
  }, [page, statusFilter, planFilter]);

  useEffect(() => { loadSubs(); }, [loadSubs]);

  useEffect(() => {
    fetch("/api/admin/subscriptions/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setStats(d));
  }, []);

  useEffect(() => {
    fetch("/api/admin/plans")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setPlans(d.plans.map((p: PlanOption) => ({ id: p.id, name: p.name }))));
  }, []);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  function openAction(sub: Sub, def: ActionDef) {
    if (def.action === "remove_exempt" && !sub.exempt) return;
    setActionInput("");
    setActionModal({ sub, def });
  }

  async function execAction() {
    if (!actionModal) return;
    const { sub, def } = actionModal;

    if (def.needsInput === "reason" && !actionInput.trim()) return;
    if (def.needsInput === "days" && (!actionInput || parseInt(actionInput, 10) < 1)) return;
    if (def.needsInput === "plan" && !actionInput) return;

    if (!def.needsInput) {
      if (!confirm(`Confirma "${def.label}" para ${sub.user.name}?`)) return;
    }

    setActionSaving(true);
    setBusy(sub.id);
    try {
      const body: Record<string, unknown> = { action: def.action };
      if (def.needsInput === "reason") body.reason = actionInput;
      if (def.needsInput === "days") body.days = parseInt(actionInput, 10);
      if (def.needsInput === "plan") body.planId = actionInput;

      const res = await fetch(`/api/admin/subscriptions/${sub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Erro", false);
      } else {
        showToast(`"${def.label}" executado com sucesso`, true);
        loadSubs();
        fetch("/api/admin/subscriptions/stats")
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => d && setStats(d));
      }
    } finally {
      setActionSaving(false);
      setBusy(null);
      setActionModal(null);
    }
  }

  async function quickAction(sub: Sub, def: ActionDef) {
    if (def.needsInput) {
      openAction(sub, def);
      return;
    }
    if (!confirm(`Confirma "${def.label}" para ${sub.user.name}?`)) return;
    setBusy(sub.id);
    try {
      const res = await fetch(`/api/admin/subscriptions/${sub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: def.action }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Erro", false);
      } else {
        showToast(`"${def.label}" executado com sucesso`, true);
        loadSubs();
        fetch("/api/admin/subscriptions/stats")
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => d && setStats(d));
      }
    } finally {
      setBusy(null);
    }
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Assinaturas</h1>

      {/* Stats cards */}
      {stats ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="MRR" value={fmt.format(stats.mrr)} color="green" />
          <StatCard label="Ativos" value={String(stats.totalActive)} color="blue" />
          <StatCard label="Inadimplentes" value={String(stats.totalPastDue)} color="amber" />
          <StatCard label="Suspensos" value={String(stats.totalSuspended)} color="red" />
          <StatCard label="Isentos" value={String(stats.totalExempt)} color="gray" />
          <StatCard label="Receita do mês" value={fmt.format(stats.revenueThisMonth)} color="green" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={planFilter}
          onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os planos</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 text-left text-xs uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Produtor</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 hidden sm:table-cell">Vencimento</th>
                <th className="px-4 py-3 hidden sm:table-cell">Valor</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-5 w-24" /></td>
                    ))}
                  </tr>
                ))
              ) : subs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    Nenhuma assinatura encontrada
                  </td>
                </tr>
              ) : (
                subs.map((s) => {
                  const available = ACTIONS.filter(
                    (a) =>
                      a.allowedStatuses.includes(s.status) &&
                      (a.action !== "remove_exempt" || s.exempt)
                  );
                  return (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {s.user.avatarUrl ? (
                            <img
                              src={s.user.avatarUrl}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-xs font-bold text-blue-600">
                              {s.user.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">{s.user.name}</p>
                            <p className="text-xs text-gray-500 truncate">{s.user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white">{s.plan.name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[s.status] || ""}`}>
                          {STATUS_LABELS[s.status] || s.status}
                          {s.exempt && " (isento)"}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-gray-600 dark:text-gray-400">
                        {s.exempt
                          ? "Isento"
                          : s.currentPeriodEnd
                            ? new Date(s.currentPeriodEnd).toLocaleDateString("pt-BR")
                            : "—"}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-gray-900 dark:text-white font-medium">
                        {s.exempt ? "—" : fmt.format(s.plan.price)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {available.length > 0 && (
                          <ActionDropdown
                            actions={available}
                            disabled={busy === s.id}
                            onAction={(def) => quickAction(s, def)}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            Anterior
          </button>
          <span className="text-sm text-gray-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            Próxima
          </button>
        </div>
      )}

      {/* Action modal (for inputs) */}
      {actionModal && actionModal.def.needsInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm border border-gray-200 dark:border-gray-800 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {actionModal.def.label}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Produtor: <span className="font-medium text-gray-900 dark:text-white">{actionModal.sub.user.name}</span>
            </p>

            {actionModal.def.needsInput === "reason" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Motivo da isenção</label>
                <input
                  type="text"
                  value={actionInput}
                  onChange={(e) => setActionInput(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Parceiro estratégico"
                  autoFocus
                />
              </div>
            )}

            {actionModal.def.needsInput === "days" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dias para estender</label>
                <input
                  type="number"
                  min={1}
                  value={actionInput}
                  onChange={(e) => setActionInput(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="30"
                  autoFocus
                />
              </div>
            )}

            {actionModal.def.needsInput === "plan" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Novo plano</label>
                <select
                  value={actionInput}
                  onChange={(e) => setActionInput(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione...</option>
                  {plans
                    .filter((p) => p.id !== actionModal.sub.planId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setActionModal(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                onClick={execAction}
                disabled={actionSaving}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition"
              >
                {actionSaving ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border ${
            toast.ok
              ? "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20"
              : "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    green: "text-green-600 dark:text-green-400",
    blue: "text-blue-600 dark:text-blue-400",
    amber: "text-amber-600 dark:text-amber-400",
    red: "text-red-600 dark:text-red-400",
    gray: "text-gray-600 dark:text-gray-400",
  };
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-bold mt-1 ${colors[color] || ""}`}>{value}</p>
    </div>
  );
}

function ActionDropdown({
  actions,
  disabled,
  onAction,
}: {
  actions: ActionDef[];
  disabled: boolean;
  onAction: (def: ActionDef) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition disabled:opacity-40"
      >
        Ações
        <svg className="w-3 h-3 ml-1 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-50 w-44 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl py-1 overflow-hidden">
            {actions.map((a) => (
              <button
                key={a.action}
                onClick={() => {
                  setOpen(false);
                  onAction(a);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                {a.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

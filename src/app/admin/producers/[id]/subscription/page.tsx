"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface Plan {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  interval: string;
  maxWorkspaces: number;
  maxCoursesPerWorkspace: number;
  features: string | null;
}

interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paidAt: string | null;
  dueDate: string | null;
  createdAt: string;
}

interface Subscription {
  id: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelledAt: string | null;
  suspendedAt: string | null;
  exempt: boolean;
  exemptReason: string | null;
  plan: Plan;
  invoices: Invoice[];
}

interface Data {
  producer: { id: string; name: string; email: string; avatarUrl: string | null };
  subscription: Subscription | null;
  plans: Plan[];
  usage: { workspacesUsed: number; coursesUsed: number };
}

type Action =
  | "activate"
  | "suspend"
  | "cancel"
  | "reactivate"
  | "exempt"
  | "remove_exempt"
  | "change_plan"
  | "extend";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVE: { label: "Ativa", color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10" },
  PENDING: { label: "Aguardando", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
  PAST_DUE: { label: "Pag. pendente", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
  SUSPENDED: { label: "Suspensa", color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10" },
  CANCELLED: { label: "Cancelada", color: "text-gray-500", bg: "bg-gray-500/10" },
};

const INVOICE_STATUS: Record<string, { label: string; cls: string }> = {
  PAID: { label: "Paga", cls: "bg-green-500/10 text-green-600 dark:text-green-400" },
  PENDING: { label: "Pendente", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  FAILED: { label: "Falhou", cls: "bg-red-500/10 text-red-600 dark:text-red-400" },
  REFUNDED: { label: "Reembolsada", cls: "bg-gray-500/10 text-gray-500" },
};

const ACTIONS_BY_STATUS: Record<string, { action: Action; label: string; variant: string }[]> = {
  PENDING: [
    { action: "activate", label: "Ativar", variant: "green" },
    { action: "exempt", label: "Isentar", variant: "amber" },
    { action: "cancel", label: "Cancelar", variant: "red" },
  ],
  ACTIVE: [
    { action: "suspend", label: "Suspender", variant: "amber" },
    { action: "cancel", label: "Cancelar", variant: "red" },
    { action: "change_plan", label: "Trocar plano", variant: "blue" },
    { action: "extend", label: "Estender", variant: "blue" },
  ],
  PAST_DUE: [
    { action: "suspend", label: "Suspender", variant: "amber" },
    { action: "cancel", label: "Cancelar", variant: "red" },
    { action: "extend", label: "Estender", variant: "blue" },
  ],
  SUSPENDED: [
    { action: "reactivate", label: "Reativar", variant: "green" },
    { action: "cancel", label: "Cancelar", variant: "red" },
    { action: "exempt", label: "Isentar", variant: "amber" },
  ],
  CANCELLED: [
    { action: "reactivate", label: "Reativar", variant: "green" },
  ],
};

const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

export default function ProducerSubscriptionPage({
  params,
}: {
  params: { id: string };
}) {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [modal, setModal] = useState<{
    action: Action;
    open: boolean;
  } | null>(null);
  const [modalPlanId, setModalPlanId] = useState("");
  const [modalDays, setModalDays] = useState("30");
  const [modalReason, setModalReason] = useState("");

  const [createPlanId, setCreatePlanId] = useState("");
  const [createExempt, setCreateExempt] = useState(false);
  const [createReason, setCreateReason] = useState("");

  function load() {
    setLoading(true);
    fetch(`/api/admin/producers/${params.id}/subscription`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setData(d);
        if (d?.plans?.length && !createPlanId) {
          setCreatePlanId(d.plans[0].id);
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleAction(action: Action) {
    if (!data?.subscription) return;
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { action };
      if (action === "change_plan") body.planId = modalPlanId;
      if (action === "extend") body.days = parseInt(modalDays, 10);
      if (action === "exempt") body.reason = modalReason;

      const res = await fetch(`/api/admin/subscriptions/${data.subscription.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Erro ao executar ação");
      }

      setModal(null);
      showToast(`Ação "${action}" executada com sucesso`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/producers/${params.id}/subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: createPlanId,
          exempt: createExempt,
          exemptReason: createReason || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Erro ao criar assinatura");
      }
      showToast("Assinatura criada com sucesso");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  function openActionModal(action: Action) {
    setModalPlanId(data?.plans?.[0]?.id || "");
    setModalDays("30");
    setModalReason("");
    setError(null);
    setModal({ action, open: true });
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }
  if (!data) return <p className="text-sm text-gray-500">Não encontrado.</p>;

  const sub = data.subscription;
  const statusActions = sub ? (ACTIONS_BY_STATUS[sub.status] || []) : [];
  const activeExemptActions = sub?.exempt
    ? [{ action: "remove_exempt" as Action, label: "Remover isenção", variant: "gray" }]
    : [];
  const allActions = [...statusActions, ...activeExemptActions];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl bg-green-600 text-white text-sm font-medium shadow-lg animate-in fade-in slide-in-from-top-2">
          {toast}
        </div>
      )}

      <Link
        href={`/admin/producers/${params.id}`}
        className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
      >
        ← Voltar
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Assinatura
        </h1>
        <div className="flex items-center gap-3 mt-1">
          {data.producer.avatarUrl ? (
            <img
              src={data.producer.avatarUrl}
              alt=""
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
              {data.producer.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {data.producer.name}
            </p>
            <p className="text-xs text-gray-500">{data.producer.email}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl border bg-red-50 dark:bg-red-500/5 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {!sub ? (
        /* No subscription — create form */
        <section className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Sem assinatura ativa
            </h2>
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-500/10 text-gray-500">
              Sem plano
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Crie uma assinatura para este produtor:
          </p>
          <form onSubmit={handleCreate} className="space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                Plano
              </span>
              <select
                value={createPlanId}
                onChange={(e) => setCreatePlanId(e.target.value)}
                className={inputCls}
              >
                {data.plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {fmt.format(p.price)}/{p.interval === "yearly" ? "ano" : "mês"}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={createExempt}
                onChange={(e) => setCreateExempt(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-700"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Isento de cobrança
              </span>
            </label>
            {createExempt && (
              <label className="block">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                  Motivo da isenção
                </span>
                <input
                  type="text"
                  value={createReason}
                  onChange={(e) => setCreateReason(e.target.value)}
                  className={inputCls}
                  placeholder="Ex: parceiro estratégico"
                />
              </label>
            )}
            <Button type="submit" disabled={busy || !createPlanId}>
              {busy ? "Criando…" : "Criar assinatura"}
            </Button>
          </form>
        </section>
      ) : (
        <>
          {/* Plan card */}
          <section className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6 space-y-4">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {sub.plan.name}
                  </h3>
                  <StatusBadge status={sub.status} exempt={sub.exempt} />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {sub.exempt ? "Isento" : fmt.format(sub.plan.price)}
                  {!sub.exempt && (
                    <span className="text-sm font-normal text-gray-500">
                      /{sub.plan.interval === "yearly" ? "ano" : "mês"}
                    </span>
                  )}
                </p>
              </div>
              <div className="text-right text-xs text-gray-500 space-y-0.5">
                {sub.currentPeriodStart && (
                  <p>Início: {fmtDate(sub.currentPeriodStart)}</p>
                )}
                {sub.currentPeriodEnd && (
                  <p>Fim: {fmtDate(sub.currentPeriodEnd)}</p>
                )}
                {sub.cancelledAt && (
                  <p>Cancelada em: {fmtDate(sub.cancelledAt)}</p>
                )}
                {sub.suspendedAt && (
                  <p>Suspensa em: {fmtDate(sub.suspendedAt)}</p>
                )}
              </div>
            </div>

            {sub.exempt && sub.exemptReason && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                <span className="text-sm text-amber-700 dark:text-amber-400">
                  Isento: {sub.exemptReason}
                </span>
              </div>
            )}

            {/* Plan limits */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-950">
                <span className="text-gray-500">Max workspaces</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {sub.plan.maxWorkspaces}
                </span>
              </div>
              <div className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-950">
                <span className="text-gray-500">Max cursos/ws</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {sub.plan.maxCoursesPerWorkspace}
                </span>
              </div>
            </div>

            {/* Actions */}
            {allActions.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100 dark:border-white/[0.04]">
                {allActions.map(({ action, label, variant }) => (
                  <button
                    key={action}
                    onClick={() => {
                      if (action === "change_plan" || action === "extend" || action === "exempt") {
                        openActionModal(action);
                      } else {
                        openActionModal(action);
                      }
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${variantCls(variant)}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Usage */}
          <section className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
              Uso atual
            </h3>
            <UsageBar
              label="Workspaces"
              used={data.usage.workspacesUsed}
              max={sub.plan.maxWorkspaces}
            />
            <UsageBar
              label="Cursos (total)"
              used={data.usage.coursesUsed}
              max={sub.plan.maxCoursesPerWorkspace * Math.max(data.usage.workspacesUsed, 1)}
            />
          </section>

          {/* Invoices */}
          <section className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-white/[0.04]">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                Faturas
              </h3>
            </div>
            {sub.invoices.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-gray-500">
                Nenhuma fatura
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-widest text-gray-500 border-b border-gray-200 dark:border-white/[0.06]">
                      <th className="px-6 py-3 font-medium">Data</th>
                      <th className="px-6 py-3 font-medium">Vencimento</th>
                      <th className="px-6 py-3 font-medium">Valor</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {sub.invoices.map((inv) => {
                      const s = INVOICE_STATUS[inv.status] || { label: inv.status, cls: "" };
                      return (
                        <tr key={inv.id} className="border-b border-gray-100 dark:border-white/[0.04] last:border-0 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors duration-150">
                          <td className="px-6 py-3 text-gray-900 dark:text-white">
                            {fmtDate(inv.paidAt || inv.createdAt)}
                          </td>
                          <td className="px-6 py-3 text-gray-500">
                            {fmtDate(inv.dueDate)}
                          </td>
                          <td className="px-6 py-3 text-gray-900 dark:text-white font-medium">
                            {fmt.format(inv.amount)}
                          </td>
                          <td className="px-6 py-3">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${s.cls}`}>
                              {s.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* Action modal */}
      {modal?.open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {actionTitle(modal.action)}
            </h3>

            {modal.action === "change_plan" && (
              <label className="block">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                  Novo plano
                </span>
                <select
                  value={modalPlanId}
                  onChange={(e) => setModalPlanId(e.target.value)}
                  className={inputCls}
                >
                  {data.plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {fmt.format(p.price)}/{p.interval === "yearly" ? "ano" : "mês"}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {modal.action === "extend" && (
              <label className="block">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                  Dias para estender
                </span>
                <input
                  type="number"
                  min="1"
                  value={modalDays}
                  onChange={(e) => setModalDays(e.target.value)}
                  className={inputCls}
                />
              </label>
            )}

            {modal.action === "exempt" && (
              <label className="block">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                  Motivo da isenção
                </span>
                <input
                  type="text"
                  value={modalReason}
                  onChange={(e) => setModalReason(e.target.value)}
                  className={inputCls}
                  placeholder="Ex: parceiro, beta tester"
                />
              </label>
            )}

            {!["change_plan", "extend", "exempt"].includes(modal.action) && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Tem certeza que deseja executar esta ação?
              </p>
            )}

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setModal(null); setError(null); }}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
              >
                Cancelar
              </button>
              <Button
                onClick={() => handleAction(modal.action)}
                disabled={busy}
              >
                {busy ? "Executando…" : "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls =
  "w-full bg-gray-50 dark:bg-white/[0.04] border border-gray-300 dark:border-white/[0.08] rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-colors duration-200";

function StatusBadge({ status, exempt }: { status: string; exempt: boolean }) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return null;
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
      {exempt && " (isento)"}
    </span>
  );
}

function UsageBar({ label, used, max }: { label: string; used: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (used / max) * 100) : 0;
  const warn = pct >= 80;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-700 dark:text-gray-300">{label}</span>
        <span className={`font-medium ${warn ? "text-amber-600 dark:text-amber-400" : "text-gray-900 dark:text-white"}`}>
          {used} de {max}
        </span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${warn ? "bg-amber-500" : "bg-blue-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function variantCls(v: string) {
  switch (v) {
    case "green":
      return "text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/20 hover:bg-green-50 dark:hover:bg-green-500/5";
    case "amber":
      return "text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20 hover:bg-amber-50 dark:hover:bg-amber-500/5";
    case "red":
      return "text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20 hover:bg-red-50 dark:hover:bg-red-500/5";
    case "gray":
      return "text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800";
    default:
      return "text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20 hover:bg-blue-50 dark:hover:bg-blue-500/5";
  }
}

function actionTitle(action: Action) {
  const map: Record<Action, string> = {
    activate: "Ativar assinatura",
    suspend: "Suspender assinatura",
    cancel: "Cancelar assinatura",
    reactivate: "Reativar assinatura",
    exempt: "Isentar de cobrança",
    remove_exempt: "Remover isenção",
    change_plan: "Trocar plano",
    extend: "Estender período",
  };
  return map[action] || action;
}

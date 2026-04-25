"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfirm } from "@/hooks/use-confirm";

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

interface BillingData {
  subscription: Subscription | null;
  plans: Plan[];
  usage: { workspacesUsed: number; coursesUsed: number };
}

const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVE: { label: "Ativa", color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10" },
  PENDING: { label: "Aguardando pagamento", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
  PAST_DUE: { label: "Pagamento pendente", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
  SUSPENDED: { label: "Suspensa", color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10" },
  CANCELLED: { label: "Cancelada", color: "text-gray-500", bg: "bg-gray-500/10" },
};

const INVOICE_STATUS: Record<string, { label: string; cls: string }> = {
  PAID: { label: "Paga", cls: "bg-green-500/10 text-green-600 dark:text-green-400" },
  PENDING: { label: "Pendente", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  FAILED: { label: "Falhou", cls: "bg-red-500/10 text-red-600 dark:text-red-400" },
  REFUNDED: { label: "Reembolsada", cls: "bg-gray-500/10 text-gray-500" },
};

export default function ProducerBillingPage() {
  return (
    <Suspense fallback={<div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 rounded-xl" /></div>}>
      <BillingContent />
    </Suspense>
  );
}

function BillingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [toast, setToast] = useState<{ message: string; color: string } | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [pollingTimeout, setPollingTimeout] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  const showToast = useCallback((message: string, color: string = "green") => {
    setToast({ message, color });
    setTimeout(() => setToast(null), 5000);
  }, []);

  const loadSilent = useCallback(() => {
    return fetch("/api/producer/billing")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setData(d); return d; });
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    loadSilent().finally(() => setLoading(false));
  }, [loadSilent]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get("success") !== "true") return;

    setShowSuccess(true);
    window.history.replaceState({}, "", window.location.pathname);

    const startedAt = Date.now();
    const interval = setInterval(async () => {
      const d = await loadSilent();
      if (d?.subscription?.status === "ACTIVE") {
        clearInterval(interval);
        router.replace("/producer?welcome=true");
        return;
      } else if (Date.now() - startedAt > 60000) {
        clearInterval(interval);
        setPollingTimeout(true);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [searchParams, loadSilent, showToast, router]);

  async function handleCheckout() {
    setCheckingOut(true);
    try {
      const res = await fetch("/api/producer/billing/checkout", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.checkoutUrl) {
        showToast(body.error || "Erro ao gerar checkout", "red");
        return;
      }
      window.location.href = body.checkoutUrl;
    } catch {
      showToast("Erro ao gerar checkout. Tente novamente.", "red");
    } finally {
      setCheckingOut(false);
    }
  }

  async function handleCancel() {
    if (!(await confirm({ title: "Cancelar assinatura", message: "Tem certeza que deseja cancelar sua assinatura? Você manterá acesso até o fim do período pago.", variant: "warning", confirmText: "Cancelar assinatura" }))) return;
    setCancelling(true);
    try {
      const res = await fetch("/api/producer/billing/cancel", { method: "POST" });
      if (res.ok) load();
      else {
        const d = await res.json().catch(() => ({}));
        showToast(d.error || "Erro ao cancelar", "red");
      }
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  if (!data) return null;

  const { subscription: sub, plans, usage } = data;
  const checkoutLabel = checkingOut ? "Gerando checkout..." : "Assinar agora";

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-white text-sm font-medium shadow-lg animate-in fade-in slide-in-from-top-2 ${
          toast.color === "red" ? "bg-red-600" : "bg-green-600"
        }`}>
          {toast.message}
        </div>
      )}

      {showSuccess && (
        <div className="bg-white dark:bg-white/5 border border-green-200 dark:border-green-500/20 rounded-2xl p-8 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Pagamento realizado com sucesso!
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Sua assinatura será ativada em alguns instantes.
          </p>
          <p className="text-sm text-gray-500">
            Você receberá um email de confirmação.
          </p>
          {pollingTimeout && (
            <div className="px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 text-sm text-amber-700 dark:text-amber-400">
              A ativação está demorando mais que o esperado. Recarregue a página em alguns minutos.
            </div>
          )}
          {!pollingTimeout && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Aguardando confirmação...
            </div>
          )}
          <a
            href="/producer"
            className="inline-block px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition text-sm"
          >
            Ir para o painel
          </a>
        </div>
      )}

      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Assinatura</h1>
        <p className="text-sm text-gray-500 mt-1">Gerencie seu plano e pagamentos</p>
      </div>

      {/* Alert banners */}
      {(!sub || sub.status === "PENDING") && (
        <Banner color="blue">
          Assine o Members Club para liberar todos os recursos.
        </Banner>
      )}
      {sub?.status === "PAST_DUE" && (
        <Banner color="amber">
          Seu pagamento está pendente. Regularize para evitar suspensão.
        </Banner>
      )}
      {sub?.status === "SUSPENDED" && (
        <Banner color="red">
          Sua conta está suspensa. Seus alunos não conseguem acessar os cursos. Regularize agora.
        </Banner>
      )}

      {!sub || sub.status === "PENDING" ? (
        /* No subscription or PENDING — show available plans */
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Escolha seu plano para começar
          </p>
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl p-6 space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    {fmt.format(plan.price)}
                    <span className="text-base font-normal text-gray-500">
                      /{plan.interval === "yearly" ? "ano" : "mês"}
                    </span>
                  </p>
                </div>
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  Recomendado
                </span>
              </div>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <Feature>{plan.maxWorkspaces} workspaces</Feature>
                <Feature>{plan.maxCoursesPerWorkspace} cursos por workspace</Feature>
                <Feature>Alunos ilimitados</Feature>
                <Feature>Comunidade integrada</Feature>
                <Feature>Certificados automáticos</Feature>
                <Feature>Suporte prioritário</Feature>
              </ul>
              <button
                onClick={handleCheckout}
                disabled={checkingOut}
                className="block w-full text-center px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition text-sm disabled:opacity-50"
              >
                {checkoutLabel}
              </button>
            </div>
          ))}
        </div>
      ) : (
        /* Has subscription */
        <>
          {/* Plan card */}
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl p-6 space-y-4">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{sub.plan.name}</h3>
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
            </div>

            {/* Status detail */}
            <StatusDetail sub={sub} />

            {/* Exempt badge */}
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

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100 dark:border-white/5">
              {(sub.status === "ACTIVE" || sub.status === "PAST_DUE") && !sub.exempt && (
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 hover:bg-red-50 dark:hover:bg-red-500/5 rounded-lg transition disabled:opacity-50"
                >
                  {cancelling ? "Cancelando..." : "Cancelar assinatura"}
                </button>
              )}
              {sub.status === "PAST_DUE" && (
                <button
                  onClick={handleCheckout}
                  disabled={checkingOut}
                  className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition disabled:opacity-50"
                >
                  {checkingOut ? "Gerando checkout..." : "Regularizar pagamento"}
                </button>
              )}
              {(sub.status === "SUSPENDED" || sub.status === "CANCELLED") && (
                <button
                  onClick={handleCheckout}
                  disabled={checkingOut}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition disabled:opacity-50"
                >
                  {checkingOut ? "Gerando checkout..." : "Reativar assinatura"}
                </button>
              )}
            </div>
          </div>

          {/* Usage bars */}
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Uso atual</h3>
            <UsageBar
              label="Workspaces"
              used={usage.workspacesUsed}
              max={sub.plan.maxWorkspaces}
            />
            <UsageBar
              label="Cursos (total)"
              used={usage.coursesUsed}
              max={sub.plan.maxCoursesPerWorkspace * Math.max(usage.workspacesUsed, 1)}
            />
          </div>

          {/* Invoices */}
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Histórico de faturas</h3>
            </div>
            {sub.invoices.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-gray-500">
                Nenhuma fatura ainda
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-widest text-gray-500 border-b border-gray-200 dark:border-white/5">
                    <th className="px-6 py-3 font-medium">Data</th>
                    <th className="px-6 py-3 font-medium">Valor</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {sub.invoices.map((inv) => {
                    const s = INVOICE_STATUS[inv.status] || { label: inv.status, cls: "" };
                    return (
                      <tr key={inv.id}>
                        <td className="px-6 py-3 text-gray-900 dark:text-white">
                          {fmtDate(inv.paidAt || inv.createdAt)}
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
            )}
          </div>
        </>
      )}
      <ConfirmDialog />
    </div>
  );
}

function Banner({ color, children }: { color: string; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 dark:bg-blue-500/5 border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400",
    amber: "bg-amber-50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400",
    red: "bg-red-50 dark:bg-red-500/5 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400",
  };
  return (
    <div className={`px-4 py-3 rounded-xl border text-sm font-medium ${colors[color] || ""}`}>
      {children}
    </div>
  );
}

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

function StatusDetail({ sub }: { sub: Subscription }) {
  const end = sub.currentPeriodEnd ? fmtDate(sub.currentPeriodEnd) : null;

  switch (sub.status) {
    case "ACTIVE":
      return end ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {sub.exempt ? "Acesso ilimitado" : `Próxima cobrança em ${end}`}
        </p>
      ) : null;
    case "PAST_DUE":
      return (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Regularize{end ? ` até ${end}` : ""} para evitar suspensão
        </p>
      );
    case "SUSPENDED":
      return (
        <p className="text-sm text-red-600 dark:text-red-400">
          Seus alunos não têm acesso. Regularize para reativar.
        </p>
      );
    case "CANCELLED":
      return (
        <p className="text-sm text-gray-500">
          {end ? `Acesso até ${end}` : "Cancelada"}
        </p>
      );
    case "PENDING":
      return (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Conclua o pagamento para ativar
        </p>
      );
    default:
      return null;
  }
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
      {children}
    </li>
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
      <div className="h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${
            warn ? "bg-amber-500" : "bg-blue-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

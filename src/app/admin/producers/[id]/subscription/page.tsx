"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface Subscription {
  id: string;
  plan: string;
  amount: number;
  currency: string;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  startedAt: string;
  expiresAt: string | null;
  createdAt: string;
}

interface Data {
  producer: { id: string; name: string; email: string };
  current: Subscription | null;
  subscriptions: Subscription[];
}

const PLANS = ["Free", "Basic", "Pro", "Enterprise"];

export default function SubscriptionPage({
  params,
}: {
  params: { id: string };
}) {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState("Basic");
  const [amount, setAmount] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    fetch(`/api/admin/producers/${params.id}/subscription`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setData(d);
        if (d?.current) {
          setPlan(d.current.plan);
          setAmount(String(d.current.amount));
          setStartedAt(d.current.startedAt.slice(0, 10));
          setExpiresAt(d.current.expiresAt?.slice(0, 10) ?? "");
        }
      })
      .finally(() => setLoading(false));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/producers/${params.id}/subscription`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan,
            amount: parseFloat(amount) || 0,
            startedAt: startedAt || undefined,
            expiresAt: expiresAt || null,
          }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Falha");
      }
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(
    subscriptionId: string,
    status: "ACTIVE" | "EXPIRED" | "CANCELLED"
  ) {
    if (!confirm(`Alterar status para ${status}?`)) return;
    try {
      const res = await fetch(
        `/api/admin/producers/${params.id}/subscription`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscriptionId, status }),
        }
      );
      if (!res.ok) throw new Error();
      load();
    } catch {
      alert("Erro ao atualizar");
    }
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

  return (
    <div className="space-y-6">
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
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {data.producer.name} — {data.producer.email}
        </p>
      </div>

      {/* Current + form */}
      <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Plano ativo
          </h2>
          {data.current ? (
            <StatusPill status={data.current.status} />
          ) : (
            <span className="text-xs text-gray-500">Sem plano ativo</span>
          )}
        </div>

        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Plano">
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className={inputCls}
            >
              {PLANS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Valor mensal (BRL)">
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputCls}
              placeholder="0.00"
            />
          </Field>
          <Field label="Data de início">
            <input
              type="date"
              value={startedAt}
              onChange={(e) => setStartedAt(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Data de expiração (opcional)">
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className={inputCls}
            />
          </Field>
          <div className="sm:col-span-2 flex items-center gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando…" : data.current ? "Atualizar plano" : "Criar plano"}
            </Button>
            {error && <p className="text-sm text-rose-500">{error}</p>}
          </div>
        </form>
      </section>

      {/* History */}
      <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
          Histórico
        </h2>
        {data.subscriptions.length === 0 ? (
          <p className="text-sm text-gray-500">Sem histórico.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-200 dark:border-gray-800 text-xs uppercase tracking-wider text-gray-500">
                  <th className="py-2 pr-4 font-medium">Plano</th>
                  <th className="py-2 pr-4 font-medium">Valor</th>
                  <th className="py-2 pr-4 font-medium">Início</th>
                  <th className="py-2 pr-4 font-medium">Expira</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {data.subscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="py-3 pr-4 text-gray-900 dark:text-white font-medium">
                      {s.plan}
                    </td>
                    <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                      {formatMoney(s.amount, s.currency)}
                    </td>
                    <td className="py-3 pr-4 text-gray-500">
                      {formatDate(s.startedAt)}
                    </td>
                    <td className="py-3 pr-4 text-gray-500">
                      {s.expiresAt ? formatDate(s.expiresAt) : "—"}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusPill status={s.status} />
                    </td>
                    <td className="py-3 pr-4 text-right">
                      {s.status === "ACTIVE" && (
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => changeStatus(s.id, "EXPIRED")}
                            className="text-xs text-amber-600 dark:text-amber-400 hover:underline"
                          >
                            Marcar expirado
                          </button>
                          <button
                            onClick={() => changeStatus(s.id, "CANCELLED")}
                            className="text-xs text-rose-600 dark:text-rose-400 hover:underline"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

const inputCls =
  "w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
        {label}
      </span>
      {children}
    </label>
  );
}

function StatusPill({
  status,
}: {
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
}) {
  const map = {
    ACTIVE: {
      label: "Ativo",
      cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    EXPIRED: {
      label: "Expirado",
      cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    CANCELLED: {
      label: "Cancelado",
      cls: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    },
  }[status];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map.cls}`}
    >
      {map.label}
    </span>
  );
}

function formatDate(v: string) {
  try {
    return new Date(v).toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
}
function formatMoney(v: number, currency = "BRL") {
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(v);
  } catch {
    return `R$ ${v.toFixed(2)}`;
  }
}

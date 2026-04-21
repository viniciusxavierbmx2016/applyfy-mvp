"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

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
  active: boolean;
  _count: { subscriptions: number };
}

interface PlanForm {
  name: string;
  slug: string;
  price: string;
  interval: string;
  maxWorkspaces: string;
  maxCoursesPerWorkspace: string;
  active: boolean;
}

const emptyForm: PlanForm = {
  name: "",
  slug: "",
  price: "",
  interval: "monthly",
  maxWorkspaces: "10",
  maxCoursesPerWorkspace: "30",
  active: true,
};

const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<PlanForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function loadPlans() {
    setLoading(true);
    fetch("/api/admin/plans")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setPlans(d.plans))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadPlans(); }, []);

  function openCreate() {
    setForm(emptyForm);
    setEditId(null);
    setError("");
    setModal("create");
  }

  function openEdit(p: Plan) {
    setForm({
      name: p.name,
      slug: p.slug,
      price: String(p.price),
      interval: p.interval,
      maxWorkspaces: String(p.maxWorkspaces),
      maxCoursesPerWorkspace: String(p.maxCoursesPerWorkspace),
      active: p.active,
    });
    setEditId(p.id);
    setError("");
    setModal("edit");
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        price: parseFloat(form.price),
        interval: form.interval,
        maxWorkspaces: parseInt(form.maxWorkspaces, 10),
        maxCoursesPerWorkspace: parseInt(form.maxCoursesPerWorkspace, 10),
        active: form.active,
      };

      if (modal === "create") {
        body.slug = form.slug;
        const res = await fetch("/api/admin/plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error); return; }
      } else {
        const res = await fetch(`/api/admin/plans/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error); return; }
      }

      setModal(null);
      loadPlans();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(p: Plan) {
    setBusy(p.id);
    await fetch(`/api/admin/plans/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !p.active }),
    });
    loadPlans();
    setBusy(null);
  }

  async function deletePlan(p: Plan) {
    if (!confirm(`Excluir o plano "${p.name}"? Esta ação não pode ser desfeita.`)) return;
    setBusy(p.id);
    const res = await fetch(`/api/admin/plans/${p.id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      showToast(d.error || "Erro ao excluir");
    }
    loadPlans();
    setBusy(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Planos</h1>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition"
        >
          Criar plano
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 mx-auto rounded-full bg-indigo-500/10 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400">Nenhum plano cadastrado.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.id}
              className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-5 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{p.name}</h3>
                  <p className="text-xs text-gray-500 font-mono">{p.slug}</p>
                </div>
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    p.active
                      ? "bg-green-500/10 text-green-600 dark:text-green-400"
                      : "bg-gray-500/10 text-gray-500"
                  }`}
                >
                  {p.active ? "Ativo" : "Inativo"}
                </span>
              </div>

              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {fmt.format(p.price)}
                <span className="text-sm font-normal text-gray-500">
                  /{p.interval === "yearly" ? "ano" : "mês"}
                </span>
              </p>

              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <p>{p.maxWorkspaces} workspaces • {p.maxCoursesPerWorkspace} cursos</p>
                <p className="text-indigo-600 dark:text-indigo-400 font-medium">
                  {p._count.subscriptions} produtor{p._count.subscriptions !== 1 ? "es" : ""}
                </p>
              </div>

              <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-white/[0.06]">
                <button
                  onClick={() => openEdit(p)}
                  disabled={busy === p.id}
                  className="flex-1 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.04] hover:bg-gray-200 dark:hover:bg-white/[0.06] rounded-xl transition"
                >
                  Editar
                </button>
                <button
                  onClick={() => toggleActive(p)}
                  disabled={busy === p.id}
                  className="flex-1 px-3 py-1.5 text-sm font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition"
                >
                  {p.active ? "Desativar" : "Ativar"}
                </button>
                <button
                  onClick={() => deletePlan(p)}
                  disabled={busy === p.id}
                  className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal criar/editar */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white dark:bg-white/[0.03] rounded-2xl p-6 w-full max-w-md border border-gray-200 dark:border-white/[0.06] shadow-xl space-y-4 backdrop-blur-xl">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {modal === "create" ? "Criar plano" : "Editar plano"}
            </h2>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setForm((f) => ({
                      ...f,
                      name,
                      ...(modal === "create" ? { slug: slugify(name) } : {}),
                    }));
                  }}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-white/[0.04] border border-gray-300 dark:border-white/[0.08] rounded-xl text-gray-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition"
                  placeholder="Ex: Pro"
                />
              </div>

              {modal === "create" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slug</label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="pro"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preço (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-white/[0.04] border border-gray-300 dark:border-white/[0.08] rounded-xl text-gray-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition"
                    placeholder="97.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Intervalo</label>
                  <select
                    value={form.interval}
                    onChange={(e) => setForm((f) => ({ ...f, interval: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-white/[0.04] border border-gray-300 dark:border-white/[0.08] rounded-xl text-gray-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition"
                  >
                    <option value="monthly">Mensal</option>
                    <option value="yearly">Anual</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Máx workspaces</label>
                  <input
                    type="number"
                    value={form.maxWorkspaces}
                    onChange={(e) => setForm((f) => ({ ...f, maxWorkspaces: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-white/[0.04] border border-gray-300 dark:border-white/[0.08] rounded-xl text-gray-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Máx cursos/ws</label>
                  <input
                    type="number"
                    value={form.maxCoursesPerWorkspace}
                    onChange={(e) => setForm((f) => ({ ...f, maxCoursesPerWorkspace: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-white/[0.04] border border-gray-300 dark:border-white/[0.08] rounded-xl text-gray-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                  className="rounded"
                />
                Plano ativo
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setModal(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.04] hover:bg-gray-200 dark:hover:bg-white/[0.06] rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name || !form.price}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-lg shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

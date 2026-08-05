"use client";

import { useEffect, useState } from "react";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  supportEmail: string | null;
  supportWhatsapp: string | null;
}

const HeadsetIcon = ({ className = "" }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
    <path d="M4 14h2a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
    <path d="M20 14h-2a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1z" />
  </svg>
);

const inputCls =
  "w-full bg-gray-100 dark:bg-white/[0.04] border border-gray-300 dark:border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20";
const labelCls = "text-xs text-gray-500 dark:text-gray-400 mb-1 block";

export default function ProducerSupportPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  // Estado POR CARD (chaveado por workspace id) — salvar um não mexe nos outros.
  const [values, setValues] = useState<
    Record<string, { email: string; whatsapp: string }>
  >({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/workspaces")
      .then((r) => (r.ok ? r.json() : { workspaces: [] }))
      .then((d) => {
        const list: Workspace[] = d.workspaces || [];
        setWorkspaces(list);
        const init: Record<string, { email: string; whatsapp: string }> = {};
        for (const w of list) {
          init[w.id] = {
            email: w.supportEmail || "",
            whatsapp: w.supportWhatsapp || "",
          };
        }
        setValues(init);
      })
      .finally(() => setLoading(false));
  }, []);

  function setField(id: string, field: "email" | "whatsapp", v: string) {
    setValues((prev) => ({ ...prev, [id]: { ...prev[id], [field]: v } }));
    setSaved((prev) => ({ ...prev, [id]: false }));
    setErrors((prev) => ({ ...prev, [id]: "" }));
  }

  async function handleSave(id: string) {
    setSaving((prev) => ({ ...prev, [id]: true }));
    setErrors((prev) => ({ ...prev, [id]: "" }));
    try {
      const v = values[id] || { email: "", whatsapp: "" };
      const r = await fetch(`/api/workspaces/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supportEmail: v.email.trim() || null,
          supportWhatsapp: v.whatsapp.trim() || null,
        }),
      });
      if (!r.ok) {
        const b = await r.json().catch(() => ({}));
        setErrors((prev) => ({
          ...prev,
          [id]: b?.error || "Erro ao salvar",
        }));
        return;
      }
      setSaved((prev) => ({ ...prev, [id]: true }));
    } finally {
      setSaving((prev) => ({ ...prev, [id]: false }));
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl">
        <div className="animate-pulse h-32 bg-gray-100 dark:bg-white/5 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          Contato de suporte
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Este é o contato que seus alunos veem quando precisam falar com você.
          Se ficar vazio, eles verão o email e o telefone da sua conta pessoal.
        </p>
      </div>

      {workspaces.length === 0 && (
        <div className="bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-xl p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Você ainda não tem nenhum workspace.
          </p>
        </div>
      )}

      {workspaces.map((w) => (
        <div
          key={w.id}
          className="bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-500/10 flex items-center justify-center">
              <HeadsetIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {w.name}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                /{w.slug}
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Email de suporte</label>
              <input
                type="email"
                value={values[w.id]?.email ?? ""}
                onChange={(e) => setField(w.id, "email", e.target.value)}
                placeholder="suporte@suaempresa.com"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>WhatsApp de suporte</label>
              <input
                type="tel"
                value={values[w.id]?.whatsapp ?? ""}
                onChange={(e) => setField(w.id, "whatsapp", e.target.value)}
                placeholder="(11) 99999-9999"
                className={inputCls}
              />
            </div>
          </div>

          {errors[w.id] && (
            <p className="text-red-500 text-xs mt-3">{errors[w.id]}</p>
          )}

          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={() => handleSave(w.id)}
              disabled={saving[w.id]}
              className="px-4 py-2.5 bg-primary hover:bg-primary text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving[w.id] ? "Salvando..." : "Salvar"}
            </button>
            {saved[w.id] && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400">
                Salvo
              </span>
            )}
          </div>
        </div>
      ))}

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Se um curso tiver contato de suporte próprio, ele tem prioridade sobre o
        contato do workspace.
      </p>
    </div>
  );
}

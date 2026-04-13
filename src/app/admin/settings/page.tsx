"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface SettingStatus {
  set: boolean;
  preview: string;
}

export default function AdminSettingsPage() {
  const [status, setStatus] = useState<Record<string, SettingStatus>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hottok, setHottok] = useState("");
  const [stripeSecret, setStripeSecret] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    fetch("/api/admin/settings")
      .then((r) => (r.ok ? r.json() : { settings: {} }))
      .then((d) => setStatus(d.settings || {}))
      .finally(() => setLoading(false));
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function save(key: string, value: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { [key]: value } }),
      });
      if (res.ok) {
        const reload = await fetch("/api/admin/settings");
        if (reload.ok) {
          const d = await reload.json();
          setStatus(d.settings || {});
        }
        if (key === "hotmart_hottok") setHottok("");
        if (key === "stripe_webhook_secret") setStripeSecret("");
        showToast(value ? "Salvo" : "Removido");
      } else {
        showToast("Erro ao salvar");
      }
    } finally {
      setSaving(false);
    }
  }

  const hotmartUrl = `${origin}/api/webhooks/hotmart`;
  const stripeUrl = `${origin}/api/webhooks/stripe`;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Configurações</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Configure os segredos dos webhooks de pagamento. Os valores são armazenados com
        segurança no banco e nunca são exibidos em texto puro após salvar.
      </p>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Hotmart */}
          <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Hotmart</h2>
            <p className="text-xs text-gray-500 mb-4">
              Webhook URL:{" "}
              <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-300">
                {hotmartUrl}
              </code>
            </p>

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Hottok
            </label>
            {status.hotmart_hottok?.set && (
              <p className="text-xs text-green-400 mb-2">
                ✓ Configurado (termina em {status.hotmart_hottok.preview})
              </p>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="password"
                value={hottok}
                onChange={(e) => setHottok(e.target.value)}
                placeholder={
                  status.hotmart_hottok?.set
                    ? "Digite um novo valor para substituir"
                    : "Cole o hottok da Hotmart"
                }
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => save("hotmart_hottok", hottok.trim())}
                disabled={!hottok.trim() || saving}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
              >
                Salvar
              </button>
              {status.hotmart_hottok?.set && (
                <button
                  type="button"
                  onClick={() => save("hotmart_hottok", "")}
                  disabled={saving}
                  className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg"
                >
                  Remover
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Na Hotmart, vá em <strong>Ferramentas → Webhook</strong>, cadastre a URL
              acima e copie o <em>hottok</em> gerado.
            </p>
          </section>

          {/* Stripe */}
          <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Stripe</h2>
            <p className="text-xs text-gray-500 mb-4">
              Webhook URL:{" "}
              <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-300">
                {stripeUrl}
              </code>
            </p>

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Webhook signing secret
            </label>
            {status.stripe_webhook_secret?.set && (
              <p className="text-xs text-green-400 mb-2">
                ✓ Configurado (termina em {status.stripe_webhook_secret.preview})
              </p>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="password"
                value={stripeSecret}
                onChange={(e) => setStripeSecret(e.target.value)}
                placeholder="whsec_..."
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => save("stripe_webhook_secret", stripeSecret.trim())}
                disabled={!stripeSecret.trim() || saving}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
              >
                Salvar
              </button>
              {status.stripe_webhook_secret?.set && (
                <button
                  type="button"
                  onClick={() => save("stripe_webhook_secret", "")}
                  disabled={saving}
                  className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg"
                >
                  Remover
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              No Stripe Dashboard, vá em <strong>Developers → Webhooks → Add endpoint</strong>,
              cadastre a URL acima, selecione o evento <em>checkout.session.completed</em>
              e copie o <em>Signing secret</em> gerado.
            </p>
          </section>

          <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Como vincular os produtos
            </h3>
            <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5 list-decimal list-inside">
              <li>
                Em <strong>Admin → Cursos</strong>, edite cada curso e preencha{" "}
                <em>ID externo do produto</em> com o ID do produto na Hotmart ou Stripe.
              </li>
              <li>
                No Stripe, inclua <code>courseId</code> em <em>metadata</em> do checkout
                session (ou <code>externalProductId</code>) para roteamento automático.
              </li>
              <li>
                Na Hotmart, o roteamento usa o ID do produto contido no payload.
              </li>
            </ol>
          </section>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-blue-600 text-white rounded-lg shadow-xl text-sm font-medium">
          {toast}
        </div>
      )}
    </div>
  );
}

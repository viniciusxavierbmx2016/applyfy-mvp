"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { GatewayLogo } from "@/components/gateway-logo";

const DEFAULT_APPLYFY_LOGO = "/images/applyfy-logo.png";

interface GatewayStatus {
  connected: boolean;
  logoUrl: string | null;
}

type ViewerRole = "ADMIN" | "PRODUCER" | "STUDENT";

interface StatusResponse {
  gateways: { applyfy: GatewayStatus };
  pendingRequests: number;
  viewerRole?: ViewerRole;
}

export default function ProducerIntegrationsPage() {
  const router = useRouter();
  const [applyfy, setApplyfy] = useState<GatewayStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetch("/api/producer/integrations/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: StatusResponse | null) => {
        if (d) {
          setApplyfy(d.gateways.applyfy);
          if (d.viewerRole === "ADMIN") {
            router.replace("/admin/integrations");
          }
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mb-1">
            Integrações
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Conecte gateways de pagamento para liberar cursos automaticamente.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ApplyfyCard
            connected={!!applyfy?.connected}
            logoUrl={applyfy?.logoUrl || DEFAULT_APPLYFY_LOGO}
          />
          <RequestIntegrationCard onOpen={() => setModalOpen(true)} />
        </div>
      )}

      {modalOpen && <RequestModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}

function ApplyfyCard({
  connected,
  logoUrl,
}: {
  connected: boolean;
  logoUrl: string;
}) {
  return (
    <div className="group relative flex flex-col gap-3 p-5 rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] hover:border-gray-300 dark:hover:border-white/[0.1] hover:shadow-lg transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        <GatewayLogo src={logoUrl} label="Applyfy" size={48} />
        <span
          className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${
            connected
              ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30"
              : "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-400/30"
          }`}
        >
          {connected ? "● Conectado" : "● Não configurado"}
        </span>
      </div>
      <Link
        href="/producer/integrations/applyfy"
        className="group/title block focus:outline-none"
      >
        <h2 className="text-base font-semibold text-gray-900 dark:text-white group-hover/title:text-indigo-600 dark:group-hover/title:text-indigo-400 transition-colors">
          Applyfy
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
          Gateway de pagamentos para infoprodutores.
        </p>
      </Link>
      <Link
        href="/producer/integrations/applyfy"
        className="group/cta mt-auto pt-1 inline-flex items-center text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-700 dark:hover:text-indigo-300 w-fit"
      >
        {connected ? "Gerenciar" : "Configurar"}
        <svg
          className="w-3.5 h-3.5 ml-1 transition-transform group-hover/cta:translate-x-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  );
}

function RequestIntegrationCard({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col items-center justify-center gap-3 p-5 rounded-xl bg-transparent border-2 border-dashed border-gray-300 dark:border-white/[0.08] hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-all duration-200 text-center min-h-[176px]"
    >
      <div className="w-12 h-12 rounded-xl border-2 border-dashed border-gray-300 dark:border-white/[0.08] group-hover:border-indigo-400 dark:group-hover:border-indigo-500 flex items-center justify-center flex-shrink-0 transition">
        <svg
          className="w-6 h-6 text-gray-400 dark:text-gray-500 group-hover:text-indigo-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </div>
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          Solicitar integração
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
          Quer integrar com outro gateway? Solicite aqui.
        </p>
      </div>
    </button>
  );
}

const GATEWAY_SUGGESTIONS = ["Kiwify", "Eduzz", "Monetizze", "PerfectPay"];

function RequestModal({ onClose }: { onClose: () => void }) {
  const [gateway, setGateway] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/producer/integrations/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gateway: gateway.trim(),
          email: email.trim(),
          notes: notes.trim() || undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error || "Erro ao enviar solicitação");
        return;
      }
      setSuccess(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {success ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Solicitação enviada!
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
              Entraremos em contato quando a integração estiver disponível.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg"
            >
              Fechar
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Solicitar integração
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Diga qual gateway você precisa e te avisamos quando ficar
                  pronto.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="p-1.5 -m-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Nome do gateway
                </label>
                <input
                  type="text"
                  value={gateway}
                  onChange={(e) => setGateway(e.target.value)}
                  required
                  maxLength={100}
                  placeholder="Ex: Kiwify, Eduzz, Monetizze..."
                  className="w-full px-4 py-2.5 bg-white dark:bg-white/[0.04] border border-gray-300 dark:border-white/[0.08] rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {GATEWAY_SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setGateway(s)}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] text-gray-700 dark:text-gray-300 hover:border-indigo-400 dark:hover:border-indigo-500 transition"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Seu email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="voce@email.com"
                  className="w-full px-4 py-2.5 bg-white dark:bg-white/[0.04] border border-gray-300 dark:border-white/[0.08] rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Observações <span className="text-gray-500 font-normal">(opcional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="Conte um pouco sobre o uso que você pretende dar..."
                  className="w-full px-4 py-2.5 bg-white dark:bg-white/[0.04] border border-gray-300 dark:border-white/[0.08] rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition resize-none"
                />
              </div>

              {error && (
                <p className="text-sm text-red-500" role="alert">
                  {error}
                </p>
              )}

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-gray-100 dark:bg-white/[0.04] hover:bg-gray-200 dark:hover:bg-white/[0.06] text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || !gateway.trim() || !email.trim()}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
                >
                  {submitting ? "Enviando..." : "Enviar solicitação"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

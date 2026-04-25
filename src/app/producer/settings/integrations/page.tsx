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
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
            Integrações
          </h1>
          <p className="text-sm text-gray-500">
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
          <StripeCard />
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
    <div className="group relative flex flex-col gap-3 p-5 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 hover:shadow-lg transition-[border-color,box-shadow] duration-200">
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
        href="/producer/settings/integrations/applyfy"
        className="group/title block focus:outline-none"
      >
        <h2 className="text-base font-semibold text-gray-900 dark:text-white group-hover/title:text-blue-600 dark:group-hover/title:text-blue-400 transition-colors">
          Applyfy
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
          Gateway de pagamentos para infoprodutores.
        </p>
      </Link>
      <Link
        href="/producer/settings/integrations/applyfy"
        className="group/cta mt-auto pt-1 inline-flex items-center text-xs text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 dark:hover:text-blue-300 w-fit"
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

function StripeCard() {
  return (
    <div className="group relative flex flex-col gap-3 p-5 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 hover:shadow-lg transition-[border-color,box-shadow] duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="w-12 h-12 rounded-xl bg-[#635BFF] flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.918 3.757 7.038c0 4.072 2.484 5.857 6.334 7.29 2.484.913 3.365 1.577 3.365 2.559 0 .906-.806 1.439-2.136 1.439-1.817 0-4.746-.945-6.59-2.198l-.89 5.555c1.817 1.013 4.515 1.731 7.476 1.731 2.62 0 4.791-.654 6.334-1.928 1.636-1.365 2.463-3.327 2.463-5.66 0-4.125-2.52-5.869-6.137-7.255z" />
          </svg>
        </div>
        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full border bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-400/30">
          Manual
        </span>
      </div>
      <Link
        href="/producer/settings/integrations/stripe"
        className="group/title block focus:outline-none"
      >
        <h2 className="text-base font-semibold text-gray-900 dark:text-white group-hover/title:text-blue-600 dark:group-hover/title:text-blue-400 transition-colors">
          Stripe
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
          Pagamentos via cartão de crédito e boleto.
        </p>
      </Link>
      <Link
        href="/producer/settings/integrations/stripe"
        className="group/cta mt-auto pt-1 inline-flex items-center text-xs text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 dark:hover:text-blue-300 w-fit"
      >
        Ver instruções
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
      className="group flex flex-col items-center justify-center gap-3 p-5 rounded-xl bg-transparent border-2 border-dashed border-gray-300 dark:border-white/10 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors duration-200 text-center min-h-[176px]"
    >
      <div className="w-12 h-12 rounded-xl border-2 border-dashed border-gray-300 dark:border-white/10 group-hover:border-blue-400 dark:group-hover:border-blue-500 flex items-center justify-center flex-shrink-0 transition">
        <svg
          className="w-6 h-6 text-gray-400 dark:text-gray-500 group-hover:text-blue-500"
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
        className="w-full sm:max-w-md bg-white dark:bg-gray-950 border border-gray-200 dark:border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto"
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
              className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg"
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
                className="p-1.5 -m-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10"
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
                  className="w-full px-4 py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {GATEWAY_SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setGateway(s)}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-blue-400 dark:hover:border-blue-500 transition"
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
                  className="w-full px-4 py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition"
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
                  className="w-full px-4 py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition resize-none"
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
                  className="px-4 py-2.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || !gateway.trim() || !email.trim()}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
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

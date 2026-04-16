"use client";

import { useEffect, useRef, useState } from "react";
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

export default function AdminIntegrationsIndexPage() {
  const router = useRouter();
  const [applyfy, setApplyfy] = useState<GatewayStatus | null>(null);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [viewerRole, setViewerRole] = useState<ViewerRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetch("/api/admin/integrations/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: StatusResponse | null) => {
        if (d) {
          setApplyfy(d.gateways.applyfy);
          setPendingRequests(d.pendingRequests || 0);
          setViewerRole(d.viewerRole || null);
          if (d.viewerRole && d.viewerRole !== "ADMIN") {
            router.replace("/producer/integrations");
          }
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  const isAdmin = viewerRole === "ADMIN";

  function handleLogoUpdated(url: string) {
    setApplyfy((prev) =>
      prev ? { ...prev, logoUrl: url } : { connected: false, logoUrl: url }
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            Integrações
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Conecte gateways de pagamento para liberar cursos automaticamente.
          </p>
        </div>
        {isAdmin && (
        <Link
          href="/admin/integrations/requests"
          className="inline-flex items-center gap-2 self-start px-3.5 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Ver solicitações
          {pendingRequests > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-semibold rounded-full bg-amber-500 text-white">
              {pendingRequests}
            </span>
          )}
        </Link>
        )}
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
            onLogoUpdated={handleLogoUpdated}
            canEditLogo={isAdmin}
          />
          <RequestIntegrationCard onOpen={() => setModalOpen(true)} />
        </div>
      )}

      {modalOpen && <RequestModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}

function LogoUploader({
  gateway,
  logoUrl,
  onUploaded,
}: {
  gateway: string;
  logoUrl: string;
  onUploaded: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("gateway", gateway);
      const res = await fetch("/api/admin/integrations/logo", {
        method: "POST",
        body: fd,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error || "Erro no upload");
        setTimeout(() => setError(null), 3000);
        return;
      }
      onUploaded(body.url);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="relative group/logo inline-block">
      <GatewayLogo src={logoUrl} label="Applyfy" size={48} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label="Editar logo"
        title="Tamanho ideal: 100x100px"
        className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-black/60 text-white opacity-0 group-hover/logo:opacity-100 focus:opacity-100 transition-opacity disabled:cursor-wait"
      >
        {uploading ? (
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
            <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )}
      </button>
      <span
        aria-hidden
        className="absolute -bottom-1 -right-1 z-10 w-5 h-5 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center shadow ring-2 ring-white dark:ring-gray-900 pointer-events-none"
      >
        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPick}
      />
      {error && (
        <span className="absolute left-0 top-full mt-1 text-[10px] text-red-500 whitespace-nowrap">
          {error}
        </span>
      )}
    </div>
  );
}

function ApplyfyCard({
  connected,
  logoUrl,
  onLogoUpdated,
  canEditLogo,
}: {
  connected: boolean;
  logoUrl: string;
  onLogoUpdated: (url: string) => void;
  canEditLogo: boolean;
}) {
  return (
    <div className="group relative flex flex-col gap-3 p-5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-lg transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        {canEditLogo ? (
          <LogoUploader
            gateway="applyfy"
            logoUrl={logoUrl}
            onUploaded={onLogoUpdated}
          />
        ) : (
          <GatewayLogo src={logoUrl} label="Applyfy" size={48} />
        )}
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
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          Applyfy
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
          Gateway de pagamentos para infoprodutores.
        </p>
      </div>
    </div>
  );
}

function RequestIntegrationCard({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col items-center justify-center gap-3 p-5 rounded-xl bg-transparent border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-all duration-200 text-center min-h-[176px]"
    >
      <div className="w-12 h-12 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 group-hover:border-blue-400 dark:group-hover:border-blue-500 flex items-center justify-center flex-shrink-0 transition">
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
      const res = await fetch("/api/admin/integrations/requests", {
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
        className="w-full sm:max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto"
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
              className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
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
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {GATEWAY_SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setGateway(s)}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400 dark:hover:border-blue-500 transition"
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
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
                  className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || !gateway.trim() || !email.trim()}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
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

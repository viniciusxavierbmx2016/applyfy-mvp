"use client";

import { useEffect, useState } from "react";

interface Factor {
  id: string;
  name: string | null;
  createdAt: string;
}

interface Status {
  enabled: boolean;
  factors: Factor[];
}

interface QrData {
  factorId: string;
  qrCode: string;
  secret: string;
  uri: string;
}

const ShieldIcon = ({ className = "" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 3l8 4v5c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V7l8-4z"
    />
  </svg>
);

export default function ProducerSecurityPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [qrData, setQrData] = useState<QrData | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);

  async function loadStatus() {
    setLoading(true);
    try {
      const r = await fetch("/api/auth/mfa/status");
      const d = await r.json();
      setStatus(d);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  async function handleEnroll() {
    setEnrolling(true);
    setError("");
    try {
      const r = await fetch("/api/auth/mfa/enroll", { method: "POST" });
      const d = await r.json();
      if (r.ok) setQrData(d);
      else setError(d.error || "Erro ao configurar 2FA");
    } finally {
      setEnrolling(false);
    }
  }

  async function handleVerify() {
    setError("");
    setVerifying(true);
    try {
      const r = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factorId: qrData!.factorId, code }),
      });
      if (r.ok) {
        setQrData(null);
        setCode("");
        await loadStatus();
      } else {
        const d = await r.json();
        setError(d.error || "Código inválido");
      }
    } finally {
      setVerifying(false);
    }
  }

  async function handleDisable(factorId: string) {
    if (
      !confirm(
        "Tem certeza que deseja desativar a autenticação em dois fatores?"
      )
    )
      return;
    const r = await fetch("/api/auth/mfa/unenroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ factorId }),
    });
    if (r.ok) await loadStatus();
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
          Autenticação em dois fatores
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Proteja sua conta de produtor com uma camada extra de segurança.
        </p>
      </div>

      <div className="bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                status?.enabled
                  ? "bg-emerald-500/10"
                  : "bg-gray-200 dark:bg-gray-500/10"
              }`}
            >
              <ShieldIcon
                className={`w-5 h-5 ${
                  status?.enabled
                    ? "text-emerald-500"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Autenticação em dois fatores (2FA)
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {status?.enabled
                  ? "Ativo — sua conta está protegida"
                  : "Inativo — recomendamos ativar"}
              </p>
            </div>
          </div>

          {status?.enabled ? (
            <span className="px-2.5 py-1 text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full">
              Ativo
            </span>
          ) : (
            <span className="px-2.5 py-1 text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full">
              Inativo
            </span>
          )}
        </div>

        {status?.enabled && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/[0.06]">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Sua conta está protegida com autenticação em dois fatores via
              aplicativo autenticador (Google Authenticator, Authy, etc).
            </p>
            {status.factors.map((f) => (
              <div key={f.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {f.name || "Autenticador"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Ativado em{" "}
                    {new Date(f.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <button
                  onClick={() => handleDisable(f.id)}
                  className="text-xs text-red-500 hover:text-red-400 px-3 py-1.5 border border-red-500/20 rounded-lg hover:bg-red-500/5"
                >
                  Desativar
                </button>
              </div>
            ))}
          </div>
        )}

        {!status?.enabled && !qrData && (
          <button
            onClick={handleEnroll}
            disabled={enrolling}
            className="mt-4 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {enrolling
              ? "Configurando..."
              : "Ativar autenticação em dois fatores"}
          </button>
        )}

        {qrData && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/[0.06]">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Configure seu autenticador
            </h3>

            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex flex-col items-center">
                <div className="bg-white p-3 rounded-xl border border-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrData.qrCode}
                    alt="QR Code"
                    className="w-48 h-48"
                  />
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 text-center max-w-[200px]">
                  Escaneie com Google Authenticator, Authy ou similar
                </p>
              </div>

              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  1. Abra seu app autenticador no celular
                  <br />
                  2. Escaneie o QR code ao lado
                  <br />
                  3. Digite o código de 6 dígitos que aparece
                </p>

                <div className="mb-2">
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                    Código de verificação
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="000000"
                    className="w-full text-center text-xl tracking-[0.3em] font-mono bg-gray-100 dark:bg-white/[0.04] border border-gray-300 dark:border-white/[0.08] rounded-lg px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
                    autoFocus
                  />
                </div>

                {error && (
                  <p className="text-red-500 text-xs mb-2">{error}</p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleVerify}
                    disabled={code.length !== 6 || verifying}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg"
                  >
                    {verifying ? "Verificando..." : "Confirmar"}
                  </button>
                  <button
                    onClick={() => {
                      setQrData(null);
                      setCode("");
                      setError("");
                    }}
                    className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 border border-gray-300 dark:border-white/[0.08] rounded-lg"
                  >
                    Cancelar
                  </button>
                </div>

                <details className="mt-4">
                  <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                    Não consegue escanear? Use o código manual
                  </summary>
                  <code className="block mt-2 p-2 bg-gray-100 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded text-xs text-gray-700 dark:text-gray-300 font-mono break-all">
                    {qrData.secret}
                  </code>
                </details>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

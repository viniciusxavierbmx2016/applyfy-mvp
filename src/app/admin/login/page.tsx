"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PlatformLogo } from "@/components/platform-logo";

function AdminLoginForm() {
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "success";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [errorRole, setErrorRole] = useState<
    "PRODUCER" | "STUDENT" | "COLLABORATOR" | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [factorId, setFactorId] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setErrorRole(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg: string = data.error || `Erro ao fazer login (${res.status})`;
        setError(msg);
        if (msg.includes("/producer/login")) setErrorRole("PRODUCER");
        else if (msg.toLowerCase().includes("área de membros"))
          setErrorRole("STUDENT");
        else if (msg.toLowerCase().includes("workspace onde você colabora"))
          setErrorRole("COLLABORATOR");
        setLoading(false);
        return;
      }

      if (data.requiresMfa) {
        setMfaRequired(true);
        setFactorId(data.factorId);
        setLoading(false);
        return;
      }

      window.location.href = "/admin";
    } catch {
      setError("Erro ao conectar com o servidor");
      setLoading(false);
    }
  }

  async function handleMfaVerify(e: React.FormEvent) {
    e.preventDefault();
    setMfaError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/mfa/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ factorId, code: mfaCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMfaError(data.error || "Código inválido");
        setLoading(false);
        return;
      }
      window.location.href = "/admin";
    } catch {
      setMfaError("Erro ao verificar código");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#060612] px-4" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 60%), #060612" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <PlatformLogo
              className="h-10 w-auto object-contain"
              fallback={
                <span className="text-3xl font-bold text-gray-900 dark:text-white">Members Club</span>
              }
            />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Painel Administrativo
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
            Acesso restrito a administradores
          </p>
        </div>

        <div className="bg-white dark:bg-white/[0.03] rounded-2xl p-8 shadow-xl border border-gray-200 dark:border-white/[0.06]">
          {resetSuccess && !error && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm">
              Senha redefinida com sucesso! Faça login.
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <p>{error}</p>
              {errorRole === "PRODUCER" && (
                <Link
                  href="/producer/login"
                  className="inline-block mt-2 text-blue-400 hover:text-blue-300 font-medium"
                >
                  Ir para login do produtor →
                </Link>
              )}
            </div>
          )}

          {mfaRequired ? (
            <form onSubmit={handleMfaVerify} className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-7 h-7 text-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 3l8 4v5c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V7l8-4z"
                    />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Verificação em dois fatores
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Digite o código de 6 dígitos do seu aplicativo autenticador
                </p>
              </div>

              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={mfaCode}
                onChange={(e) =>
                  setMfaCode(e.target.value.replace(/\D/g, ""))
                }
                placeholder="000000"
                className="w-full text-center text-2xl tracking-[0.5em] font-mono bg-gray-100 dark:bg-white/[0.04] border border-gray-300 dark:border-white/[0.08] rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
                autoFocus
              />

              {mfaError && (
                <p className="text-red-500 text-sm text-center">{mfaError}</p>
              )}

              <button
                type="submit"
                disabled={mfaCode.length !== 6 || loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
              >
                {loading ? "Verificando..." : "Verificar"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMfaRequired(false);
                  setMfaCode("");
                  setMfaError("");
                }}
                className="w-full text-center text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Voltar ao login
              </button>
            </form>
          ) : (
            <>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-gray-100 dark:bg-white/[0.04] border border-gray-300 dark:border-white/[0.08] rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition"
                      placeholder="seu@email.com"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Senha
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-gray-100 dark:bg-white/[0.04] border border-gray-300 dark:border-white/[0.08] rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-6 py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl shadow-lg shadow-blue-500/20 transition duration-200"
                >
                  {loading ? "Entrando..." : "Entrar"}
                </button>
              </form>

              <div className="mt-6 text-center text-sm">
                <Link
                  href="/forgot-password?from=admin"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Esqueci minha senha
                </Link>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-500 mt-8">
          Members Club &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginForm />
    </Suspense>
  );
}

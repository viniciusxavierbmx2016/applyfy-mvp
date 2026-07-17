"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PlatformLogo } from "@/components/platform-logo";

interface StudentWorkspaceItem {
  slug: string;
  name: string;
  logoUrl: string | null;
}

function ProducerLoginForm() {
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "success";
  const upgraded = searchParams.get("upgraded") === "true";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Raiz (7.7): a lista de áreas do aluno (null = form normal; [] = conta
  // sem área — mensagem honesta) e o destino pós-MFA vindo do servidor.
  const [studentWorkspaces, setStudentWorkspaces] = useState<
    StudentWorkspaceItem[] | null
  >(null);
  const [postLoginRedirect, setPostLoginRedirect] = useState("/");
  const [mfaRequired, setMfaRequired] = useState(false);
  const [factorId, setFactorId] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState("");
  const [showStudentLookup, setShowStudentLookup] = useState(false);
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupSent, setLookupSent] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/producer-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || `Erro ao entrar (${res.status})`);
        setLoading(false);
        return;
      }
      // Raiz (7.7): a senha bateu numa credencial de aluno → lista inline
      // (nenhuma sessão foi criada; cada item abre o ws-login em nova guia).
      if (data.studentWorkspaces) {
        setStudentWorkspaces(data.studentWorkspaces);
        setLoading(false);
        return;
      }
      if (data.requiresMfa) {
        setMfaRequired(true);
        setFactorId(data.factorId);
        setPostLoginRedirect(data.redirect || "/");
        setLoading(false);
        return;
      }
      window.location.href = data.redirect || "/";
    } catch {
      setError("Erro ao conectar com o servidor");
      setLoading(false);
    }
  }

  async function handleStudentLookup() {
    if (!lookupEmail.trim()) return;
    setLookupLoading(true);
    try {
      await fetch("/api/auth/student-workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: lookupEmail.trim() }),
      });
    } catch {}
    setLookupLoading(false);
    setLookupSent(true);
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
      window.location.href = postLoginRedirect;
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
          <p className="text-sm font-medium text-primary">
            Entre na sua conta
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Produtores, colaboradores e alunos
          </p>
        </div>

        <div className="bg-white dark:bg-white/[0.03] rounded-2xl p-8 shadow-xl border border-gray-200 dark:border-white/[0.06]">
          {resetSuccess && !error && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm">
              Senha redefinida com sucesso! Faça login.
            </div>
          )}
          {upgraded && !error && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm">
              Conta convertida para produtor com sucesso! Faça login com a senha que você definiu. Seu acesso aos cursos como aluno foi mantido.
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
              <p>{error}</p>
            </div>
          )}

          {studentWorkspaces !== null ? (
            <div>
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Suas áreas de membros
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {studentWorkspaces.length > 0
                    ? "Encontramos as áreas vinculadas à sua conta. Clique para entrar — abre em uma nova guia."
                    : "Sua conta não tem acesso a nenhuma área de membros no momento."}
                </p>
              </div>

              {studentWorkspaces.length > 0 && (
                <ul className="space-y-2">
                  {studentWorkspaces.map((w) => (
                    <li key={w.slug}>
                      <a
                        href={`/w/${w.slug}/login`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-xl bg-gray-100 dark:bg-white/[0.04] border border-gray-300 dark:border-white/[0.08] hover:border-primary/50 transition"
                      >
                        {w.logoUrl ? (
                          <Image
                            src={w.logoUrl}
                            alt=""
                            width={36}
                            height={36}
                            className="w-9 h-9 rounded-lg object-cover shrink-0"
                          />
                        ) : (
                          <span className="w-9 h-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold shrink-0">
                            {w.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span className="flex-1 min-w-0 text-sm font-medium text-gray-900 dark:text-white truncate">
                          {w.name}
                        </span>
                        <svg
                          className="w-4 h-4 text-gray-400 shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>
                    </li>
                  ))}
                </ul>
              )}

              <button
                type="button"
                onClick={() => setStudentWorkspaces(null)}
                className="mt-4 w-full text-center text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Voltar ao login
              </button>
            </div>
          ) : mfaRequired ? (
            <form onSubmit={handleMfaVerify} className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-7 h-7 text-primary"
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
                className="w-full text-center text-2xl tracking-[0.5em] font-mono bg-gray-100 dark:bg-white/[0.04] border border-gray-300 dark:border-white/[0.08] rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                autoFocus
              />

              {mfaError && (
                <p className="text-red-500 text-sm text-center">{mfaError}</p>
              )}

              <button
                type="submit"
                disabled={mfaCode.length !== 6 || loading}
                className="w-full py-2.5 bg-primary hover:bg-primary disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
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
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full px-4 py-3 bg-gray-100 dark:bg-white/[0.04] border border-gray-300 dark:border-white/[0.08] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition"
                    placeholder="seu@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Senha
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full px-4 py-3 bg-gray-100 dark:bg-white/[0.04] border border-gray-300 dark:border-white/[0.08] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition"
                    placeholder="••••••••"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-primary hover:bg-primary disabled:opacity-50 text-white font-medium rounded-xl shadow-lg shadow-primary/20 transition"
                >
                  {loading ? "Entrando..." : "Entrar"}
                </button>
              </form>

              <div className="mt-6 flex items-center justify-between text-sm">
                <Link
                  href="/forgot-password?from=producer"
                  className="text-primary hover:underline"
                >
                  Esqueci minha senha
                </Link>
                <Link
                  href="/producer/register"
                  className="text-primary hover:underline"
                >
                  Criar conta
                </Link>
              </div>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setShowStudentLookup(!showStudentLookup)}
                  className="text-sm text-primary hover:underline"
                >
                  É aluno? Encontre seu curso
                </button>
              </div>

              {showStudentLookup && (
                <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10">
                  {lookupSent ? (
                    <div className="text-center">
                      <p className="text-sm text-gray-400">
                        Se este email estiver cadastrado, você receberá os links de acesso no seu email.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setLookupSent(false);
                          setLookupEmail("");
                        }}
                        className="mt-2 text-xs text-primary hover:underline"
                      >
                        Enviar para outro email
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-gray-400 mb-3">
                        Digite seu email para receber os links de acesso dos seus cursos.
                      </p>
                      <input
                        type="email"
                        placeholder="seu@email.com"
                        value={lookupEmail}
                        onChange={(e) => setLookupEmail(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        onKeyDown={(e) => e.key === "Enter" && handleStudentLookup()}
                      />
                      <button
                        type="button"
                        onClick={handleStudentLookup}
                        disabled={lookupLoading || !lookupEmail.trim()}
                        className="mt-3 w-full py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                      >
                        {lookupLoading ? "Enviando..." : "Enviar links de acesso"}
                      </button>
                    </>
                  )}
                </div>
              )}
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

export default function ProducerLoginPage() {
  return (
    <Suspense>
      <ProducerLoginForm />
    </Suspense>
  );
}

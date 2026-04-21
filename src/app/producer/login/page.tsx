"use client";

import { useState } from "react";
import Link from "next/link";
import { PlatformLogo } from "@/components/platform-logo";

export default function ProducerLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [errorRole, setErrorRole] = useState<
    "ADMIN" | "STUDENT" | "COLLABORATOR" | null
  >(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setErrorRole(null);
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
        const msg: string = data.error || `Erro ao entrar (${res.status})`;
        setError(msg);
        if (msg.includes("/admin/login")) setErrorRole("ADMIN");
        else if (msg.toLowerCase().includes("link do seu curso"))
          setErrorRole("STUDENT");
        else if (msg.toLowerCase().includes("workspace onde você colabora"))
          setErrorRole("COLLABORATOR");
        setLoading(false);
        return;
      }
      window.location.href = data.redirect || "/";
    } catch {
      setError("Erro ao conectar com o servidor");
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
          <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
            Área do produtor e colaborador
          </p>
        </div>

        <div className="bg-white dark:bg-white/[0.03] rounded-2xl p-8 shadow-xl border border-gray-200 dark:border-white/[0.06] backdrop-blur-xl">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
              <p>{error}</p>
              {errorRole === "ADMIN" && (
                <Link
                  href="/admin/login"
                  className="inline-block mt-2 text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  Ir para login do admin →
                </Link>
              )}
            </div>
          )}

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
                className="w-full px-4 py-3 bg-gray-100 dark:bg-white/[0.04] border border-gray-300 dark:border-white/[0.08] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition"
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
                className="w-full px-4 py-3 bg-gray-100 dark:bg-white/[0.04] border border-gray-300 dark:border-white/[0.08] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/20 transition"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm">
            <Link
              href="/forgot-password"
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Esqueci minha senha
            </Link>
            <Link
              href="/producer/register"
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Criar conta
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 mt-8">
          Members Club &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

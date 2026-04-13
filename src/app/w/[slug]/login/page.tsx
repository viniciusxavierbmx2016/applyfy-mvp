"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { GoogleAuthButton } from "@/components/google-auth-button";

interface WorkspaceInfo {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  loginBgColor: string | null;
}

export default function WorkspaceLoginPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [ws, setWs] = useState<WorkspaceInfo | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const err = new URL(window.location.href).searchParams.get("error");
    if (err) setError(err);
  }, []);

  useEffect(() => {
    fetch(`/api/w/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setWs(d.workspace));
  }, [slug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/w/${slug}/login`, {
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
      window.location.href = `/w/${slug}`;
    } catch {
      setError("Erro ao conectar com o servidor");
      setLoading(false);
    }
  }

  const bg = ws?.loginBgColor || undefined;
  const displayName = ws?.name || "Workspace";

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 bg-white dark:bg-gray-950"
      style={bg ? { backgroundColor: bg } : {}}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center overflow-hidden mb-3 shadow-lg">
            {ws?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ws.logoUrl}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-gray-800 dark:text-white">
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {displayName}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Acesse sua conta</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-xl border border-gray-200 dark:border-gray-800">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
              {error}
            </div>
          )}

          <GoogleAuthButton
            label="Entrar com Google"
            slug={slug}
            next={`/w/${slug}`}
          />

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-800" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-white dark:bg-gray-900 text-xs text-gray-500 uppercase tracking-wider">
                ou
              </span>
            </div>
          </div>

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
                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm">
            <Link
              href="/forgot-password"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Esqueci minha senha
            </Link>
            <Link
              href={`/w/${slug}/register`}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

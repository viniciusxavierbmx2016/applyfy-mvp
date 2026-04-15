"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  WorkspaceAuthShell,
  WorkspaceAuthInfo,
  getLoginTheme,
  authInputCls,
  authLabelCls,
  authErrorCls,
} from "@/components/workspace-auth-shell";

export default function WorkspaceLoginPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [ws, setWs] = useState<WorkspaceAuthInfo | null>(null);
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
    fetch(`/api/w/${slug}`, { cache: "no-store" })
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

  const theme = getLoginTheme(ws);

  return (
    <WorkspaceAuthShell
      ws={ws}
      footer={
        <div className="mt-6 flex items-center justify-between text-sm">
          <Link
            href="/forgot-password"
            className="hover:underline transition-colors"
            style={{ color: theme.linkColor }}
          >
            Esqueci minha senha
          </Link>
          <Link
            href={`/w/${slug}/register`}
            className="hover:underline transition-colors"
            style={{ color: theme.linkColor }}
          >
            Criar conta
          </Link>
        </div>
      }
    >
      {error && <div className={authErrorCls}>{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={authLabelCls}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className={authInputCls}
            placeholder="seu@email.com"
          />
        </div>
        <div>
          <label className={authLabelCls}>Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className={authInputCls}
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.primaryHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = theme.primaryColor;
          }}
          style={{ backgroundColor: theme.primaryColor }}
          className="w-full py-3 disabled:opacity-60 text-white font-medium rounded-lg transition shadow-lg"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </WorkspaceAuthShell>
  );
}

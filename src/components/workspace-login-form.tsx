"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  WorkspaceAuthShell,
  WorkspaceAuthInfo,
  getLoginTheme,
  authInputCls,
  authLabelCls,
  authErrorCls,
  authSubmitCls,
} from "@/components/workspace-auth-shell";

interface WorkspaceLoginFormProps {
  workspace: WorkspaceAuthInfo;
  slug: string;
}

export function WorkspaceLoginForm({
  workspace,
  slug,
}: WorkspaceLoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [factorId, setFactorId] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const err = new URL(window.location.href).searchParams.get("error");
    if (err) setError(err);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (
      typeof window !== "undefined" &&
      new URL(window.location.href).searchParams.get("preview")
    ) {
      return;
    }
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
      if (data.requiresMfa && data.factorId) {
        setRequiresMfa(true);
        setFactorId(data.factorId);
        setLoading(false);
        return;
      }
      window.location.href = `/w/${slug}`;
    } catch {
      setError("Erro ao conectar com o servidor");
      setLoading(false);
    }
  }

  async function handleMfa(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMfaLoading(true);
    try {
      const res = await fetch("/api/auth/mfa/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ factorId, code: mfaCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Código inválido");
        setMfaLoading(false);
        return;
      }
      window.location.href = `/w/${slug}`;
    } catch {
      setError("Erro na verificação. Tente novamente.");
      setMfaLoading(false);
    }
  }

  function backToPassword() {
    setRequiresMfa(false);
    setFactorId("");
    setMfaCode("");
    setError("");
  }

  const theme = getLoginTheme(workspace);

  return (
    <WorkspaceAuthShell
      ws={workspace}
      title={requiresMfa ? "Verificação em duas etapas" : undefined}
      subtitle={
        requiresMfa
          ? "Digite o código de 6 dígitos do seu app autenticador"
          : undefined
      }
      footer={
        <div className="mt-6 text-center text-sm">
          {requiresMfa ? (
            <button
              type="button"
              onClick={backToPassword}
              className="hover:underline transition-colors"
              style={{ color: theme.linkColor }}
            >
              Voltar
            </button>
          ) : (
            <Link
              href={`/w/${slug}/forgot-password`}
              className="hover:underline transition-colors"
              style={{ color: theme.linkColor }}
            >
              Esqueci minha senha
            </Link>
          )}
        </div>
      }
    >
      {error && <div className={authErrorCls}>{error}</div>}

      {requiresMfa ? (
        <form onSubmit={handleMfa} className="space-y-4">
          <div>
            <label className={authLabelCls}>Código de verificação</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
              required
              minLength={6}
              maxLength={6}
              autoFocus
              autoComplete="one-time-code"
              className={authInputCls}
              placeholder="000000"
            />
          </div>
          <button
            type="submit"
            disabled={mfaLoading || mfaCode.length < 6}
            className={authSubmitCls}
          >
            {mfaLoading ? "Verificando..." : "Verificar"}
          </button>
        </form>
      ) : (
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
          <button type="submit" disabled={loading} className={authSubmitCls}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      )}
    </WorkspaceAuthShell>
  );
}

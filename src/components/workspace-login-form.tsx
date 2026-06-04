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

  useEffect(() => {
    const link = document.querySelector('link[rel="manifest"]');
    if (link) link.setAttribute("href", `/api/manifest/${slug}`);
    return () => {
      const link = document.querySelector('link[rel="manifest"]');
      if (link) link.setAttribute("href", "/manifest.json");
    };
  }, [slug]);

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
      {error && (
        <div
          className={`${authErrorCls} flex items-start gap-2 animate-in fade-in duration-200`}
          role="alert"
        >
          <AlertIcon />
          <span>{error}</span>
        </div>
      )}

      {requiresMfa ? (
        <form
          onSubmit={handleMfa}
          className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
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
            className={`${authSubmitCls} inline-flex items-center justify-center gap-2`}
          >
            {mfaLoading ? (
              <>
                <Spinner /> Verificando...
              </>
            ) : (
              "Verificar"
            )}
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
          <button
            type="submit"
            disabled={loading}
            className={`${authSubmitCls} inline-flex items-center justify-center gap-2`}
          >
            {loading ? (
              <>
                <Spinner /> Entrando...
              </>
            ) : (
              "Entrar"
            )}
          </button>
        </form>
      )}
    </WorkspaceAuthShell>
  );
}

function Spinner() {
  return (
    <svg
      className="w-4 h-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      className="w-4 h-4 shrink-0 mt-0.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

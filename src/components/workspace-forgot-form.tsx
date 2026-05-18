"use client";

import { useState } from "react";
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

interface WorkspaceForgotFormProps {
  workspace: WorkspaceAuthInfo;
  slug: string;
}

export function WorkspaceForgotForm({
  workspace,
  slug,
}: WorkspaceForgotFormProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/w/${slug}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || `Erro ao enviar email (${res.status})`);
        setLoading(false);
        return;
      }
      // Staff buyers are redirected to the platform-wide flow.
      if (data.redirectTo) {
        window.location.href = data.redirectTo;
        return;
      }
      setSent(true);
    } catch {
      setError("Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  }

  const theme = getLoginTheme(workspace);

  return (
    <WorkspaceAuthShell
      ws={workspace}
      title={
        workspace.loginTitle
          ? `${workspace.loginTitle} · Recuperar senha`
          : "Recuperar senha"
      }
      subtitle="Enviaremos um link para redefinir sua senha"
      footer={
        <p className="mt-6 text-center text-sm text-white/70">
          <Link
            href={`/w/${slug}/login`}
            className="hover:underline font-medium transition-colors"
            style={{ color: theme.linkColor }}
          >
            Voltar para o login
          </Link>
        </p>
      }
    >
      {error && <div className={authErrorCls}>{error}</div>}

      {sent ? (
        <div className="text-center text-sm text-white/80">
          <p className="mb-2">
            Se o email estiver cadastrado nesta área, enviaremos um link em
            alguns minutos.
          </p>
          <p className="text-white/60">Verifique também sua pasta de spam.</p>
        </div>
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
          <button type="submit" disabled={loading} className={authSubmitCls}>
            {loading ? "Enviando..." : "Enviar link"}
          </button>
        </form>
      )}
    </WorkspaceAuthShell>
  );
}

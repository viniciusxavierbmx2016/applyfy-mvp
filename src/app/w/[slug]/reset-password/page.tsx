"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  WorkspaceAuthShell,
  WorkspaceAuthInfo,
  getLoginTheme,
  authInputCls,
  authLabelCls,
  authErrorCls,
  authSubmitCls,
} from "@/components/workspace-auth-shell";

function ResetForm() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [ws, setWs] = useState<WorkspaceAuthInfo | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/w/${slug}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setWs(d.workspace));
  }, [slug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não conferem");
      return;
    }
    if (!token) {
      setError("Link inválido. Solicite um novo email de recuperação.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/w/${slug}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || `Erro ao redefinir (${res.status})`);
        setLoading(false);
        return;
      }
      setDone(true);
      setTimeout(() => {
        window.location.href = `/w/${slug}/login?reset=success`;
      }, 1200);
    } catch {
      setError("Erro ao conectar com o servidor");
      setLoading(false);
    }
  }

  const theme = getLoginTheme(ws);

  return (
    <WorkspaceAuthShell
      ws={ws}
      title={ws?.loginTitle ? `${ws.loginTitle} · Nova senha` : "Definir nova senha"}
      subtitle="Escolha uma senha para esta área de membros"
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

      {done ? (
        <div className="text-center text-sm text-white/80">
          <p>Senha redefinida com sucesso. Redirecionando…</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={authLabelCls}>Nova senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className={authInputCls}
              placeholder="Mín. 6 caracteres"
            />
          </div>
          <div>
            <label className={authLabelCls}>Confirmar senha</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              className={authInputCls}
              placeholder="Digite novamente"
            />
          </div>
          <button type="submit" disabled={loading} className={authSubmitCls}>
            {loading ? "Redefinindo..." : "Redefinir senha"}
          </button>
        </form>
      )}
    </WorkspaceAuthShell>
  );
}

export default function WorkspaceResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}

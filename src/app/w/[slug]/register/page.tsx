"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  WorkspaceAuthShell,
  WorkspaceAuthInfo,
  getLoginTheme,
  authInputCls,
  authLabelCls,
  authErrorCls,
  authSubmitCls,
} from "@/components/workspace-auth-shell";

export default function WorkspaceRegisterPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params.slug;
  const [ws, setWs] = useState<WorkspaceAuthInfo | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
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
    setLoading(true);
    try {
      const res = await fetch(`/api/w/${slug}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Erro ao cadastrar");
        setLoading(false);
        return;
      }
      router.push(
        `/verify-email?email=${encodeURIComponent(email)}&next=/w/${slug}/login`
      );
    } catch {
      setError("Erro ao conectar com o servidor");
      setLoading(false);
    }
  }

  const theme = getLoginTheme(ws);
  const registerTitle = ws?.loginTitle
    ? `${ws.loginTitle} · Cadastro`
    : "Criar conta";

  return (
    <WorkspaceAuthShell
      ws={ws}
      title={registerTitle}
      subtitle="Preencha os dados para criar sua conta"
      footer={
        <p className="mt-6 text-center text-sm text-white/70">
          Já tem conta?{" "}
          <Link
            href={`/w/${slug}/login`}
            className="hover:underline font-medium transition-colors"
            style={{ color: theme.linkColor }}
          >
            Entrar
          </Link>
        </p>
      }
    >
      {error && <div className={authErrorCls}>{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={authLabelCls}>Nome</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={80}
            className={authInputCls}
            placeholder="Seu nome"
          />
        </div>
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
          {loading ? "Criando conta..." : "Criar conta"}
        </button>
      </form>
    </WorkspaceAuthShell>
  );
}

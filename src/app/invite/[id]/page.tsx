"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { PERMISSION_LABELS } from "@/lib/collaborator";

interface InviteData {
  id: string;
  name: string | null;
  status: "PENDING" | "ACCEPTED" | "REVOKED";
  permissions: string[];
  workspace: {
    name: string;
    slug: string;
    logoUrl: string | null;
  };
}

export default function InviteAcceptPage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const inviteEmail = search.get("email") ?? "";
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!inviteEmail) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const r = await fetch(
        `/api/invite/${params.id}?email=${encodeURIComponent(inviteEmail)}`
      );
      if (!r.ok) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const d = await r.json();
      setInvite(d.invite);
      setName(d.invite.name || "");
      setLoading(false);
    }
    load();
  }, [params.id, inviteEmail]);

  async function acceptWithSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const r = await fetch(`/api/invite/${params.id}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "signup", name, password }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      setError(d.error || "Erro ao aceitar convite");
      setSubmitting(false);
      return;
    }
    // Auto-login
    await fetch("/api/auth/producer-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email: inviteEmail, password }),
    });
    window.location.href = "/producer";
  }

  async function acceptWithLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    // Login first
    const l = await fetch("/api/auth/producer-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email: inviteEmail, password }),
    });
    if (!l.ok) {
      const d = await l.json().catch(() => ({}));
      setError(d.error || "Falha ao entrar");
      setSubmitting(false);
      return;
    }
    const r = await fetch(`/api/invite/${params.id}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({}),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      setError(d.error || "Erro ao aceitar convite");
      setSubmitting(false);
      return;
    }
    window.location.href = "/producer";
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !invite) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Convite não encontrado
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            O link pode ter expirado ou estar incorreto.
          </p>
        </div>
      </div>
    );
  }

  if (invite.status === "REVOKED") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Convite revogado
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Fale com quem te convidou.
          </p>
        </div>
      </div>
    );
  }

  if (invite.status === "ACCEPTED") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Convite já aceito
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Faça login para acessar o painel.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg"
          >
            Ir para o login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-3 mb-5">
            {invite.workspace.logoUrl ? (
              <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-white/5 ring-1 ring-black/5 dark:ring-white/10">
                <Image
                  src={invite.workspace.logoUrl}
                  alt={invite.workspace.name}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-semibold text-lg">
                {invite.workspace.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Convite para
              </p>
              <p className="text-base font-semibold text-gray-900 dark:text-white">
                {invite.workspace.name}
              </p>
            </div>
          </div>

          <h1 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white mb-1">
            Você foi convidado como colaborador
          </h1>
          <p className="text-sm text-gray-500 mb-4">
            E-mail:{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {inviteEmail}
            </span>
          </p>

          {invite.permissions.length > 0 && (
            <div className="mb-5 p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-lg">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Você terá permissão para:
              </p>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                {invite.permissions.map((p) => (
                  <li key={p}>
                    •{" "}
                    {PERMISSION_LABELS[
                      p as keyof typeof PERMISSION_LABELS
                    ] ?? p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-2 mb-4 p-1 bg-gray-100 dark:bg-white/5 rounded-lg">
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                mode === "signup"
                  ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              Criar conta
            </button>
            <button
              onClick={() => setMode("login")}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                mode === "login"
                  ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              Já tenho conta
            </button>
          </div>

          <form
            onSubmit={mode === "signup" ? acceptWithSignup : acceptWithLogin}
            className="space-y-3"
          >
            {mode === "signup" && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Seu nome
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Senha {mode === "signup" && "(mín. 6 caracteres)"}
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>

            {error && (
              <div className="px-3 py-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-xs text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {submitting
                ? "Processando…"
                : mode === "signup"
                  ? "Criar conta e aceitar convite"
                  : "Entrar e aceitar convite"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

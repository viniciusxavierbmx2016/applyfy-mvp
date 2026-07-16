"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

interface ContextLockNoticeProps {
  /** "administrador" | "produtor" | "colaborador" | "aluno" — texto humano */
  sessionLabel: string;
  /** Por que esta área está bloqueada para a sessão atual (frase completa). */
  description: string;
  /** Destino direto do botão primário. Ignorado quando resolveStudentHome. */
  homeHref?: string;
  homeLabel: string;
  /** Pós-"Sair desta conta": o login DA ÁREA que o usuário tentou acessar. */
  loginHref: string;
  /**
   * Aluno: resolve o destino REAL no clique via GET /api/student/workspace e
   * faz hard-nav pro /w/{slug}. Necessário porque href="/" morre no
   * middleware — o proxy responde 307 pra área atual em requests authed na
   * raiz (provado por curl com header RSC: client-nav vira no-op).
   */
  resolveStudentHome?: boolean;
}

/**
 * Trava de Contexto (SYSTEM-MAP §6b, opção A): bloqueia COM AVISO, no lugar —
 * nunca redirect silencioso, nunca despejo na landing, nunca logout automático.
 *
 * O botão "Sair desta conta" usa signOut({ scope: "local" }) de propósito:
 * o /api/auth/logout é GLOBAL (revoga refresh tokens de TODOS os devices) e
 * seria desproporcional aqui — sair num aviso não pode derrubar o celular da
 * pessoa nem as outras abas (mesmo racional do ws-login, que preserva sessões
 * multi-área, e mesmo padrão do 4.3 no auth-provider). "Sair de todos os
 * dispositivos" continua sendo o botão Sair normal do header (global).
 */
export function ContextLockNotice({
  sessionLabel,
  description,
  homeHref,
  homeLabel,
  loginHref,
  resolveStudentHome,
}: ContextLockNoticeProps) {
  const [signingOut, setSigningOut] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [noWorkspace, setNoWorkspace] = useState(false);

  async function goStudentHome() {
    if (resolving) return;
    setResolving(true);
    try {
      const r = await fetch("/api/student/workspace");
      if (r.ok) {
        const d = await r.json();
        if (d?.slug) {
          window.location.href = `/w/${d.slug}`;
          return;
        }
      }
    } catch {}
    // 404/erro: aluno sem workspace — mensagem honesta no lugar, sem navegar
    // pra beco (a Raiz Inteligente assume este caso).
    setNoWorkspace(true);
    setResolving(false);
  }

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await createClient().auth.signOut({ scope: "local" });
    } catch {}
    // O cookie de contexto de workspace é httpOnly:false (setado pelo
    // ws-login) — limpa junto pra próxima sessão não herdar slug velho.
    document.cookie = "active_workspace_slug=; max-age=0; path=/";
    // Hard nav: o middleware re-roda sobre o estado sem sessão e a store
    // renasce limpa no destino.
    window.location.href = loginHref;
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 sm:p-8 text-center shadow-sm">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-6 h-6 text-amber-600 dark:text-amber-400"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white mb-2">
          Você está logado como {sessionLabel}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
          {description}
        </p>
        <div className="flex flex-col gap-2">
          {noWorkspace ? (
            <p className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg">
              Sua conta não tem acesso a nenhuma área de membros no momento.
            </p>
          ) : resolveStudentHome ? (
            <button
              type="button"
              onClick={goStudentHome}
              disabled={resolving}
              className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
            >
              {resolving ? "Localizando..." : homeLabel}
            </button>
          ) : (
            <Link
              href={homeHref!}
              className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {homeLabel}
            </Link>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors disabled:opacity-60"
          >
            {signingOut ? "Saindo..." : "Sair desta conta"}
          </button>
        </div>
      </div>
    </div>
  );
}

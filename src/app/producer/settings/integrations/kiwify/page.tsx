"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { GatewayLogo } from "@/components/gateway-logo";
import { useActiveWorkspace } from "@/hooks/use-active-workspace";

interface CourseRow {
  id: string;
  title: string;
  slug: string;
  externalProductIds: string[];
  isPublished: boolean;
}

interface KiwifyToken {
  id: string;
  label: string;
  maskedValue: string;
  createdAt: string;
  lastUsedAt: string | null;
}

function formatLastUsed(iso: string | null): string {
  if (!iso) return "Nunca usado";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "Último uso: hoje";
  if (days === 1) return "Último uso: ontem";
  if (days < 30) return `Último uso: há ${days} dias`;
  const months = Math.floor(days / 30);
  if (months < 12) return `Último uso: há ${months} ${months === 1 ? "mês" : "meses"}`;
  const years = Math.floor(days / 365);
  return `Último uso: há ${years} ${years === 1 ? "ano" : "anos"}`;
}

export default function KiwifyIntegrationPage() {
  const activeWorkspace = useActiveWorkspace();
  const [origin, setOrigin] = useState("");
  const [tokens, setTokens] = useState<KiwifyToken[]>([]);
  const [newToken, setNewToken] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [savingToken, setSavingToken] = useState(false);

  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [courseEdits, setCourseEdits] = useState<Record<string, string>>({});
  const [savingCourseId, setSavingCourseId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // URL escopada por workspace (slug). O produtor aponta o webhook da Kiwify pra cá.
  const baseUrl = origin || process.env.NEXT_PUBLIC_APP_URL || "";
  const webhookUrl = activeWorkspace
    ? `${baseUrl}/api/webhooks/kiwify/${activeWorkspace.slug}`
    : `${baseUrl}/api/webhooks/kiwify`;

  const isActive = tokens.length > 0;

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  useEffect(() => {
    setOrigin(window.location.origin);
    Promise.all([
      fetch("/api/producer/integrations/kiwify-secrets").then((r) =>
        r.ok ? r.json() : { tokens: [] }
      ),
      fetch("/api/producer/integrations/kiwify-courses").then((r) =>
        r.ok ? r.json() : { courses: [] }
      ),
    ])
      .then(([tokensData, coursesData]) => {
        setTokens(tokensData.tokens || []);
        setCourses(coursesData.courses || []);
      })
      .finally(() => setLoading(false));
  }, []);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      showToast("Não foi possível copiar");
    }
  }

  async function loadTokens() {
    const res = await fetch("/api/producer/integrations/kiwify-secrets");
    if (res.ok) {
      const d = await res.json();
      setTokens(d.tokens || []);
    }
  }

  async function addToken() {
    const value = newToken.trim();
    if (!value) return;
    setSavingToken(true);
    try {
      const res = await fetch("/api/producer/integrations/kiwify-secrets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value, label: newLabel.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || "Erro ao adicionar token");
        return;
      }
      await loadTokens();
      setNewToken("");
      setNewLabel("");
      showToast("Token adicionado");
    } finally {
      setSavingToken(false);
    }
  }

  async function removeToken(id: string) {
    setSavingToken(true);
    try {
      const res = await fetch(
        `/api/producer/integrations/kiwify-secrets?id=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || "Erro ao remover");
        return;
      }
      await loadTokens();
      showToast("Token removido");
    } finally {
      setSavingToken(false);
    }
  }

  async function saveCourseExternalIds(courseId: string, ids: string[]) {
    setSavingCourseId(courseId);
    try {
      const res = await fetch(
        `/api/producer/integrations/kiwify-courses/${courseId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ externalProductIds: ids }),
        }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(body?.error || "Erro ao salvar");
        return false;
      }
      setCourses((prev) =>
        prev.map((c) =>
          c.id === courseId
            ? { ...c, externalProductIds: body.externalProductIds ?? ids }
            : c
        )
      );
      showToast("Atualizado");
      return true;
    } finally {
      setSavingCourseId(null);
    }
  }

  async function addExternalId(courseId: string) {
    const draft = (courseEdits[courseId] ?? "").trim();
    if (!draft) return;
    const course = courses.find((c) => c.id === courseId);
    const current = course?.externalProductIds ?? [];
    if (current.includes(draft)) {
      showToast("Esse ID já está na lista");
      return;
    }
    const ok = await saveCourseExternalIds(courseId, [...current, draft]);
    if (ok) {
      setCourseEdits((prev) => {
        const rest = { ...prev };
        delete rest[courseId];
        return rest;
      });
    }
  }

  async function removeExternalId(courseId: string, id: string) {
    const course = courses.find((c) => c.id === courseId);
    const current = course?.externalProductIds ?? [];
    await saveCourseExternalIds(
      courseId,
      current.filter((x) => x !== id)
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Link
        href="/producer/settings/integrations"
        className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Voltar para integrações
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <GatewayLogo src={null} label="Kiwify" size={48} />
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
            Kiwify
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Configure o webhook e mapeie produtos aos cursos.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Webhook Kiwify */}
          <section className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Webhook Kiwify
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Endpoint que recebe os eventos de compra.
                </p>
              </div>
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                  isActive
                    ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                }`}
              >
                {isActive ? "● Ativo" : "● Inativo"}
              </span>
            </div>

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              URL do webhook
            </label>
            <div className="flex flex-col sm:flex-row gap-2 mb-5">
              <code className="flex-1 px-3 py-2.5 bg-gray-100 dark:bg-gray-900/50 border border-gray-200 dark:border-white/10 rounded-lg text-xs sm:text-sm text-gray-800 dark:text-gray-200 break-all">
                {webhookUrl}
              </code>
              <button
                type="button"
                onClick={copyUrl}
                className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-lg whitespace-nowrap"
              >
                {copied ? "Copiado!" : "Copiar"}
              </button>
            </div>

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Token de validação
            </label>
            <p className="text-xs text-gray-500 mb-3">
              A Kiwify assina cada webhook com o seu token (HMAC na URL). Cole aqui o
              mesmo token gerado no painel da Kiwify. O valor fica{" "}
              <strong>criptografado</strong> — mostramos só os últimos dígitos.
            </p>

            {tokens.length > 0 && (
              <ul className="space-y-2 mb-3">
                {tokens.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-gray-800 dark:text-gray-200 font-medium truncate">{t.label}</span>
                        <span className="font-mono text-xs text-gray-400">{t.maskedValue}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5">{formatLastUsed(t.lastUsedAt)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeToken(t.id)}
                      disabled={savingToken}
                      className="text-gray-500 hover:text-red-400 disabled:opacity-40"
                      aria-label={`Remover ${t.label}`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {tokens.length >= 5 ? (
              <p className="text-xs text-amber-500 dark:text-amber-400">
                Máximo de 5 tokens atingido. Remova um existente para adicionar outro.
              </p>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Rótulo (opcional)"
                  maxLength={100}
                  className="sm:w-48 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-primary/50"
                />
                <input
                  type="text"
                  value={newToken}
                  onChange={(e) => setNewToken(e.target.value)}
                  placeholder="Cole o token do webhook Kiwify"
                  name="kiwify-integration-token"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  data-1p-ignore
                  data-lpignore="true"
                  data-bwignore="true"
                  data-form-type="other"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addToken();
                    }
                  }}
                  className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-primary/50"
                />
                <button
                  type="button"
                  onClick={addToken}
                  disabled={!newToken.trim() || savingToken}
                  className="px-4 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-medium rounded-lg whitespace-nowrap"
                >
                  {savingToken ? "Salvando..." : "+ Adicionar"}
                </button>
              </div>
            )}
          </section>

          {/* Mapeamento de Produtos */}
          <section className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Mapeamento de Produtos
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Copie o <em>ID do produto</em> no painel da Kiwify e cole aqui. É ele
              que o webhook usa para identificar o curso liberado.
            </p>

            {courses.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum curso cadastrado.</p>
            ) : (
              <div className="space-y-2">
                {courses.map((c) => {
                  const draft = courseEdits[c.id] ?? "";
                  return (
                    <div
                      key={c.id}
                      className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-950/40"
                    >
                      <div className="min-w-0 sm:w-56 flex-shrink-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {c.title}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {c.slug}
                          {!c.isPublished && (
                            <span className="ml-1.5 text-amber-500">(rascunho)</span>
                          )}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        {c.externalProductIds.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {c.externalProductIds.map((id) => (
                              <span
                                key={id}
                                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-sm inline-flex items-center gap-2 text-gray-800 dark:text-gray-200"
                              >
                                <span className="font-mono">{id}</span>
                                <button
                                  type="button"
                                  onClick={() => removeExternalId(c.id, id)}
                                  disabled={savingCourseId === c.id}
                                  className="text-gray-500 hover:text-red-400 disabled:opacity-40"
                                  aria-label={`Remover ${id}`}
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={draft}
                            onChange={(e) =>
                              setCourseEdits((prev) => ({
                                ...prev,
                                [c.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addExternalId(c.id);
                              }
                            }}
                            placeholder="ID do produto na Kiwify"
                            className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-primary/50"
                          />
                          <button
                            type="button"
                            onClick={() => addExternalId(c.id)}
                            disabled={!draft.trim() || savingCourseId === c.id}
                            className="px-3 py-2 bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg whitespace-nowrap"
                          >
                            {savingCourseId === c.id ? "Salvando..." : "+ Adicionar"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Como configurar */}
          <section className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Como configurar
            </h2>
            <ol className="text-sm text-gray-700 dark:text-gray-300 space-y-2 list-decimal list-inside">
              <li>Copie a URL do webhook acima.</li>
              <li>
                No painel da Kiwify, vá em{" "}
                <strong>Apps → Webhooks</strong> e crie um webhook apontando para
                essa URL, no evento{" "}
                <code className="text-xs bg-gray-100 dark:bg-gray-900/50 px-1.5 py-0.5 rounded">
                  order_approved
                </code>
                .
              </li>
              <li>Copie o token gerado pela Kiwify e cole no campo acima.</li>
              <li>Cole o ID de cada produto na tabela de mapeamento.</li>
            </ol>
          </section>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-primary text-white rounded-lg shadow-xl text-sm font-medium">
          {toast}
        </div>
      )}
    </div>
  );
}

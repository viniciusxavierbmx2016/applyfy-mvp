"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { GatewayLogo } from "@/components/gateway-logo";

const DEFAULT_APPLYFY_LOGO =
  "https://play-lh.googleusercontent.com/GBYSf20osBl2a2Kpm_kN1EM9MhhBNJBM5syYac-d2IkpEL4nde5gjxVKuhMjFJM7Eg=w240-h480-rw";

interface CourseRow {
  id: string;
  title: string;
  slug: string;
  externalProductId: string | null;
  isPublished: boolean;
}

interface WebhookLog {
  id: string;
  event: string;
  email: string | null;
  productExternalId: string | null;
  courseId: string | null;
  status: "SUCCESS" | "ERROR" | "IGNORED";
  errorMessage: string | null;
  createdAt: string;
}

interface SettingStatus {
  set: boolean;
  preview: string;
}

const EVENT_FILTERS = [
  "ALL",
  "TRANSACTION_PAID",
  "TRANSACTION_REFUNDED",
  "TRANSACTION_CHARGED_BACK",
  "TRANSACTION_CREATED",
  "TRANSACTION_CANCELED",
] as const;

type EventFilter = (typeof EVENT_FILTERS)[number];

export default function AdminIntegrationsPage() {
  const [origin, setOrigin] = useState("");
  const [tokenStatus, setTokenStatus] = useState<SettingStatus | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [savingToken, setSavingToken] = useState(false);

  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [courseEdits, setCourseEdits] = useState<Record<string, string>>({});
  const [savingCourseId, setSavingCourseId] = useState<string | null>(null);

  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [eventFilter, setEventFilter] = useState<EventFilter>("ALL");

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>(DEFAULT_APPLYFY_LOGO);

  const webhookUrl = origin
    ? `${origin}/api/webhooks/applyfy`
    : `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/webhooks/applyfy`;

  const isActive = !!tokenStatus?.set;

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  const loadLogs = useCallback(async (filter: EventFilter) => {
    setLogsLoading(true);
    try {
      const qs = filter === "ALL" ? "" : `?event=${filter}`;
      const res = await fetch(`/api/admin/integrations/webhook-logs${qs}`);
      if (res.ok) {
        const d = await res.json();
        setLogs(d.logs || []);
      }
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    setOrigin(window.location.origin);
    Promise.all([
      fetch("/api/producer/settings").then((r) =>
        r.ok ? r.json() : { settings: {} }
      ),
      fetch("/api/producer/integrations/courses").then((r) =>
        r.ok ? r.json() : { courses: [] }
      ),
      fetch("/api/producer/integrations/status").then((r) =>
        r.ok ? r.json() : null
      ),
    ])
      .then(([settings, coursesData, statusData]) => {
        setTokenStatus(settings.settings?.applyfy_token ?? null);
        setCourses(coursesData.courses || []);
        const saved = statusData?.gateways?.applyfy?.logoUrl;
        if (saved) setLogoUrl(saved);
      })
      .finally(() => setLoading(false));

    loadLogs("ALL");
  }, [loadLogs]);

  useEffect(() => {
    loadLogs(eventFilter);
  }, [eventFilter, loadLogs]);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      showToast("Não foi possível copiar");
    }
  }

  async function saveToken(value: string) {
    setSavingToken(true);
    try {
      const res = await fetch("/api/producer/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { applyfy_token: value } }),
      });
      if (!res.ok) {
        showToast("Erro ao salvar");
        return;
      }
      const reload = await fetch("/api/producer/settings");
      if (reload.ok) {
        const d = await reload.json();
        setTokenStatus(d.settings?.applyfy_token ?? null);
      }
      setTokenInput("");
      showToast(value ? "Token salvo" : "Token removido");
    } finally {
      setSavingToken(false);
    }
  }

  async function saveCourseExternalId(courseId: string) {
    setSavingCourseId(courseId);
    try {
      const next = courseEdits[courseId] ?? "";
      const res = await fetch(
        `/api/admin/integrations/courses/${courseId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ externalProductId: next }),
        }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(body?.error || "Erro ao salvar");
        return;
      }
      setCourses((prev) =>
        prev.map((c) => (c.id === courseId ? { ...c, ...body.course } : c))
      );
      setCourseEdits((prev) => {
        const rest = { ...prev };
        delete rest[courseId];
        return rest;
      });
      showToast("Atualizado");
    } finally {
      setSavingCourseId(null);
    }
  }

  const groupedLogsCount = useMemo(() => {
    const map: Record<string, number> = {};
    for (const l of logs) map[l.status] = (map[l.status] || 0) + 1;
    return map;
  }, [logs]);

  return (
    <div className="max-w-5xl mx-auto">
      <Link
        href="/producer/integrations"
        className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Voltar para integrações
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <GatewayLogo src={logoUrl} label="Applyfy" size={48} />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
            Applyfy
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
          <Skeleton className="h-64" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Webhook Applyfy */}
          <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Webhook Applyfy
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Endpoint que recebe eventos de compra.
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
              <code className="flex-1 px-3 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-xs sm:text-sm text-gray-800 dark:text-gray-200 break-all">
                {webhookUrl}
              </code>
              <button
                type="button"
                onClick={copyUrl}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg whitespace-nowrap"
              >
                {copied ? "Copiado!" : "Copiar"}
              </button>
            </div>

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Token de validação
            </label>
            {tokenStatus?.set && (
              <p className="text-xs text-green-600 dark:text-green-400 mb-2">
                ✓ Configurado (termina em {tokenStatus.preview})
              </p>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder={
                  tokenStatus?.set
                    ? "Digite um novo valor para substituir"
                    : "Cole o token gerado pelo Applyfy"
                }
                className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => saveToken(tokenInput.trim())}
                disabled={!tokenInput.trim() || savingToken}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
              >
                {savingToken ? "Salvando..." : "Salvar"}
              </button>
              {tokenStatus?.set && (
                <button
                  type="button"
                  onClick={() => saveToken("")}
                  disabled={savingToken}
                  className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg"
                >
                  Remover
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              O Applyfy envia esse token no campo <code>token</code> do payload.
              O webhook só aceita requisições que batam com este valor.
            </p>
          </section>

          {/* Mapeamento de Produtos */}
          <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Mapeamento de Produtos
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Copie o <em>externalId</em> do produto no painel Applyfy e cole
              aqui. É ele que o webhook usa para identificar o curso liberado.
            </p>

            {courses.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum curso cadastrado.</p>
            ) : (
              <div className="space-y-2">
                {courses.map((c) => {
                  const editing = courseEdits[c.id];
                  const currentValue = editing ?? (c.externalProductId || "");
                  const dirty =
                    editing !== undefined &&
                    editing !== (c.externalProductId || "");
                  return (
                    <div
                      key={c.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/40"
                    >
                      <div className="min-w-0 sm:w-56 flex-shrink-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {c.title}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {c.slug}
                          {!c.isPublished && (
                            <span className="ml-1.5 text-amber-500">
                              (rascunho)
                            </span>
                          )}
                        </p>
                      </div>
                      <input
                        type="text"
                        value={currentValue}
                        onChange={(e) =>
                          setCourseEdits((prev) => ({
                            ...prev,
                            [c.id]: e.target.value,
                          }))
                        }
                        placeholder="ex: KSA912"
                        className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => saveCourseExternalId(c.id)}
                        disabled={
                          !dirty || savingCourseId === c.id
                        }
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg whitespace-nowrap"
                      >
                        {savingCourseId === c.id ? "Salvando..." : "Salvar"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Histórico de Webhooks */}
          <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Histórico de Webhooks
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Últimos 50 eventos recebidos.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-green-600 dark:text-green-400">
                  {groupedLogsCount.SUCCESS || 0} ok
                </span>
                <span className="text-red-500">
                  {groupedLogsCount.ERROR || 0} erro
                </span>
                <span className="text-gray-500">
                  {groupedLogsCount.IGNORED || 0} ignorado
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {EVENT_FILTERS.map((ev) => (
                <button
                  key={ev}
                  type="button"
                  onClick={() => setEventFilter(ev)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition ${
                    eventFilter === ev
                      ? "bg-blue-600 border-blue-500 text-white"
                      : "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-600"
                  }`}
                >
                  {ev === "ALL" ? "Todos" : ev}
                </button>
              ))}
            </div>

            {logsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : logs.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">
                Nenhum webhook recebido ainda.
              </p>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="sm:hidden space-y-2">
                  {logs.map((l) => (
                    <div
                      key={l.id}
                      className="border border-gray-200 dark:border-gray-800 rounded-lg p-3 bg-gray-50 dark:bg-gray-950/40"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-800 dark:text-gray-200 truncate">
                          {l.event}
                        </span>
                        <StatusBadge status={l.status} />
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                        {l.email || "—"}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {l.productExternalId || "—"}
                      </p>
                      {l.errorMessage && (
                        <p className="text-xs text-red-500 mt-1 truncate">
                          {l.errorMessage}
                        </p>
                      )}
                      <p className="text-[11px] text-gray-500 mt-1">
                        {new Date(l.createdAt).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200 dark:border-gray-800">
                        <th className="py-2 pr-3 font-medium">Evento</th>
                        <th className="py-2 px-3 font-medium">Email</th>
                        <th className="py-2 px-3 font-medium">externalId</th>
                        <th className="py-2 px-3 font-medium">Status</th>
                        <th className="py-2 pl-3 font-medium text-right">
                          Quando
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((l) => (
                        <tr
                          key={l.id}
                          className="border-b border-gray-100 dark:border-gray-800/60 last:border-0"
                        >
                          <td className="py-2 pr-3 font-mono text-xs text-gray-800 dark:text-gray-200 whitespace-nowrap">
                            {l.event}
                          </td>
                          <td className="py-2 px-3 text-xs text-gray-700 dark:text-gray-300 max-w-[180px] truncate">
                            {l.email || "—"}
                          </td>
                          <td className="py-2 px-3 text-xs text-gray-700 dark:text-gray-300 font-mono">
                            {l.productExternalId || "—"}
                          </td>
                          <td className="py-2 px-3">
                            <StatusBadge status={l.status} />
                            {l.errorMessage && (
                              <p
                                className="text-[11px] text-red-500 mt-0.5 truncate max-w-[220px]"
                                title={l.errorMessage}
                              >
                                {l.errorMessage}
                              </p>
                            )}
                          </td>
                          <td className="py-2 pl-3 text-xs text-gray-500 text-right whitespace-nowrap">
                            {new Date(l.createdAt).toLocaleString("pt-BR")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          {/* Como configurar */}
          <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Como configurar
            </h2>
            <ol className="text-sm text-gray-700 dark:text-gray-300 space-y-2 list-decimal list-inside">
              <li>Copie a URL do webhook acima.</li>
              <li>
                No painel Applyfy, vá em{" "}
                <strong>Configurações → Webhooks → Criar</strong>.
              </li>
              <li>
                Cole a URL, selecione os produtos e os eventos{" "}
                <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                  TRANSACTION_PAID
                </code>
                ,{" "}
                <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                  TRANSACTION_REFUNDED
                </code>
                ,{" "}
                <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                  TRANSACTION_CHARGED_BACK
                </code>
                .
              </li>
              <li>Copie o token gerado e cole no campo acima.</li>
              <li>
                Configure o <em>externalId</em> de cada produto na tabela de
                mapeamento.
              </li>
            </ol>
          </section>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-blue-600 text-white rounded-lg shadow-xl text-sm font-medium">
          {toast}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: WebhookLog["status"] }) {
  const styles =
    status === "SUCCESS"
      ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30"
      : status === "ERROR"
        ? "bg-red-500/10 text-red-500 border-red-500/30"
        : "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/30";
  const label =
    status === "SUCCESS"
      ? "Sucesso"
      : status === "ERROR"
        ? "Erro"
        : "Ignorado";
  return (
    <span
      className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full border ${styles}`}
    >
      {label}
    </span>
  );
}

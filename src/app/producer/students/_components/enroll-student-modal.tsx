"use client";

import React, { useState } from "react";
import { CustomSelect } from "@/components/custom-select";

// Copiado de producer/courses/[id]/students/_lib/format.ts — evita import
// cross-feature por um path com segmento dinâmico [id]. Mantém os mesmos valores.
const DURATION_OPTIONS = [
  { label: "Vitalício", days: null as number | null },
  { label: "30 dias", days: 30 },
  { label: "90 dias", days: 90 },
  { label: "180 dias", days: 180 },
  { label: "365 dias", days: 365 },
  { label: "Personalizado", days: -1 }, // sentinel
];

// Espelha AccessResult de courses/[id]/students/_types.ts
interface AccessResult {
  email: string;
  password: string | null;
  workspaceUrl: string;
  isMaster: boolean;
}

interface CourseOption {
  id: string;
  title: string;
}

export function EnrollStudentModal({
  courses,
  onClose,
  onEnrolled,
}: {
  courses: CourseOption[];
  onClose: () => void;
  onEnrolled: () => void;
}) {
  const [courseId, setCourseId] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [durationIdx, setDurationIdx] = useState(0);
  const [customDays, setCustomDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AccessResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const opt = DURATION_OPTIONS[durationIdx];
  const isCustom = opt.days === -1;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!courseId) {
      setError("Selecione um curso");
      return;
    }
    setLoading(true);
    const days = isCustom ? customDays : opt.days;
    try {
      const res = await fetch(`/api/courses/${courseId}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: name || undefined, days, phone: phone.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Erro ao cadastrar aluno");
        setLoading(false);
        return;
      }
      // matrícula concluída — refresca a lista da página por trás
      onEnrolled();
      setResult(
        (data && data.access) || { email, password: null, workspaceUrl: "", isMaster: false }
      );
      setLoading(false);
    } catch {
      setError("Erro ao conectar com o servidor");
      setLoading(false);
    }
  }

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 1800);
    } catch {}
  }

  // ── Tela de sucesso ───────────────────────────────────────────────────────
  if (result) {
    const fullText =
      `Acesse: ${result.workspaceUrl}\n` +
      `Email: ${result.email}\n` +
      `Senha: ${result.password ?? ""}`;
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-card rounded-2xl w-full max-w-md p-6 border border-gray-200 dark:border-gray-800">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {result.password ? "Aluno cadastrado com sucesso!" : "Matrícula concluída"}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {result.password
                  ? result.isMaster
                    ? "Senha master do workspace"
                    : "Senha temporária gerada"
                  : "Aluno já tinha acesso ativo"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-900 dark:hover:text-white -mr-1 -mt-1"
              aria-label="Fechar"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {result.password ? (
            <>
              <div className="space-y-2.5">
                <CredentialRow label="Link do workspace" value={result.workspaceUrl} copied={copied === "url"} onCopy={() => copy(result.workspaceUrl, "url")} />
                <CredentialRow label="Email" value={result.email} copied={copied === "email"} onCopy={() => copy(result.email, "email")} />
                <CredentialRow label="Senha" value={result.password ?? ""} copied={copied === "pwd"} onCopy={() => copy(result.password ?? "", "pwd")} mono />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                Envie essas informações para o aluno.
              </p>
            </>
          ) : (
            <div className="space-y-2.5">
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm">
                Este aluno já tinha acesso ativo — nenhuma senha nova foi gerada. A matrícula no curso foi confirmada.
              </div>
              {result.workspaceUrl && (
                <CredentialRow label="Link do workspace" value={result.workspaceUrl} copied={copied === "url"} onCopy={() => copy(result.workspaceUrl, "url")} />
              )}
              <CredentialRow label="Email" value={result.email} copied={copied === "email"} onCopy={() => copy(result.email, "email")} />
            </div>
          )}

          <div className="mt-5 flex flex-col sm:flex-row gap-2">
            {result.password && (
              <button
                type="button"
                onClick={() => copy(fullText, "all")}
                className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-lg"
              >
                {copied === "all" ? "Copiado!" : "Copiar tudo"}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Formulário ────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-card rounded-2xl w-full max-w-md p-6 border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Cadastrar aluno
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 dark:hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Curso *
            </label>
            <CustomSelect
              value={courseId}
              onChange={setCourseId}
              placeholder="Selecione o curso"
              className="w-full"
              options={courses.map((c) => ({ value: c.id, label: c.title }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email do aluno
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="aluno@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nome (opcional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Nome do aluno"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              WhatsApp (opcional)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="(31) 98426-6117"
            />
            <p className="text-[10px] text-gray-500 mt-1">Número com DDD para contato via WhatsApp</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tempo de acesso
            </label>
            <div className="grid grid-cols-3 gap-2">
              {DURATION_OPTIONS.map((o, i) => (
                <button
                  key={o.label}
                  type="button"
                  onClick={() => setDurationIdx(i)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition ${
                    durationIdx === i
                      ? "bg-primary text-white border-primary"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {isCustom && (
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={3650}
                  value={customDays}
                  onChange={(e) =>
                    setCustomDays(Math.max(1, Number(e.target.value) || 1))
                  }
                  className="w-28 px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  dias
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-medium rounded-lg"
            >
              {loading ? "Cadastrando..." : "Cadastrar aluno"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CredentialRow({
  label,
  value,
  copied,
  onCopy,
  mono,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
        {label}
      </p>
      <div className="flex items-stretch gap-2">
        <input
          type="text"
          readOnly
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          className={`flex-1 min-w-0 px-3 py-2 text-xs ${mono ? "font-mono" : ""} bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary`}
        />
        <button
          type="button"
          onClick={onCopy}
          className="px-3 py-2 text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg flex-shrink-0"
        >
          {copied ? "✓" : "Copiar"}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { AccessResult } from "../_types";

export function AccessSuccessModal({
  access,
  onClose,
}: {
  access: AccessResult;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const fullText =
    `Acesse: ${access.workspaceUrl}\n` +
    `Email: ${access.email}\n` +
    `Senha: ${access.password ?? ""}`;

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 1800);
    } catch {}
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-card rounded-2xl w-full max-w-md p-6 border border-gray-200 dark:border-gray-800">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-5 h-5 text-green-600 dark:text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Acesso enviado com sucesso!
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {access.isMaster
                ? "Senha master do workspace"
                : "Senha temporária gerada"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 dark:hover:text-white -mr-1 -mt-1"
            aria-label="Fechar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-2.5">
          <CredentialRow
            label="Link do workspace"
            value={access.workspaceUrl}
            copied={copied === "url"}
            onCopy={() => copy(access.workspaceUrl, "url")}
          />
          <CredentialRow
            label="Email"
            value={access.email}
            copied={copied === "email"}
            onCopy={() => copy(access.email, "email")}
          />
          <CredentialRow
            label="Senha"
            value={access.password ?? ""}
            copied={copied === "pwd"}
            onCopy={() => copy(access.password ?? "", "pwd")}
            mono
          />
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
          Envie essas informações para o aluno.
        </p>

        <div className="mt-5 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => copy(fullText, "all")}
            className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-lg"
          >
            {copied === "all" ? "Copiado!" : "Copiar tudo"}
          </button>
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

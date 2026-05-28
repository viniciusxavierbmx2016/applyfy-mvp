"use client";

import { useMemo } from "react";
import { ColorField } from "./color-field";
import type { EmailConfig } from "../_types";

// Example values for the live preview only — mirror the real {var} tokens.
const SAMPLE = {
  nome: "João Silva",
  email: "joao@email.com",
  curso: "Meu Curso",
  senha: "mc-ABCD",
  link: "https://app.mymembersclub.com.br/w/exemplo",
};

const VARS_HINT = "{nome}, {email}, {curso}, {senha}, {link}, {workspace}";

function applyVars(text: string, workspace: string): string {
  return text
    .replace(/\{nome\}/g, SAMPLE.nome)
    .replace(/\{email\}/g, SAMPLE.email)
    .replace(/\{curso\}/g, SAMPLE.curso)
    .replace(/\{senha\}/g, SAMPLE.senha)
    .replace(/\{link\}/g, SAMPLE.link)
    .replace(/\{workspace\}/g, workspace);
}

// Client-side mirror of buildAccessEmail (src/lib/email-templates.ts) so the
// preview matches what the server will actually send. Three paths:
//   1. custom HTML, 2. no customization → default look, 3. themed template.
function buildPreviewHtml(config: EmailConfig, workspace: string): string {
  if (config.emailUseCustomHtml && config.emailCustomHtml.trim()) {
    return applyVars(config.emailCustomHtml, workspace);
  }

  const hasVisualCustom = !!(
    config.emailLogoUrl ||
    config.emailPrimaryColor ||
    config.emailBgColor ||
    config.emailTitle ||
    config.emailBody ||
    config.emailFooter
  );

  // Path 2 — no customization → reproduce the default template look.
  if (!hasVisualCustom) {
    return defaultEmailHtml(workspace);
  }

  // Path 3 — themed template with the producer's fields (default fallbacks).
  const bg = config.emailBgColor || "#0a0a1a";
  const primary = config.emailPrimaryColor || "#3b82f6";
  const logo = config.emailLogoUrl || null;
  const footer = config.emailFooter
    ? applyVars(config.emailFooter, workspace)
    : workspace;
  const title = config.emailTitle
    ? applyVars(config.emailTitle, workspace)
    : `Bem-vindo(a) ao ${SAMPLE.curso}!`;
  const body = config.emailBody
    ? applyVars(config.emailBody, workspace).replace(/\n/g, "<br>")
    : `<p style="margin:0 0 14px;">Olá <strong>${SAMPLE.nome}</strong>,</p>
       <p style="margin:0 0 14px;">Seu acesso ao curso <strong>${SAMPLE.curso}</strong> foi liberado!</p>
       <p style="margin:0 0 6px;">Seus dados de acesso:</p>
       <p style="margin:0 0 4px;"><strong>Email:</strong> ${SAMPLE.email}</p>
       <p style="margin:0 0 14px;"><strong>Senha:</strong> ${SAMPLE.senha}</p>`;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:${bg};font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${bg};"><tr><td align="center" style="padding:40px 16px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
      <tr><td align="center" style="padding-bottom:32px;">
        ${logo ? `<img src="${logo}" alt="${workspace}" style="max-height:60px;max-width:200px;" />` : `<span style="font-size:24px;font-weight:bold;color:#ffffff;">${workspace}</span>`}
      </td></tr>
      <tr><td style="background-color:#1a1a2e;border-radius:16px;padding:40px 32px;">
        <h1 style="margin:0 0 24px;font-size:22px;font-weight:bold;color:#ffffff;text-align:center;">${title}</h1>
        <div style="font-size:15px;color:#d1d5db;line-height:1.6;">${body}</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;"><tr><td align="center">
          <a href="${SAMPLE.link}" style="display:inline-block;background-color:${primary};border-radius:10px;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Acessar agora</a>
        </td></tr></table>
      </td></tr>
      <tr><td align="center" style="padding-top:32px;"><p style="margin:0;font-size:13px;color:#6b7280;">${footer}</p></td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

// Mirrors baseTemplate + studentAccessGranted default output.
function defaultEmailHtml(workspace: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#0a0a1a;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a1a;"><tr><td align="center" style="padding:40px 16px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
      <tr><td align="center" style="padding-bottom:32px;"><span style="font-size:24px;font-weight:bold;color:#ffffff;">${workspace}</span></td></tr>
      <tr><td style="background-color:#1a1a2e;border-radius:16px;padding:40px 32px;">
        <h1 style="margin:0 0 16px;font-size:22px;font-weight:bold;color:#ffffff;">Acesso liberado: ${SAMPLE.curso}</h1>
        <p style="margin:0 0 14px;font-size:15px;color:#d1d5db;line-height:1.6;">Olá, ${SAMPLE.nome}! Seu acesso ao curso <strong style="color:#ffffff;">${SAMPLE.curso}</strong> na área <strong style="color:#ffffff;">${workspace}</strong> foi liberado.</p>
        <hr style="border:none;border-top:1px solid #2d2d44;margin:24px 0;">
        <p style="margin:0 0 14px;font-size:15px;color:#d1d5db;"><strong style="color:#ffffff;">Suas credenciais de acesso:</strong></p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="background-color:#0f0f23;border-radius:8px;width:100%;margin-bottom:14px;"><tr><td style="padding:12px 16px;">
          <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;">Senha temporária:</p>
          <p style="margin:0;font-size:18px;font-weight:bold;color:#ffffff;font-family:monospace;letter-spacing:2px;">${SAMPLE.senha}</p>
        </td></tr></table>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 0;"><tr><td style="background-color:#3b82f6;border-radius:10px;">
          <a href="${SAMPLE.link}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Acessar o curso</a>
        </td></tr></table>
      </td></tr>
      <tr><td align="center" style="padding-top:32px;"><p style="margin:0;font-size:13px;color:#6b7280;">${workspace} &bull; mymembersclub.com.br</p></td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

interface Props {
  config: EmailConfig;
  setField: <K extends keyof EmailConfig>(key: K, value: EmailConfig[K]) => void;
  onPickLogo: (file: File) => void;
  uploadingLogo: boolean;
  workspaceName: string;
}

export function EmailTab({
  config,
  setField,
  onPickLogo,
  uploadingLogo,
  workspaceName,
}: Props) {
  const wsName = workspaceName.trim() || "Meu Workspace";
  const previewHtml = useMemo(
    () => buildPreviewHtml(config, wsName),
    [config, wsName]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* LEFT — form */}
      <div className="space-y-4">
        {/* Toggle: custom HTML */}
        <div className="flex items-center justify-between bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-3">
          <div className="min-w-0 mr-3">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Usar HTML personalizado
            </p>
            <p className="text-[11px] text-gray-500">
              Cole seu próprio HTML em vez do template visual.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={config.emailUseCustomHtml}
            onClick={() => setField("emailUseCustomHtml", !config.emailUseCustomHtml)}
            className={`relative shrink-0 inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              config.emailUseCustomHtml ? "bg-primary" : "bg-gray-300 dark:bg-gray-700"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                config.emailUseCustomHtml ? "translate-x-[18px]" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {config.emailUseCustomHtml ? (
          <>
            <div>
              <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                Assunto do email
              </label>
              <input
                type="text"
                value={config.emailTitle}
                onChange={(e) => setField("emailTitle", e.target.value)}
                maxLength={200}
                placeholder="Seu acesso ao curso {curso}"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                HTML personalizado
              </label>
              <textarea
                value={config.emailCustomHtml}
                onChange={(e) => setField("emailCustomHtml", e.target.value)}
                maxLength={50000}
                rows={20}
                spellCheck={false}
                placeholder="<html>...</html>"
                className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-primary/50 resize-y"
              />
            </div>
          </>
        ) : (
          <>
            {/* Logo */}
            <div>
              <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                Logo do email
              </label>
              <div className="flex items-center gap-3">
                {config.emailLogoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={config.emailLogoUrl}
                    alt=""
                    className="h-10 max-w-[120px] object-contain rounded bg-gray-900/40 p-1"
                  />
                )}
                <label className="cursor-pointer text-xs font-medium text-white bg-gray-900 dark:bg-white/10 hover:opacity-90 px-3 py-2 rounded-lg whitespace-nowrap">
                  {uploadingLogo ? "Enviando…" : config.emailLogoUrl ? "Trocar" : "Enviar logo"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f) onPickLogo(f);
                    }}
                    disabled={uploadingLogo}
                    className="hidden"
                  />
                </label>
                {config.emailLogoUrl && (
                  <button
                    type="button"
                    onClick={() => setField("emailLogoUrl", "")}
                    className="text-xs text-red-600 dark:text-red-400 hover:underline"
                  >
                    Remover
                  </button>
                )}
              </div>
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-3">
              <ColorField
                label="Cor principal (botão)"
                description="Botão de acesso"
                value={config.emailPrimaryColor}
                fallback="#3b82f6"
                onChange={(v) => setField("emailPrimaryColor", v)}
              />
              <ColorField
                label="Cor de fundo"
                description="Fundo do email"
                value={config.emailBgColor}
                fallback="#0a0a1a"
                onChange={(v) => setField("emailBgColor", v)}
              />
            </div>

            {/* Title */}
            <div>
              <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                Título
              </label>
              <input
                type="text"
                value={config.emailTitle}
                onChange={(e) => setField("emailTitle", e.target.value)}
                maxLength={200}
                placeholder="Bem-vindo(a) ao {curso}!"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-primary/50"
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                Corpo da mensagem
              </label>
              <textarea
                value={config.emailBody}
                onChange={(e) => setField("emailBody", e.target.value)}
                maxLength={10000}
                rows={6}
                placeholder={"Olá {nome}, seu acesso ao curso {curso} foi liberado!\nSenha: {senha}"}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-primary/50 resize-y"
              />
            </div>

            {/* Footer */}
            <div>
              <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                Rodapé
              </label>
              <input
                type="text"
                value={config.emailFooter}
                onChange={(e) => setField("emailFooter", e.target.value)}
                maxLength={500}
                placeholder={wsName}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-primary/50"
              />
            </div>
          </>
        )}

        {/* Variables hint */}
        <div className="rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 px-3 py-2.5">
          <p className="text-[11px] text-blue-700 dark:text-blue-300">
            <strong>Variáveis disponíveis:</strong> {VARS_HINT}
          </p>
          <p className="text-[10px] text-blue-600/80 dark:text-blue-400/70 mt-1">
            Deixe tudo em branco para usar o email padrão da plataforma.
          </p>
        </div>
      </div>

      {/* RIGHT — live preview */}
      <div className="lg:sticky lg:top-4 self-start">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
          Pré-visualização
        </p>
        <div className="rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden bg-white">
          <iframe
            title="Pré-visualização do email"
            srcDoc={previewHtml}
            className="w-full h-[560px] border-0 bg-white"
            sandbox=""
          />
        </div>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
          Valores de exemplo. Variáveis são substituídas no envio real.
        </p>
      </div>
    </div>
  );
}

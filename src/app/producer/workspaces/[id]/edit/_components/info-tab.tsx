"use client";

import { useRef, type Dispatch, type SetStateAction } from "react";
import Image from "next/image";
import { HelpTooltip } from "@/components/help-tooltip";
import { inputClass, labelClass } from "../_lib/helpers";

interface InfoTabProps {
  // Identidade
  workspaceUrl: () => string;
  onCopyLink: () => void;
  logoUrl: string | null;
  name: string;
  setName: (v: string) => void;
  uploadingLogo: boolean;
  onPickLogo: (e: React.ChangeEvent<HTMLInputElement>) => void;
  // Acesso
  masterPassword: string;
  setMasterPassword: (v: string) => void;
  showMasterPassword: boolean;
  setShowMasterPassword: Dispatch<SetStateAction<boolean>>;
  customDomain: string;
  setCustomDomain: (v: string) => void;
}

export function InfoTab({
  workspaceUrl,
  onCopyLink,
  logoUrl,
  name,
  setName,
  uploadingLogo,
  onPickLogo,
  masterPassword,
  setMasterPassword,
  showMasterPassword,
  setShowMasterPassword,
  customDomain,
  setCustomDomain,
}: InfoTabProps) {
  const logoFileRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      {/* Identidade */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-0.5">Identidade do workspace</h2>
        <p className="text-xs text-gray-500 mb-4">Logo, nome e link de acesso</p>

        <div className="mb-4">
          <label className={labelClass}>
          Link do workspace
          <HelpTooltip text="Este é o link que você envia para seus alunos acessarem sua área de membros. Compartilhe nas redes sociais, email ou WhatsApp." />
        </label>
          <div className="flex items-stretch gap-2">
            <input
              type="text"
              readOnly
              value={workspaceUrl()}
              onFocus={(e) => e.currentTarget.select()}
              className={`${inputClass} !font-mono !text-xs !text-gray-500`}
            />
            <button
              type="button"
              onClick={onCopyLink}
              className="px-3 py-2 text-xs font-medium border border-gray-300 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 rounded-lg flex-shrink-0 transition-colors"
            >
              Copiar link
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Logo</label>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0">
                {logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt={name}
                    width={56}
                    height={56}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-bold text-gray-700 dark:text-gray-300">
                    {name.charAt(0).toUpperCase() || "W"}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => logoFileRef.current?.click()}
                  disabled={uploadingLogo}
                  className="px-3 py-2 text-xs font-medium bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 rounded-lg disabled:opacity-50 transition-colors"
                >
                  {uploadingLogo ? "Enviando..." : "Enviar logo"}
                </button>
                <p className="text-[11px] text-gray-500 mt-1">
                  200x200px. PNG/JPG até 2MB.
                </p>
                <input
                  ref={logoFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPickLogo}
                />
              </div>
            </div>
          </div>
          <div>
            <label className={labelClass}>Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={80}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Acesso */}
      <div className="pt-8 border-t border-gray-200 dark:border-white/5">
        <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-0.5">Acesso</h2>
        <p className="text-xs text-gray-500 mb-4">Configurações de acesso ao workspace</p>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              Senha master
              <HelpTooltip text="Senha geral para proteger o acesso ao workspace. Se ativada, todos os visitantes precisam digitá-la antes de ver os cursos." />
            </label>
            <div className="flex items-stretch gap-2">
              <input
                type={showMasterPassword ? "text" : "password"}
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                placeholder="Em branco = desativada"
                autoComplete="new-password"
                className={`${inputClass} !font-mono`}
              />
              <button
                type="button"
                onClick={() => setShowMasterPassword((v) => !v)}
                className="px-3 py-2.5 text-xs font-medium bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 rounded-lg flex-shrink-0 transition-colors"
              >
                {showMasterPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              Acesso rápido ao workspace. Útil para testes.
            </p>
          </div>
          <div className="opacity-60">
            <div className="flex items-center gap-2 mb-1.5">
              <label className="text-xs text-gray-500 dark:text-gray-400">Domínio personalizado</label>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                Em breve
              </span>
            </div>
            <input
              type="text"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="cursos.meusite.com"
              disabled
              className={`${inputClass} !font-mono cursor-not-allowed`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

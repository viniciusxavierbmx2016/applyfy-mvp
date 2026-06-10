"use client";

import { useRef, type Dispatch, type SetStateAction } from "react";
import Image from "next/image";
import { BannerUpload } from "@/components/banner-upload";
import { HelpTooltip } from "@/components/help-tooltip";
import { inputClass, HEX_RE } from "../_lib/helpers";
import type { ImagePosition } from "../_types";

interface AppearanceTabProps {
  id: string;
  // Cores da vitrine
  accentColor: string;
  setAccentColor: (v: string) => void;
  vitrineBgColor: string | null;
  setVitrineBgColor: Dispatch<SetStateAction<string | null>>;
  vitrineHeaderColor: string | null;
  setVitrineHeaderColor: Dispatch<SetStateAction<string | null>>;
  vitrineSidebarColor: string | null;
  setVitrineSidebarColor: Dispatch<SetStateAction<string | null>>;
  vitrineCardColor: string | null;
  setVitrineCardColor: Dispatch<SetStateAction<string | null>>;
  vitrineTextColor: string | null;
  setVitrineTextColor: Dispatch<SetStateAction<string | null>>;
  // Saudação da vitrine
  vitrineWelcomeText: string | null;
  setVitrineWelcomeText: Dispatch<SetStateAction<string | null>>;
  vitrineWelcomeTitle: string | null;
  setVitrineWelcomeTitle: Dispatch<SetStateAction<string | null>>;
  vitrineWelcomeEnabled: boolean;
  setVitrineWelcomeEnabled: Dispatch<SetStateAction<boolean>>;
  // Fade do banner
  vitrineBannerFadeEnabled: boolean;
  setVitrineBannerFadeEnabled: Dispatch<SetStateAction<boolean>>;
  vitrineBannerFadeColor: string | null;
  setVitrineBannerFadeColor: Dispatch<SetStateAction<string | null>>;
  vitrineBannerFadeOpacity: number;
  setVitrineBannerFadeOpacity: Dispatch<SetStateAction<number>>;
  // Banner
  wsBannerUrl: string | null;
  setWsBannerUrl: Dispatch<SetStateAction<string | null>>;
  wsBannerPos: ImagePosition;
  setWsBannerPos: Dispatch<SetStateAction<ImagePosition>>;
  wsBannerMode: "view" | "reposition";
  setWsBannerMode: Dispatch<SetStateAction<"view" | "reposition">>;
  // Favicon
  faviconUrl: string | null;
  setFaviconUrl: Dispatch<SetStateAction<string | null>>;
  uploadingFavicon: boolean;
  onUploadFavicon: (file: File) => void;
  // Tema
  forceTheme: "" | "light" | "dark";
  setForceTheme: Dispatch<SetStateAction<"" | "light" | "dark">>;
  // Restaurar padrão
  onRestoreVitrine: () => void;
}

export function AppearanceTab({
  id,
  accentColor,
  setAccentColor,
  vitrineBgColor,
  setVitrineBgColor,
  vitrineHeaderColor,
  setVitrineHeaderColor,
  vitrineSidebarColor,
  setVitrineSidebarColor,
  vitrineCardColor,
  setVitrineCardColor,
  vitrineTextColor,
  setVitrineTextColor,
  vitrineWelcomeText,
  setVitrineWelcomeText,
  vitrineWelcomeTitle,
  setVitrineWelcomeTitle,
  vitrineWelcomeEnabled,
  setVitrineWelcomeEnabled,
  vitrineBannerFadeEnabled,
  setVitrineBannerFadeEnabled,
  vitrineBannerFadeColor,
  setVitrineBannerFadeColor,
  vitrineBannerFadeOpacity,
  setVitrineBannerFadeOpacity,
  wsBannerUrl,
  setWsBannerUrl,
  wsBannerPos,
  setWsBannerPos,
  wsBannerMode,
  setWsBannerMode,
  faviconUrl,
  setFaviconUrl,
  uploadingFavicon,
  onUploadFavicon,
  forceTheme,
  setForceTheme,
  onRestoreVitrine,
}: AppearanceTabProps) {
  const faviconFileRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      {/* Cores da vitrine */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-0.5">
          Cores da vitrine
          <HelpTooltip text="Personalize as cores da vitrine (dashboard) que o aluno vê após o login. Deixe em branco para usar os padrões." />
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Cores usadas na dashboard do aluno
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { key: "accentColor", label: "Cor primária", desc: "Botões, links e destaques", value: accentColor || null, setter: (v: string | null) => setAccentColor(v ?? "") },
            { key: "vitrineBgColor", label: "Cor de fundo", desc: "Background principal", value: vitrineBgColor, setter: setVitrineBgColor },
            { key: "vitrineHeaderColor", label: "Cabeçalho", desc: "Background do header", value: vitrineHeaderColor, setter: setVitrineHeaderColor },
            { key: "vitrineSidebarColor", label: "Barra lateral", desc: "Background da sidebar", value: vitrineSidebarColor, setter: setVitrineSidebarColor },
            { key: "vitrineCardColor", label: "Cards", desc: "Background dos cards de curso", value: vitrineCardColor, setter: setVitrineCardColor },
            { key: "vitrineTextColor", label: "Texto", desc: "Cor do texto principal", value: vitrineTextColor, setter: setVitrineTextColor },
          ].map((c) => (
            <div
              key={c.key}
              className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl p-4"
            >
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {c.label}
              </label>
              <p className="text-xs text-gray-500 mb-3">{c.desc}</p>
              <div className="flex items-center gap-3">
                <label
                  className="w-9 h-9 rounded-lg shrink-0 border border-gray-200 dark:border-white/10 relative overflow-hidden cursor-pointer"
                  style={{ backgroundColor: c.value && HEX_RE.test(c.value) ? c.value : "#3b82f6" }}
                >
                  <input
                    type="color"
                    value={c.value && HEX_RE.test(c.value) ? c.value : "#3b82f6"}
                    onChange={(e) => c.setter(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </label>
                <input
                  type="text"
                  value={c.value || ""}
                  onChange={(e) => c.setter(e.target.value || null)}
                  placeholder="#000000"
                  className={`${inputClass} !font-mono flex-1`}
                />
                {c.value && (
                  <button
                    type="button"
                    onClick={() => c.setter(null)}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-2 py-1 shrink-0"
                  >
                    Restaurar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Saudação da vitrine */}
      <div className="mb-8 pt-8 border-t border-gray-200 dark:border-white/5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-0.5">
              Saudação da vitrine
              <HelpTooltip text="Título e subtítulo exibidos no topo da vitrine quando o aluno acessa a área de membros. Deixe os campos em branco para usar os textos automáticos." />
            </h2>
            <p className="text-xs text-gray-500">
              Título e subtítulo exibidos no topo da vitrine para o aluno
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={vitrineWelcomeEnabled}
            onClick={() => setVitrineWelcomeEnabled(!vitrineWelcomeEnabled)}
            className={`relative shrink-0 inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              vitrineWelcomeEnabled ? "bg-primary" : "bg-gray-300 dark:bg-gray-700"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                vitrineWelcomeEnabled ? "translate-x-[18px]" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        <div className={`space-y-4 ${vitrineWelcomeEnabled ? "" : "opacity-50"}`}>
          {/* Título */}
          <div>
            <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
              Título
            </label>
            <input
              type="text"
              value={vitrineWelcomeTitle || ""}
              onChange={(e) =>
                setVitrineWelcomeTitle(e.target.value.slice(0, 100) || null)
              }
              disabled={!vitrineWelcomeEnabled}
              placeholder="Bom dia, {nome do aluno} — automático"
              maxLength={100}
              className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors disabled:cursor-not-allowed"
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-[11px] text-gray-500">
                Deixe em branco para usar a saudação automática por horário
              </p>
              <p className="text-xs text-gray-400 shrink-0 ml-2">
                {(vitrineWelcomeTitle || "").length}/100
              </p>
            </div>
          </div>

          {/* Subtítulo */}
          <div>
            <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
              Subtítulo
            </label>
            <textarea
              value={vitrineWelcomeText || ""}
              onChange={(e) =>
                setVitrineWelcomeText(e.target.value.slice(0, 200) || null)
              }
              disabled={!vitrineWelcomeEnabled}
              placeholder="Bem-vindo à área de membros de {nome do workspace} — automático"
              rows={3}
              maxLength={200}
              className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors resize-y min-h-[80px] disabled:cursor-not-allowed"
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-[11px] text-gray-500">
                Deixe em branco para usar o texto padrão
              </p>
              <p className="text-xs text-gray-400 shrink-0 ml-2">
                {(vitrineWelcomeText || "").length}/200
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Banner */}
      <div className="mb-8 pt-8 border-t border-gray-200 dark:border-white/5">
        <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-0.5">
          Banner da vitrine
          <HelpTooltip text="Imagem de banner que aparece no topo da vitrine. Tamanho recomendado: 1920x400px." />
        </h2>
        <p className="text-xs text-gray-500 mb-4">Imagem exibida no topo da vitrine para seus alunos</p>
        <BannerUpload
          value={wsBannerUrl}
          onChange={(url) => {
            setWsBannerUrl(url);
            if (url) { setWsBannerPos({ x: 50, y: 50 }); setWsBannerMode("reposition"); }
            else { setWsBannerPos({ x: 50, y: 50 }); setWsBannerMode("view"); }
          }}
          uploadPath={`workspace-banners/${id}`}
          position={wsBannerPos}
          onPositionChange={setWsBannerPos}
          mode={wsBannerMode}
          onModeChange={setWsBannerMode}
          aspectRatio="24/5"
          cropWindows={[
            { label: "Computador", aspect: 24 / 5 },
            { label: "Tablet", aspect: 16 / 7 },
            { label: "Celular", aspect: 3 / 2 },
          ]}
          label="Banner da vitrine"
          hint="Tamanho ideal: 1920x400px. PNG, JPG ou WebP, máx. 5MB."
        />
      </div>

      {/* Fade do banner */}
      <div className="mb-8 pt-8 border-t border-gray-200 dark:border-white/5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-0.5">
              Fade do banner
              <HelpTooltip text="Esmaecimento na base do banner, atrás da saudação." />
            </h2>
            <p className="text-xs text-gray-500">
              Aplicado somente quando há um banner
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={vitrineBannerFadeEnabled}
            onClick={() => setVitrineBannerFadeEnabled(!vitrineBannerFadeEnabled)}
            className={`relative shrink-0 inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              vitrineBannerFadeEnabled ? "bg-primary" : "bg-gray-300 dark:bg-gray-700"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                vitrineBannerFadeEnabled ? "translate-x-[18px]" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        <div className={`space-y-4 ${vitrineBannerFadeEnabled ? "" : "opacity-50"}`}>
          {/* Cor */}
          <div>
            <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
              Cor
            </label>
            <div className="flex items-center gap-3">
              <label
                className="w-9 h-9 rounded-lg shrink-0 border border-gray-200 dark:border-white/10 relative overflow-hidden cursor-pointer"
                style={{ backgroundColor: vitrineBannerFadeColor && HEX_RE.test(vitrineBannerFadeColor) ? vitrineBannerFadeColor : "#d1d5db" }}
              >
                <input
                  type="color"
                  value={vitrineBannerFadeColor && HEX_RE.test(vitrineBannerFadeColor) ? vitrineBannerFadeColor : "#3b82f6"}
                  onChange={(e) => setVitrineBannerFadeColor(e.target.value)}
                  disabled={!vitrineBannerFadeEnabled}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </label>
              <input
                type="text"
                value={vitrineBannerFadeColor || ""}
                onChange={(e) => setVitrineBannerFadeColor(e.target.value || null)}
                disabled={!vitrineBannerFadeEnabled}
                placeholder="Automático — claro/escuro pelo tema"
                className={`${inputClass} !font-mono flex-1`}
              />
              {vitrineBannerFadeColor && (
                <button
                  type="button"
                  onClick={() => setVitrineBannerFadeColor(null)}
                  disabled={!vitrineBannerFadeEnabled}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-2 py-1 shrink-0"
                >
                  Restaurar
                </button>
              )}
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              Em branco = automático. Escolha uma cor para usar nos dois temas
            </p>
          </div>

          {/* Opacidade */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-medium text-gray-700 dark:text-gray-300">
                Opacidade
              </label>
              <span className="text-[11px] font-mono text-gray-500">
                {Math.round(vitrineBannerFadeOpacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(vitrineBannerFadeOpacity * 100)}
              onChange={(e) => setVitrineBannerFadeOpacity(Number(e.target.value) / 100)}
              disabled={!vitrineBannerFadeEnabled}
              className="w-full h-1 accent-primary"
            />
          </div>
        </div>
      </div>

      {/* Favicon */}
      <div className="mb-8 pt-8 border-t border-gray-200 dark:border-white/5">
        <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-0.5">
          Favicon
          <HelpTooltip text="Ícone pequeno que aparece na aba do navegador. Tamanho recomendado: 32x32px ou 64x64px." />
        </h2>
        <p className="text-xs text-gray-500 mb-4">Ícone que aparece na aba do navegador</p>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden border border-gray-200 dark:border-white/10">
            {faviconUrl ? (
              <Image src={faviconUrl} alt="favicon" width={32} height={32} className="w-8 h-8 object-contain" />
            ) : (
              <span className="text-xs text-gray-400">32×32</span>
            )}
          </div>
          <div className="flex-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => faviconFileRef.current?.click()}
              disabled={uploadingFavicon}
              className="px-3.5 py-2 text-xs font-medium bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 rounded-lg disabled:opacity-50 transition-colors"
            >
              {uploadingFavicon ? "Enviando..." : faviconUrl ? "Trocar favicon" : "Enviar favicon"}
            </button>
            {faviconUrl && (
              <button
                type="button"
                onClick={() => setFaviconUrl(null)}
                className="px-3 py-2 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400"
              >
                Remover
              </button>
            )}
            <input
              ref={faviconFileRef}
              type="file"
              accept="image/x-icon,image/png,image/svg+xml,image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) onUploadFavicon(f);
              }}
            />
          </div>
        </div>
        <p className="text-[11px] text-gray-500 mt-2">
          Recomendado: 32×32px. PNG, ICO ou SVG.
        </p>
      </div>

      {/* Tema */}
      <div className="pt-8 border-t border-gray-200 dark:border-white/5">
        <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-0.5">
          Tema para alunos
          <HelpTooltip text="Escolha entre tema escuro ou claro para a área de membros dos seus alunos." />
        </h2>
        <p className="text-xs text-gray-500 mb-4">Force um tema específico para todos os alunos</p>
        <select
          value={forceTheme}
          onChange={(e) =>
            setForceTheme(e.target.value as "" | "light" | "dark")
          }
          className={inputClass}
        >
          <option value="">Padrão do sistema (aluno escolhe)</option>
          <option value="light">Sempre claro</option>
          <option value="dark">Sempre escuro</option>
        </select>
      </div>

      {/* Restaurar padrão da vitrine */}
      <div className="pt-8 border-t border-gray-200 dark:border-white/5">
        <button
          type="button"
          onClick={onRestoreVitrine}
          className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white underline-offset-4 hover:underline"
        >
          Restaurar padrão da vitrine
        </button>
      </div>
    </div>
  );
}

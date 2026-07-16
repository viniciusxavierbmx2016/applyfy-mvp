"use client";

import { useRef, type Dispatch, type SetStateAction } from "react";
import { cn } from "@/lib/utils";
import { HelpTooltip } from "@/components/help-tooltip";
import {
  hexToRgba,
  HEX_RE,
  DEFAULT_PRIMARY,
  DEFAULT_LINK,
  DEFAULT_BG,
  DEFAULT_BOX,
  DEFAULT_SIDE,
  inputClass,
  labelClass,
} from "../_lib/helpers";
import type { LoginLayout } from "../_types";
import { ColorField } from "./color-field";
import { ImageDropzone } from "./image-dropzone";
import { LayoutIllustration } from "./layout-illustration";

interface LoginTabProps {
  // Layout
  loginLayout: LoginLayout;
  setLoginLayout: Dispatch<SetStateAction<LoginLayout>>;
  // Cores
  loginPrimaryColor: string;
  setLoginPrimaryColor: Dispatch<SetStateAction<string>>;
  loginLinkColor: string;
  setLoginLinkColor: Dispatch<SetStateAction<string>>;
  loginTextColor: string;
  setLoginTextColor: Dispatch<SetStateAction<string>>;
  loginBgColor: string;
  setLoginBgColor: Dispatch<SetStateAction<string>>;
  loginBoxColor: string;
  setLoginBoxColor: Dispatch<SetStateAction<string>>;
  loginBoxOpacity: number;
  setLoginBoxOpacity: Dispatch<SetStateAction<number>>;
  loginSideColor: string;
  setLoginSideColor: Dispatch<SetStateAction<string>>;
  // Imagens
  loginBgImageUrl: string | null;
  setLoginBgImageUrl: Dispatch<SetStateAction<string | null>>;
  uploadingBg: boolean;
  onUploadBg: (file: File) => void;
  loginLogoUrl: string | null;
  setLoginLogoUrl: Dispatch<SetStateAction<string | null>>;
  uploadingLoginLogo: boolean;
  onUploadLoginLogo: (file: File) => void;
  logoUrl: string | null;
  name: string;
  // Textos
  loginTitle: string;
  setLoginTitle: Dispatch<SetStateAction<string>>;
  loginSubtitle: string;
  setLoginSubtitle: Dispatch<SetStateAction<string>>;
}

export function LoginTab({
  loginLayout,
  setLoginLayout,
  loginPrimaryColor,
  setLoginPrimaryColor,
  loginLinkColor,
  setLoginLinkColor,
  loginTextColor,
  setLoginTextColor,
  loginBgColor,
  setLoginBgColor,
  loginBoxColor,
  setLoginBoxColor,
  loginBoxOpacity,
  setLoginBoxOpacity,
  loginSideColor,
  setLoginSideColor,
  loginBgImageUrl,
  setLoginBgImageUrl,
  uploadingBg,
  onUploadBg,
  loginLogoUrl,
  setLoginLogoUrl,
  uploadingLoginLogo,
  onUploadLoginLogo,
  logoUrl,
  name,
  loginTitle,
  setLoginTitle,
  loginSubtitle,
  setLoginSubtitle,
}: LoginTabProps) {
  const bgFileRef = useRef<HTMLInputElement>(null);
  const loginLogoFileRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      {/* Layout */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-0.5">
          Layout
          <HelpTooltip text="Escolha como o formulário de login aparece: centralizado na tela ou alinhado à esquerda com imagem de fundo." />
        </h2>
        <p className="text-xs text-gray-500 mb-4">Escolha como o formulário aparece na tela</p>
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              { key: "central", label: "Central" },
              { key: "lateral-left", label: "Lateral esquerda" },
              { key: "lateral-right", label: "Lateral direita" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setLoginLayout(opt.key)}
              className={cn(
                "group rounded-xl p-3 transition flex flex-col items-center gap-2",
                loginLayout === opt.key
                  ? "border-2 border-primary bg-primary/5"
                  : "border border-gray-200 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/20"
              )}
            >
              <div className="w-full h-[70px]">
                <LayoutIllustration kind={opt.key} />
              </div>
              <span className="text-xs font-medium text-gray-900 dark:text-white">
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Cores */}
      <div className="mb-8 pt-8 border-t border-gray-200 dark:border-white/5">
        <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-0.5">
          Cores
          <HelpTooltip text="Personalize as cores do fundo e do botão principal da página de login." />
        </h2>
        <p className="text-xs text-gray-500 mb-4">Personalize as cores da tela de login</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <ColorField
            label="Cor dos botões"
            description="Cor do botão 'Entrar'"
            value={loginPrimaryColor}
            fallback={DEFAULT_PRIMARY}
            onChange={setLoginPrimaryColor}
          />
          <ColorField
            label="Cor dos links"
            description="'Esqueci senha' e 'Criar conta'"
            value={loginLinkColor}
            fallback={DEFAULT_LINK}
            onChange={setLoginLinkColor}
          />
          <ColorField
            label="Cor do texto"
            description="Título e texto (vazio = automático pelo contraste da caixa)"
            value={loginTextColor}
            fallback="#ffffff"
            onChange={setLoginTextColor}
          />
          <ColorField
            label="Cor de fundo"
            description="Fundo quando não há imagem"
            value={loginBgColor}
            fallback={DEFAULT_BG}
            onChange={setLoginBgColor}
          />
          <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-3">
            <p className="text-[11px] text-gray-600 dark:text-gray-400">
              Cor do box
            </p>
            <div className="mt-2 flex items-center gap-2">
              <label className="w-7 h-7 rounded-md shrink-0 border border-gray-200 dark:border-white/10 relative overflow-hidden cursor-pointer" style={{ backgroundColor: HEX_RE.test(loginBoxColor) ? loginBoxColor : DEFAULT_BOX }}>
                <input
                  type="color"
                  value={HEX_RE.test(loginBoxColor) ? loginBoxColor : DEFAULT_BOX}
                  onChange={(e) => setLoginBoxColor(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </label>
              <span className="text-xs font-mono text-gray-400 dark:text-gray-500">
                {HEX_RE.test(loginBoxColor) ? loginBoxColor : "padrão"}
              </span>
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-gray-500">Opacidade</span>
                <span className="text-[11px] font-mono text-gray-500">
                  {Math.round(loginBoxOpacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(loginBoxOpacity * 100)}
                onChange={(e) => setLoginBoxOpacity(Number(e.target.value) / 100)}
                className="w-full h-1 accent-primary"
              />
            </div>
            <div
              className="mt-2 w-full h-6 rounded"
              style={{
                backgroundColor: hexToRgba(
                  HEX_RE.test(loginBoxColor) ? loginBoxColor : DEFAULT_BOX,
                  loginBoxOpacity
                ),
                backgroundImage:
                  "linear-gradient(45deg, rgba(127,127,127,0.15) 25%, transparent 25%, transparent 75%, rgba(127,127,127,0.15) 75%), linear-gradient(45deg, rgba(127,127,127,0.15) 25%, transparent 25%, transparent 75%, rgba(127,127,127,0.15) 75%)",
                backgroundSize: "12px 12px",
                backgroundPosition: "0 0, 6px 6px",
              }}
            />
          </div>
          {(loginLayout === "lateral-left" || loginLayout === "lateral-right") && (
            <ColorField
              label="Fundo lateral"
              description="Cor ao lado da imagem"
              value={loginSideColor}
              fallback={DEFAULT_SIDE}
              onChange={setLoginSideColor}
            />
          )}
        </div>
      </div>

      {/* Imagens */}
      <div className="mb-8 pt-8 border-t border-gray-200 dark:border-white/5">
        <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-0.5">
          Imagens
          <HelpTooltip text="Adicione uma imagem de fundo e seu logo na página de login. Formatos aceitos: JPG, PNG, WebP." />
        </h2>
        <p className="text-xs text-gray-500 mb-4">Imagem de fundo e logo para a tela de login</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ImageDropzone
            label="Imagem de fundo"
            dimensions="1920×1080"
            imageUrl={loginBgImageUrl}
            uploading={uploadingBg}
            fallbackColor={HEX_RE.test(loginBgColor) ? loginBgColor : null}
            onPick={() => bgFileRef.current?.click()}
            onRemove={() => setLoginBgImageUrl(null)}
          />
          <ImageDropzone
            label="Logo do login"
            dimensions="200×200"
            imageUrl={loginLogoUrl || logoUrl || null}
            imageIsFallback={!loginLogoUrl && !!logoUrl}
            uploading={uploadingLoginLogo}
            onPick={() => loginLogoFileRef.current?.click()}
            onRemove={loginLogoUrl ? () => setLoginLogoUrl(null) : undefined}
            initial={name.charAt(0).toUpperCase() || "W"}
          />
        </div>
        <input
          ref={bgFileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) onUploadBg(f);
          }}
        />
        <input
          ref={loginLogoFileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) onUploadLoginLogo(f);
          }}
        />
      </div>

      {/* Textos */}
      <div className="pt-8 border-t border-gray-200 dark:border-white/5">
        <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-0.5">
          Textos
          <HelpTooltip text="Personalize o título e subtítulo que aparecem na página de login dos seus alunos." />
        </h2>
        <p className="text-xs text-gray-500 mb-4">Mensagens que aparecem na tela de login</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Título de boas-vindas</label>
            <input
              type="text"
              value={loginTitle}
              onChange={(e) => setLoginTitle(e.target.value)}
              placeholder={`Bem-vindo a ${name || "..."}`}
              maxLength={80}
              className={inputClass}
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Aparece acima do formulário
            </p>
          </div>
          <div>
            <label className={labelClass}>Subtítulo</label>
            <input
              type="text"
              value={loginSubtitle}
              onChange={(e) => setLoginSubtitle(e.target.value)}
              placeholder="Acesse sua conta para continuar"
              maxLength={120}
              className={inputClass}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

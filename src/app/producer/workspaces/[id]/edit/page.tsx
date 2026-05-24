"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { HelpTooltip } from "@/components/help-tooltip";
import type { LoginLayout, Workspace, TabKey, ImagePosition } from "./_types";
import {
  compressImage,
  hexToRgba,
  parsePosition,
  DEFAULT_BG,
  DEFAULT_PRIMARY,
  DEFAULT_BOX,
  DEFAULT_BOX_OPACITY,
  DEFAULT_SIDE,
  DEFAULT_LINK,
  HEX_RE,
  inputClass,
  labelClass,
} from "./_lib/helpers";
import { TABS } from "./_lib/tabs";
import { ColorField } from "./_components/color-field";
import { ImageDropzone } from "./_components/image-dropzone";
import { LayoutIllustration } from "./_components/layout-illustration";
import { PreviewIframe } from "./_components/preview-iframe";
import { InfoTab } from "./_components/info-tab";
import { AppearanceTab } from "./_components/appearance-tab";

export default function EditWorkspacePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [tab, setTab] = useState<TabKey>("info");
  const [ws, setWs] = useState<Workspace | null>(null);

  const [name, setName] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [showMasterPassword, setShowMasterPassword] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [loginLayout, setLoginLayout] = useState<LoginLayout>("central");
  const [loginBgColor, setLoginBgColor] = useState(DEFAULT_BG);
  const [loginPrimaryColor, setLoginPrimaryColor] = useState(DEFAULT_PRIMARY);
  const [loginBgImageUrl, setLoginBgImageUrl] = useState<string | null>(null);
  const [loginLogoUrl, setLoginLogoUrl] = useState<string | null>(null);
  const [loginTitle, setLoginTitle] = useState("");
  const [loginSubtitle, setLoginSubtitle] = useState("");
  const [loginBoxColor, setLoginBoxColor] = useState(DEFAULT_BOX);
  const [loginBoxOpacity, setLoginBoxOpacity] =
    useState<number>(DEFAULT_BOX_OPACITY);
  const [loginSideColor, setLoginSideColor] = useState(DEFAULT_SIDE);
  const [loginLinkColor, setLoginLinkColor] = useState(DEFAULT_LINK);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [uploadingLoginLogo, setUploadingLoginLogo] = useState(false);

  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [forceTheme, setForceTheme] = useState<"" | "light" | "dark">("");
  const [customDomain, setCustomDomain] = useState("");
  const [accentColor, setAccentColor] = useState("");
  const [wsBannerUrl, setWsBannerUrl] = useState<string | null>(null);
  const [wsBannerPos, setWsBannerPos] = useState<ImagePosition>({ x: 50, y: 50 });
  const [wsBannerMode, setWsBannerMode] = useState<"view" | "reposition">("view");

  const [vitrineBgColor, setVitrineBgColor] = useState<string | null>(null);
  const [vitrineSidebarColor, setVitrineSidebarColor] = useState<string | null>(null);
  const [vitrineHeaderColor, setVitrineHeaderColor] = useState<string | null>(null);
  const [vitrineCardColor, setVitrineCardColor] = useState<string | null>(null);
  const [vitrineTextColor, setVitrineTextColor] = useState<string | null>(null);
  const [vitrineWelcomeText, setVitrineWelcomeText] = useState<string | null>(null);
  const [vitrineLayoutStyle, setVitrineLayoutStyle] = useState<string>("netflix");

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const bgFileRef = useRef<HTMLInputElement>(null);
  const loginLogoFileRef = useRef<HTMLInputElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewKey, setPreviewKey] = useState(() => Date.now());

  useEffect(() => {
    if (!previewOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [previewOpen]);

  useEffect(() => {
    fetch("/api/workspaces")
      .then((r) => (r.ok ? r.json() : { workspaces: [] }))
      .then((d) => {
        const found = (d.workspaces || []).find((w: Workspace) => w.id === id);
        if (found) {
          setWs(found);
          setName(found.name);
          setMasterPassword(found.masterPassword || "");
          setLogoUrl(found.logoUrl || null);
          setLoginLayout((found.loginLayout as LoginLayout) || "central");
          setLoginBgColor(found.loginBgColor || DEFAULT_BG);
          setLoginPrimaryColor(found.loginPrimaryColor || DEFAULT_PRIMARY);
          setLoginBgImageUrl(found.loginBgImageUrl || null);
          setLoginLogoUrl(found.loginLogoUrl || null);
          setLoginTitle(found.loginTitle || "");
          setLoginSubtitle(found.loginSubtitle || "");
          setLoginBoxColor(found.loginBoxColor || DEFAULT_BOX);
          setLoginBoxOpacity(
            typeof found.loginBoxOpacity === "number"
              ? found.loginBoxOpacity
              : DEFAULT_BOX_OPACITY
          );
          setLoginSideColor(found.loginSideColor || DEFAULT_SIDE);
          setLoginLinkColor(found.loginLinkColor || DEFAULT_LINK);
          setAccentColor(found.accentColor || "");
          setWsBannerUrl(found.bannerUrl || null);
          setWsBannerPos(parsePosition(found.bannerPosition));
          setFaviconUrl(found.faviconUrl || null);
          setForceTheme(
            found.forceTheme === "light" || found.forceTheme === "dark"
              ? found.forceTheme
              : ""
          );
          setCustomDomain(found.customDomain || "");
        }
      })
      .finally(() => setLoading(false));

    fetch(`/api/producer/workspaces/${id}/vitrine`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.customization) return;
        const c = d.customization;
        setVitrineBgColor(c.vitrineBgColor ?? null);
        setVitrineSidebarColor(c.vitrineSidebarColor ?? null);
        setVitrineHeaderColor(c.vitrineHeaderColor ?? null);
        setVitrineCardColor(c.vitrineCardColor ?? null);
        setVitrineTextColor(c.vitrineTextColor ?? null);
        setVitrineWelcomeText(c.vitrineWelcomeText ?? null);
        setVitrineLayoutStyle(c.vitrineLayoutStyle ?? "netflix");
      })
      .catch(() => {});
  }, [id]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function workspaceUrl() {
    const slug = ws?.slug || "";
    if (typeof window !== "undefined") {
      return `${window.location.origin}/w/${slug}`;
    }
    return `${process.env.NEXT_PUBLIC_APP_URL || ""}/w/${slug}`;
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(workspaceUrl());
      showToast("Link copiado!");
    } catch {
      showToast("Não foi possível copiar");
    }
  }

  async function onPickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploadingLogo(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/workspaces/${id}/logo`, {
        method: "POST",
        body: fd,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error || "Erro no upload");
        return;
      }
      setLogoUrl(body.url);
      showToast("Logo atualizada");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function uploadLoginImage(
    file: File,
    kind: "bgImage" | "loginLogo" | "favicon"
  ) {
    const setter =
      kind === "bgImage"
        ? setUploadingBg
        : kind === "loginLogo"
          ? setUploadingLoginLogo
          : setUploadingFavicon;
    setter(true);
    setError(null);
    try {
      let processedFile = file;
      try {
        processedFile = await compressImage(file, 4);
      } catch {
        // Se compressão falhar, tenta com o original
      }
      const fd = new FormData();
      fd.append("file", processedFile);
      fd.append("kind", kind);
      const res = await fetch(`/api/workspaces/${id}/login-images`, {
        method: "POST",
        body: fd,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 413) {
          setError("Imagem muito grande. Tente uma imagem menor que 4MB ou com menor resolução.");
        } else if (res.status === 400) {
          setError(body?.error || "Formato inválido. Use PNG ou JPG.");
        } else {
          setError(body?.error || "Erro ao enviar imagem. Tente novamente.");
        }
        return;
      }
      if (kind === "bgImage") setLoginBgImageUrl(body.url);
      else if (kind === "loginLogo") setLoginLogoUrl(body.url);
      else setFaviconUrl(body.url);
      showToast(
        kind === "bgImage"
          ? "Imagem de fundo atualizada"
          : kind === "loginLogo"
            ? "Logo do login atualizada"
            : "Favicon atualizado"
      );
    } finally {
      setter(false);
    }
  }

  async function restoreVitrine() {
    if (!window.confirm("Restaurar cores padrão da vitrine?")) return;
    const res = await fetch(`/api/producer/workspaces/${id}/vitrine`, {
      method: "DELETE",
    });
    if (!res.ok) {
      showToast("Erro ao restaurar");
      return;
    }
    setAccentColor("");
    setVitrineBgColor(null);
    setVitrineSidebarColor(null);
    setVitrineHeaderColor(null);
    setVitrineCardColor(null);
    setVitrineTextColor(null);
    setVitrineWelcomeText(null);
    setVitrineLayoutStyle("netflix");
    showToast("Vitrine restaurada para o padrão");
  }

  async function save(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        masterPassword: masterPassword.trim() || null,
        accentColor: accentColor && HEX_RE.test(accentColor) ? accentColor : null,
        bannerUrl: wsBannerUrl || null,
        bannerPosition: JSON.stringify(wsBannerPos),
        faviconUrl: faviconUrl || null,
        forceTheme: forceTheme || null,
        customDomain: customDomain.trim() || null,
      };
      if (loginBgColor && !HEX_RE.test(loginBgColor)) {
        setError("Cor de fundo deve ser hex (#RRGGBB)");
        setSaving(false);
        return;
      }
      if (loginPrimaryColor && !HEX_RE.test(loginPrimaryColor)) {
        setError("Cor primária deve ser hex (#RRGGBB)");
        setSaving(false);
        return;
      }
      if (loginBoxColor && !HEX_RE.test(loginBoxColor)) {
        setError("Cor do box deve ser hex (#RRGGBB)");
        setSaving(false);
        return;
      }
      if (loginSideColor && !HEX_RE.test(loginSideColor)) {
        setError("Cor lateral deve ser hex (#RRGGBB)");
        setSaving(false);
        return;
      }
      if (loginLinkColor && !HEX_RE.test(loginLinkColor)) {
        setError("Cor dos links deve ser hex (#RRGGBB)");
        setSaving(false);
        return;
      }
      payload.loginLayout = loginLayout;
      payload.loginBgColor = loginBgColor || null;
      payload.loginPrimaryColor = loginPrimaryColor || null;
      payload.loginBgImageUrl = loginBgImageUrl || null;
      payload.loginLogoUrl = loginLogoUrl || null;
      payload.loginTitle = loginTitle.trim() || null;
      payload.loginSubtitle = loginSubtitle.trim() || null;
      payload.loginBoxColor = loginBoxColor || null;
      payload.loginBoxOpacity = loginBoxOpacity;
      payload.loginSideColor = loginSideColor || null;
      payload.loginLinkColor = loginLinkColor || null;

      const vitrinePayload = {
        accentColor: accentColor && HEX_RE.test(accentColor) ? accentColor : null,
        vitrineBgColor: vitrineBgColor && HEX_RE.test(vitrineBgColor) ? vitrineBgColor : null,
        vitrineSidebarColor: vitrineSidebarColor && HEX_RE.test(vitrineSidebarColor) ? vitrineSidebarColor : null,
        vitrineHeaderColor: vitrineHeaderColor && HEX_RE.test(vitrineHeaderColor) ? vitrineHeaderColor : null,
        vitrineCardColor: vitrineCardColor && HEX_RE.test(vitrineCardColor) ? vitrineCardColor : null,
        vitrineTextColor: vitrineTextColor && HEX_RE.test(vitrineTextColor) ? vitrineTextColor : null,
        vitrineWelcomeText: vitrineWelcomeText || null,
        vitrineLayoutStyle,
      };

      const [resWorkspace, resVitrine] = await Promise.all([
        fetch(`/api/workspaces/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
        fetch(`/api/producer/workspaces/${id}/vitrine`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(vitrinePayload),
        }),
      ]);

      if (!resWorkspace.ok) {
        const b = await resWorkspace.json().catch(() => ({}));
        setError(b?.error || "Erro ao salvar workspace");
        return;
      }
      if (!resVitrine.ok) {
        const b = await resVitrine.json().catch(() => ({}));
        setError(b?.error || "Erro ao salvar vitrine");
        return;
      }
      showToast("Workspace atualizado");
      setPreviewKey(Date.now());
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="h-5 w-20 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-4" />
        <div className="h-48 bg-gray-100 dark:bg-gray-900 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!ws) {
    return (
      <div className="max-w-xl mx-auto text-center py-12">
        <p className="text-gray-500">Workspace não encontrado.</p>
        <Link
          href="/producer/workspaces"
          className="inline-block mt-4 text-primary"
        >
          Voltar
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div className="mb-1">
        <Link
          href="/producer/workspaces"
          className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-0.5">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
          Editar workspace
        </h1>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-500 mb-4 font-mono">
        /w/{ws.slug}
      </p>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800 mb-6 overflow-x-auto">
        <nav className="flex gap-0 -mb-px min-w-max">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap",
                tab === t.key
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6">
          {error}
        </div>
      )}

      <form onSubmit={save}>
        {tab === "info" && (
          <InfoTab
            workspaceUrl={workspaceUrl}
            onCopyLink={copyLink}
            logoUrl={logoUrl}
            name={name}
            setName={setName}
            uploadingLogo={uploadingLogo}
            onPickLogo={onPickLogo}
            masterPassword={masterPassword}
            setMasterPassword={setMasterPassword}
            showMasterPassword={showMasterPassword}
            setShowMasterPassword={setShowMasterPassword}
            customDomain={customDomain}
            setCustomDomain={setCustomDomain}
          />
        )}

        {tab === "login" && (
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
                  if (f) uploadLoginImage(f, "bgImage");
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
                  if (f) uploadLoginImage(f, "loginLogo");
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
        )}

        {tab === "appearance" && (
          <AppearanceTab
            id={id}
            accentColor={accentColor}
            setAccentColor={setAccentColor}
            vitrineBgColor={vitrineBgColor}
            setVitrineBgColor={setVitrineBgColor}
            vitrineHeaderColor={vitrineHeaderColor}
            setVitrineHeaderColor={setVitrineHeaderColor}
            vitrineSidebarColor={vitrineSidebarColor}
            setVitrineSidebarColor={setVitrineSidebarColor}
            vitrineCardColor={vitrineCardColor}
            setVitrineCardColor={setVitrineCardColor}
            vitrineTextColor={vitrineTextColor}
            setVitrineTextColor={setVitrineTextColor}
            vitrineWelcomeText={vitrineWelcomeText}
            setVitrineWelcomeText={setVitrineWelcomeText}
            wsBannerUrl={wsBannerUrl}
            setWsBannerUrl={setWsBannerUrl}
            wsBannerPos={wsBannerPos}
            setWsBannerPos={setWsBannerPos}
            wsBannerMode={wsBannerMode}
            setWsBannerMode={setWsBannerMode}
            faviconUrl={faviconUrl}
            setFaviconUrl={setFaviconUrl}
            uploadingFavicon={uploadingFavicon}
            onUploadFavicon={(f) => uploadLoginImage(f, "favicon")}
            forceTheme={forceTheme}
            setForceTheme={setForceTheme}
            onRestoreVitrine={restoreVitrine}
          />
        )}
      </form>

      {/* Footer sticky único */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm border-t border-gray-200 dark:border-white/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/producer/workspaces")}
            className="px-4 py-2 border border-gray-300 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
          >
            Cancelar
          </button>
          {tab === "login" && (
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="px-4 py-2 border border-gray-300 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
            >
              Pré-visualizar
            </button>
          )}
          <button
            type="button"
            onClick={() => save()}
            disabled={saving || !name.trim()}
            className="px-6 py-2 bg-primary hover:bg-primary disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      {previewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="relative w-full max-w-5xl bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: "85vh", height: "85vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gray-950 flex-shrink-0">
              <p className="text-sm font-semibold text-white">
                Pré-visualização da tela de login
              </p>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                aria-label="Fechar"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden p-4 bg-gray-900">
              <div className="h-full w-full rounded-xl overflow-hidden border border-white/10 flex flex-col bg-gray-950">
                <div className="h-9 px-3 bg-gray-800 flex items-center gap-2 flex-shrink-0">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#ff5f57" }} />
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#ffbd2e" }} />
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#28c840" }} />
                  </div>
                  <div className="flex-1 mx-2 h-6 rounded-full bg-gray-700 flex items-center px-3 overflow-hidden">
                    <span className="text-xs text-gray-400 truncate">
                      applyfy.com/w/{ws?.slug || ""}/login
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-h-0">
                  <PreviewIframe slug={ws?.slug || ""} reloadKey={previewKey} />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-white/10 bg-gray-950 flex-shrink-0">
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="px-3.5 py-2 text-sm font-medium bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg"
              >
                Fechar
              </button>
              {ws?.slug && (
                <a
                  href={`/w/${ws.slug}/login`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium bg-primary hover:bg-primary-hover text-white rounded-lg"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Abrir em nova aba
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

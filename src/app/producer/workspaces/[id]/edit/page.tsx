"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { LoginLayout, Workspace, TabKey, ImagePosition, EmailConfig } from "./_types";
import {
  compressImage,
  parsePosition,
  DEFAULT_BG,
  DEFAULT_PRIMARY,
  DEFAULT_BOX,
  DEFAULT_BOX_OPACITY,
  DEFAULT_SIDE,
  DEFAULT_LINK,
  HEX_RE,
} from "./_lib/helpers";
import { TABS } from "./_lib/tabs";
import { InfoTab } from "./_components/info-tab";
import { AppearanceTab } from "./_components/appearance-tab";
import { LoginTab } from "./_components/login-tab";
import { EmailTab } from "./_components/email-tab";
import { PreviewModal } from "./_components/preview-modal";

const EMPTY_EMAIL_CONFIG: EmailConfig = {
  emailLogoUrl: "",
  emailPrimaryColor: "",
  emailBgColor: "",
  emailBoxColor: "",
  emailTitle: "",
  emailBody: "",
  emailFooter: "",
  emailCustomHtml: "",
  emailUseCustomHtml: false,
};

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
  const [vitrineWelcomeTitle, setVitrineWelcomeTitle] = useState<string | null>(null);
  const [vitrineWelcomeEnabled, setVitrineWelcomeEnabled] = useState<boolean>(true);
  const [vitrineBannerFadeEnabled, setVitrineBannerFadeEnabled] = useState<boolean>(true);
  const [vitrineBannerFadeColor, setVitrineBannerFadeColor] = useState<string | null>(null);
  const [vitrineBannerFadeOpacity, setVitrineBannerFadeOpacity] = useState<number>(1);
  const [vitrineLayoutStyle, setVitrineLayoutStyle] = useState<string>("netflix");

  const [emailConfig, setEmailConfig] = useState<EmailConfig>(EMPTY_EMAIL_CONFIG);
  const [uploadingEmailLogo, setUploadingEmailLogo] = useState(false);
  const setEmailField = <K extends keyof EmailConfig>(
    key: K,
    value: EmailConfig[K]
  ) => setEmailConfig((prev) => ({ ...prev, [key]: value }));

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

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
          setEmailConfig({
            emailLogoUrl: found.emailLogoUrl || "",
            emailPrimaryColor: found.emailPrimaryColor || "",
            emailBgColor: found.emailBgColor || "",
            emailBoxColor: found.emailBoxColor || "",
            emailTitle: found.emailTitle || "",
            emailBody: found.emailBody || "",
            emailFooter: found.emailFooter || "",
            emailCustomHtml: found.emailCustomHtml || "",
            emailUseCustomHtml: !!found.emailUseCustomHtml,
          });
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
        setVitrineWelcomeTitle(c.vitrineWelcomeTitle ?? null);
        setVitrineWelcomeEnabled(c.vitrineWelcomeEnabled ?? true);
        setVitrineBannerFadeEnabled(c.vitrineBannerFadeEnabled ?? true);
        setVitrineBannerFadeColor(c.vitrineBannerFadeColor ?? null);
        setVitrineBannerFadeOpacity(c.vitrineBannerFadeOpacity ?? 1);
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

  async function onPickEmailLogo(file: File) {
    setUploadingEmailLogo(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("path", `workspaces/${id}/email-logo`);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error || "Erro no upload");
        return;
      }
      setEmailField("emailLogoUrl", body.url);
    } finally {
      setUploadingEmailLogo(false);
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
    setVitrineWelcomeTitle(null);
    setVitrineWelcomeEnabled(true);
    setVitrineBannerFadeEnabled(true);
    setVitrineBannerFadeColor(null);
    setVitrineBannerFadeOpacity(1);
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

      // Access-email customization. Colors only when valid hex (server rejects
      // malformed); text trimmed → null when empty. Defaults restore on empty.
      payload.emailLogoUrl = emailConfig.emailLogoUrl.trim() || null;
      payload.emailPrimaryColor =
        emailConfig.emailPrimaryColor && HEX_RE.test(emailConfig.emailPrimaryColor)
          ? emailConfig.emailPrimaryColor
          : null;
      payload.emailBgColor =
        emailConfig.emailBgColor && HEX_RE.test(emailConfig.emailBgColor)
          ? emailConfig.emailBgColor
          : null;
      payload.emailBoxColor =
        emailConfig.emailBoxColor && HEX_RE.test(emailConfig.emailBoxColor)
          ? emailConfig.emailBoxColor
          : null;
      payload.emailTitle = emailConfig.emailTitle.trim() || null;
      payload.emailBody = emailConfig.emailBody.trim() || null;
      payload.emailFooter = emailConfig.emailFooter.trim() || null;
      payload.emailCustomHtml = emailConfig.emailCustomHtml.trim() || null;
      payload.emailUseCustomHtml = emailConfig.emailUseCustomHtml;

      const vitrinePayload = {
        accentColor: accentColor && HEX_RE.test(accentColor) ? accentColor : null,
        vitrineBgColor: vitrineBgColor && HEX_RE.test(vitrineBgColor) ? vitrineBgColor : null,
        vitrineSidebarColor: vitrineSidebarColor && HEX_RE.test(vitrineSidebarColor) ? vitrineSidebarColor : null,
        vitrineHeaderColor: vitrineHeaderColor && HEX_RE.test(vitrineHeaderColor) ? vitrineHeaderColor : null,
        vitrineCardColor: vitrineCardColor && HEX_RE.test(vitrineCardColor) ? vitrineCardColor : null,
        vitrineTextColor: vitrineTextColor && HEX_RE.test(vitrineTextColor) ? vitrineTextColor : null,
        vitrineWelcomeText: vitrineWelcomeText || null,
        vitrineWelcomeTitle: vitrineWelcomeTitle || null,
        vitrineWelcomeEnabled: vitrineWelcomeEnabled,
        vitrineBannerFadeEnabled: vitrineBannerFadeEnabled,
        vitrineBannerFadeColor: vitrineBannerFadeColor || null,
        vitrineBannerFadeOpacity: vitrineBannerFadeOpacity,
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
          <LoginTab
            loginLayout={loginLayout}
            setLoginLayout={setLoginLayout}
            loginPrimaryColor={loginPrimaryColor}
            setLoginPrimaryColor={setLoginPrimaryColor}
            loginLinkColor={loginLinkColor}
            setLoginLinkColor={setLoginLinkColor}
            loginBgColor={loginBgColor}
            setLoginBgColor={setLoginBgColor}
            loginBoxColor={loginBoxColor}
            setLoginBoxColor={setLoginBoxColor}
            loginBoxOpacity={loginBoxOpacity}
            setLoginBoxOpacity={setLoginBoxOpacity}
            loginSideColor={loginSideColor}
            setLoginSideColor={setLoginSideColor}
            loginBgImageUrl={loginBgImageUrl}
            setLoginBgImageUrl={setLoginBgImageUrl}
            uploadingBg={uploadingBg}
            onUploadBg={(f) => uploadLoginImage(f, "bgImage")}
            loginLogoUrl={loginLogoUrl}
            setLoginLogoUrl={setLoginLogoUrl}
            uploadingLoginLogo={uploadingLoginLogo}
            onUploadLoginLogo={(f) => uploadLoginImage(f, "loginLogo")}
            logoUrl={logoUrl}
            name={name}
            loginTitle={loginTitle}
            setLoginTitle={setLoginTitle}
            loginSubtitle={loginSubtitle}
            setLoginSubtitle={setLoginSubtitle}
          />
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
            vitrineWelcomeTitle={vitrineWelcomeTitle}
            setVitrineWelcomeTitle={setVitrineWelcomeTitle}
            vitrineWelcomeEnabled={vitrineWelcomeEnabled}
            setVitrineWelcomeEnabled={setVitrineWelcomeEnabled}
            vitrineBannerFadeEnabled={vitrineBannerFadeEnabled}
            setVitrineBannerFadeEnabled={setVitrineBannerFadeEnabled}
            vitrineBannerFadeColor={vitrineBannerFadeColor}
            setVitrineBannerFadeColor={setVitrineBannerFadeColor}
            vitrineBannerFadeOpacity={vitrineBannerFadeOpacity}
            setVitrineBannerFadeOpacity={setVitrineBannerFadeOpacity}
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

        {tab === "email" && (
          <EmailTab
            config={emailConfig}
            setField={setEmailField}
            onPickLogo={onPickEmailLogo}
            uploadingLogo={uploadingEmailLogo}
            workspaceName={name}
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
        <PreviewModal
          slug={ws?.slug || ""}
          reloadKey={previewKey}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
}

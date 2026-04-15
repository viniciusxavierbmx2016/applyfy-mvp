"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type LoginLayout = "central" | "lateral-left" | "lateral-right";

interface Workspace {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  loginLayout: LoginLayout;
  loginBgImageUrl: string | null;
  loginBgColor: string | null;
  loginPrimaryColor: string | null;
  loginLogoUrl: string | null;
  loginTitle: string | null;
  loginSubtitle: string | null;
  loginBoxColor: string | null;
  loginBoxOpacity: number | null;
  loginSideColor: string | null;
  loginLinkColor: string | null;
  masterPassword: string | null;
  faviconUrl: string | null;
  forceTheme: string | null;
  customDomain: string | null;
  isActive: boolean;
}

const DEFAULT_BG = "#0f172a";
const DEFAULT_PRIMARY = "#3b82f6";
const DEFAULT_BOX = "#1e293b";
const DEFAULT_BOX_OPACITY = 0.8;
const DEFAULT_SIDE = "#0f172a";
const DEFAULT_LINK = "#3b82f6";
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function hexToRgba(hex: string, alpha: number): string {
  if (!HEX_RE.test(hex)) return `rgba(30, 41, 59, ${alpha})`;
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

type TabKey = "info" | "login" | "settings";

export default function EditWorkspacePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [tab, setTab] = useState<TabKey>("info");
  const [ws, setWs] = useState<Workspace | null>(null);

  // Info tab fields
  const [name, setName] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [showMasterPassword, setShowMasterPassword] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Login tab fields
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

  // Settings tab fields
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [forceTheme, setForceTheme] = useState<"" | "light" | "dark">("");
  const [customDomain, setCustomDomain] = useState("");
  const faviconFileRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const logoFileRef = useRef<HTMLInputElement>(null);
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
    return `https://applyfy-mvp.vercel.app/w/${slug}`;
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
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
      const res = await fetch(`/api/workspaces/${id}/login-images`, {
        method: "POST",
        body: fd,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error || "Erro no upload");
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

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        masterPassword: masterPassword.trim() || null,
        faviconUrl: faviconUrl || null,
        forceTheme: forceTheme || null,
        customDomain: customDomain.trim() || null,
      };
      if (tab === "login" || true) {
        // Always send login fields — form submits apply across tabs
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
        payload.loginLayout = loginLayout;
        payload.loginBgColor = loginBgColor || null;
        payload.loginPrimaryColor = loginPrimaryColor || null;
        payload.loginBgImageUrl = loginBgImageUrl || null;
        payload.loginLogoUrl = loginLogoUrl || null;
        payload.loginTitle = loginTitle.trim() || null;
        payload.loginSubtitle = loginSubtitle.trim() || null;
        if (loginLinkColor && !HEX_RE.test(loginLinkColor)) {
          setError("Cor dos links deve ser hex (#RRGGBB)");
          setSaving(false);
          return;
        }
        payload.loginBoxColor = loginBoxColor || null;
        payload.loginBoxOpacity = loginBoxOpacity;
        payload.loginSideColor = loginSideColor || null;
        payload.loginLinkColor = loginLinkColor || null;
      }
      const res = await fetch(`/api/workspaces/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error || "Erro ao salvar");
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
      <div className="max-w-3xl mx-auto">
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
          href="/admin/workspaces"
          className="inline-block mt-4 text-blue-600 dark:text-blue-400"
        >
          Voltar
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          href="/admin/workspaces"
          className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
          Editar workspace
        </h1>
        <p className="text-sm text-gray-500 font-mono mt-1">/w/{ws.slug}</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800 mb-6">
        <nav className="flex gap-6 -mb-px">
          {([
            { key: "info", label: "Informações" },
            { key: "login", label: "Personalizar Login" },
            { key: "settings", label: "Configurações" },
          ] as const).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "py-3 text-sm font-medium border-b-2 transition-colors",
                tab === t.key
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <form onSubmit={save} className="space-y-6">
        {tab === "info" && (
          <>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 sm:p-6">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Link do workspace
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Compartilhe este link com seus alunos
              </p>
              <div className="flex items-stretch gap-2">
                <input
                  type="text"
                  readOnly
                  value={workspaceUrl()}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 min-w-0 px-3 py-2 text-xs font-mono bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={copyLink}
                  className="px-3 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex-shrink-0"
                >
                  Copiar link
                </button>
              </div>
            </div>

            <div className="space-y-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 sm:p-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Logo
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                    {logoUrl ? (
                      <Image
                        src={logoUrl}
                        alt={name}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xl font-bold text-gray-700 dark:text-gray-300">
                        {name.charAt(0).toUpperCase() || "W"}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <button
                      type="button"
                      onClick={() => logoFileRef.current?.click()}
                      disabled={uploadingLogo}
                      className="px-3.5 py-2 text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg disabled:opacity-50"
                    >
                      {uploadingLogo ? "Enviando..." : "Enviar nova logo"}
                    </button>
                    <p className="text-[11px] text-gray-500 mt-1">
                      Tamanho ideal: 200x200px. PNG/JPG até 2MB.
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Nome
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={80}
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Senha master
                </label>
                <div className="flex items-stretch gap-2">
                  <input
                    type={showMasterPassword ? "text" : "password"}
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    placeholder="Deixe em branco para desativar"
                    autoComplete="new-password"
                    className="flex-1 min-w-0 px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMasterPassword((v) => !v)}
                    className="px-3 py-2.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg flex-shrink-0"
                  >
                    {showMasterPassword ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5">
                  Senha universal para acesso rápido ao workspace. Útil para testes.
                </p>
              </div>
            </div>
          </>
        )}

        {tab === "login" && (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Personalizar Login
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Configure a aparência da tela de login dos seus alunos
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                    <circle cx="12" cy="12" r="3" strokeWidth={2} />
                  </svg>
                  Pré-visualizar
                </button>
                <button
                  type="submit"
                  disabled={saving || !name.trim()}
                  className="px-3.5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg whitespace-nowrap transition"
                >
                  {saving ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>
            </div>

            {/* Layout */}
            <section className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-white/5 rounded-xl p-5">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Layout
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Escolha como o formulário aparece na tela
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3">
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
                      "group rounded-lg border-2 p-3 transition flex flex-col items-center gap-2",
                      loginLayout === opt.key
                        ? "border-blue-500 bg-blue-500/5 shadow-sm"
                        : "border-gray-200 dark:border-gray-800 hover:bg-gray-100/50 dark:hover:bg-white/5"
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
            </section>

            {/* Cores */}
            <section className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-white/5 rounded-xl p-5">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Cores
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Personalize as cores da tela de login
              </p>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ColorField
                  label="Cor dos botões"
                  description="Cor do botão 'Entrar'"
                  value={loginPrimaryColor}
                  fallback={DEFAULT_PRIMARY}
                  onChange={setLoginPrimaryColor}
                />
                <ColorField
                  label="Cor dos links"
                  description="Cor dos textos 'Esqueci senha' e 'Criar conta'"
                  value={loginLinkColor}
                  fallback={DEFAULT_LINK}
                  onChange={setLoginLinkColor}
                />
                <ColorField
                  label="Cor de fundo"
                  description="Fundo da tela quando não há imagem"
                  value={loginBgColor}
                  fallback={DEFAULT_BG}
                  onChange={setLoginBgColor}
                />
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    Cor do box
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Card em volta do formulário
                  </p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <input
                      type="color"
                      value={HEX_RE.test(loginBoxColor) ? loginBoxColor : DEFAULT_BOX}
                      onChange={(e) => setLoginBoxColor(e.target.value)}
                      className="w-8 h-8 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent cursor-pointer flex-shrink-0"
                    />
                    <input
                      type="text"
                      value={loginBoxColor}
                      onChange={(e) => setLoginBoxColor(e.target.value)}
                      placeholder={DEFAULT_BOX}
                      className="flex-1 min-w-0 px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-xs font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Opacidade</span>
                      <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
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
                      className="w-full h-1 accent-blue-600"
                    />
                  </div>
                  <div
                    className="mt-2 w-full h-8 rounded"
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
                    description="Cor ao lado da imagem nos layouts laterais"
                    value={loginSideColor}
                    fallback={DEFAULT_SIDE}
                    onChange={setLoginSideColor}
                  />
                )}
              </div>
            </section>

            {/* Imagens */}
            <section className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-white/5 rounded-xl p-5">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Imagens
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Imagem de fundo e logo para a tela de login
              </p>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            </section>

            {/* Textos */}
            <section className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-white/5 rounded-xl p-5">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Textos
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Mensagens que aparecem na tela de login
              </p>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Título de boas-vindas
                  </label>
                  <input
                    type="text"
                    value={loginTitle}
                    onChange={(e) => setLoginTitle(e.target.value)}
                    placeholder={`Bem-vindo a ${name || "..."}`}
                    maxLength={80}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Aparece acima do formulário
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Subtítulo
                  </label>
                  <input
                    type="text"
                    value={loginSubtitle}
                    onChange={(e) => setLoginSubtitle(e.target.value)}
                    placeholder="Acesse sua conta para continuar"
                    maxLength={120}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </section>

            {error && (
              <p className="text-sm text-red-500" role="alert">
                {error}
              </p>
            )}

            {/* Footer */}
            <div className="sticky bottom-0 -mx-4 sm:-mx-0 bg-white/95 dark:bg-gray-950/95 backdrop-blur border-t border-gray-200 dark:border-gray-800 px-4 sm:px-0 py-3 sm:py-4 sm:rounded-b-xl">
              <div className="flex justify-end gap-2">
                <Link
                  href="/admin/workspaces"
                  className="px-3.5 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg whitespace-nowrap"
                >
                  Cancelar
                </Link>
                <button
                  type="submit"
                  disabled={saving || !name.trim()}
                  className="px-3.5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg whitespace-nowrap"
                >
                  {saving ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === "settings" && (
          <div className="space-y-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 sm:p-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Favicon
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Ícone que aparece na aba do navegador para seus alunos.
                Recomendado: 32x32px, formato .ico ou .png
              </p>
              <div className="mt-3 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden border border-gray-200 dark:border-gray-700">
                  {faviconUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={faviconUrl}
                      alt="favicon"
                      className="w-8 h-8 object-contain"
                    />
                  ) : (
                    <span className="text-xs text-gray-400">32×32</span>
                  )}
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => faviconFileRef.current?.click()}
                    disabled={uploadingFavicon}
                    className="px-3.5 py-2 text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg disabled:opacity-50"
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
                      if (f) uploadLoginImage(f, "favicon");
                    }}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Tema para alunos
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Force um tema específico para todos os alunos deste workspace
              </p>
              <select
                value={forceTheme}
                onChange={(e) =>
                  setForceTheme(e.target.value as "" | "light" | "dark")
                }
                className="mt-2 w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Padrão do sistema (aluno escolhe)</option>
                <option value="light">Sempre claro</option>
                <option value="dark">Sempre escuro</option>
              </select>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Domínio personalizado
                </label>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                  Em breve
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Configure um domínio próprio para seu workspace (em breve)
              </p>
              <input
                type="text"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="cursos.meusite.com"
                disabled
                className="mt-2 w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-500 dark:text-gray-400 font-mono cursor-not-allowed"
              />
            </div>
          </div>
        )}

        {tab !== "login" && error && (
          <p className="text-sm text-red-500" role="alert">
            {error}
          </p>
        )}

        {tab !== "login" && (
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Link
              href="/admin/workspaces"
              className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg text-center"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
            >
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        )}
      </form>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-blue-600 text-white rounded-lg shadow-xl text-sm font-medium">
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
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: "#ff5f57" }}
                    />
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: "#ffbd2e" }}
                    />
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: "#28c840" }}
                    />
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
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
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

function ColorField({
  label,
  description,
  value,
  fallback,
  onChange,
}: {
  label: string;
  description: string;
  value: string;
  fallback: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3">
      <p className="text-sm font-semibold text-gray-900 dark:text-white">
        {label}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
        {description}
      </p>
      <div className="mt-2.5 flex items-center gap-2">
        <input
          type="color"
          value={HEX_RE.test(value) ? value : fallback}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent cursor-pointer flex-shrink-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={fallback}
          className="flex-1 min-w-0 px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-xs font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}

function ImageDropzone({
  label,
  dimensions,
  imageUrl,
  imageIsFallback,
  uploading,
  fallbackColor,
  onPick,
  onRemove,
  initial,
}: {
  label: string;
  dimensions: string;
  imageUrl: string | null;
  imageIsFallback?: boolean;
  uploading: boolean;
  fallbackColor?: string | null;
  onPick: () => void;
  onRemove?: () => void;
  initial?: string;
}) {
  const hasImage = !!imageUrl;
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          {label}
        </p>
        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded">
          {dimensions}
        </span>
      </div>
      {hasImage ? (
        <div className="relative group">
          <div
            className="w-full h-[120px] rounded-lg bg-cover bg-center border border-gray-200 dark:border-gray-700"
            style={
              imageUrl
                ? { backgroundImage: `url(${imageUrl})` }
                : fallbackColor
                  ? { backgroundColor: fallbackColor }
                  : {}
            }
          />
          {imageIsFallback && (
            <span className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 bg-black/60 text-white rounded">
              Usando logo do workspace
            </span>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition rounded-lg flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <button
              type="button"
              onClick={onPick}
              disabled={uploading}
              className="px-3 py-1.5 text-xs font-medium bg-white/90 hover:bg-white text-gray-900 rounded disabled:opacity-50"
            >
              {uploading ? "Enviando..." : "Trocar"}
            </button>
            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="px-3 py-1.5 text-xs font-medium bg-red-500/90 hover:bg-red-500 text-white rounded"
              >
                Remover
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onPick}
          disabled={uploading}
          className="w-full h-[120px] rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-500/5 transition flex flex-col items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {initial && !imageUrl ? (
            <span className="text-2xl font-bold text-gray-400">{initial}</span>
          ) : (
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          )}
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
            {uploading ? "Enviando..." : "Arraste ou clique para enviar"}
          </span>
        </button>
      )}
    </div>
  );
}

function LayoutIllustration({ kind }: { kind: LoginLayout }) {
  if (kind === "central") {
    return (
      <div className="w-full h-full rounded-md bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
        <div className="w-10 h-12 rounded bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 shadow-sm flex flex-col items-center justify-center gap-0.5 p-1">
          <div className="w-full h-1 rounded bg-gray-300 dark:bg-gray-500" />
          <div className="w-full h-1 rounded bg-gray-300 dark:bg-gray-500" />
          <div className="w-full h-1.5 rounded bg-blue-400" />
        </div>
      </div>
    );
  }
  if (kind === "lateral-left") {
    return (
      <div className="w-full h-full rounded-md border border-gray-200 dark:border-gray-700 flex overflow-hidden">
        <div className="w-1/2 bg-gray-800 dark:bg-gray-950 flex items-center justify-center">
          <div className="w-7 h-9 rounded-sm bg-white/80 flex flex-col items-center justify-center gap-0.5 p-0.5">
            <div className="w-full h-0.5 rounded bg-gray-300" />
            <div className="w-full h-0.5 rounded bg-gray-300" />
            <div className="w-full h-1 rounded bg-blue-400" />
          </div>
        </div>
        <div className="w-1/2 bg-gradient-to-br from-blue-400 to-purple-500" />
      </div>
    );
  }
  return (
    <div className="w-full h-full rounded-md border border-gray-200 dark:border-gray-700 flex overflow-hidden">
      <div className="w-1/2 bg-gradient-to-br from-blue-400 to-purple-500" />
      <div className="w-1/2 bg-gray-800 dark:bg-gray-950 flex items-center justify-center">
        <div className="w-7 h-9 rounded-sm bg-white/80 flex flex-col items-center justify-center gap-0.5 p-0.5">
          <div className="w-full h-0.5 rounded bg-gray-300" />
          <div className="w-full h-0.5 rounded bg-gray-300" />
          <div className="w-full h-1 rounded bg-blue-400" />
        </div>
      </div>
    </div>
  );
}

function PreviewIframe({
  slug,
  reloadKey,
}: {
  slug: string;
  reloadKey: number;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () =>
      setSize({ w: el.offsetWidth, h: el.offsetHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const W = 1280;
  const H = 800;
  const scale =
    size.w > 0 && size.h > 0 ? Math.min(size.w / W, size.h / H) : 0;
  return (
    <div
      ref={wrapperRef}
      className="w-full h-full overflow-hidden flex items-center justify-center"
    >
      {slug && scale > 0 && (
        <iframe
          key={reloadKey}
          src={`/w/${slug}/login?preview=true&t=${reloadKey}`}
          title="Preview"
          width={W}
          height={H}
          style={{
            width: W,
            height: H,
            transform: `scale(${scale})`,
            transformOrigin: "center center",
            border: "none",
            pointerEvents: "none",
            flexShrink: 0,
          }}
        />
      )}
    </div>
  );
}

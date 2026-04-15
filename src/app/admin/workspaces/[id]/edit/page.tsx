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

type TabKey = "info" | "login";

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

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const logoFileRef = useRef<HTMLInputElement>(null);
  const bgFileRef = useRef<HTMLInputElement>(null);
  const loginLogoFileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewVisible, setPreviewVisible] = useState(true);

  useEffect(() => {
    if (tab !== "login") return;
    const el = previewRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setPreviewVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [tab]);

  function scrollToPreview() {
    previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

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
    kind: "bgImage" | "loginLogo"
  ) {
    const setter = kind === "bgImage" ? setUploadingBg : setUploadingLoginLogo;
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
      else setLoginLogoUrl(body.url);
      showToast(kind === "bgImage" ? "Imagem de fundo atualizada" : "Logo do login atualizada");
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

  const previewLogo = loginLogoUrl || logoUrl;
  const previewTitle = loginTitle || `Bem-vindo a ${name}`;
  const previewSubtitle = loginSubtitle || "Acesse sua conta para continuar";

  return (
    <div
      className={cn(
        "mx-auto",
        tab === "login" ? "max-w-6xl" : "max-w-3xl"
      )}
    >
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
          <div className="grid gap-6 lg:grid-cols-[40fr_60fr] items-start">
            {/* LEFT COLUMN — compact form */}
            <div className="order-2 lg:order-none lg:min-w-[380px] flex flex-col gap-3">
              {/* Layout */}
              <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                  Layout
                </p>
                <div className="flex gap-2">
                  {(
                    [
                      { key: "central", label: "Central" },
                      { key: "lateral-left", label: "Esq." },
                      { key: "lateral-right", label: "Dir." },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setLoginLayout(opt.key)}
                      className={cn(
                        "rounded-md border-2 p-1.5 transition w-20 flex flex-col items-center gap-1",
                        loginLayout === opt.key
                          ? "border-blue-500 bg-blue-500/5"
                          : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                      )}
                    >
                      <div className="w-full h-[38px] rounded-sm overflow-hidden">
                        <LayoutMini kind={opt.key} />
                      </div>
                      <span className="text-[11px] font-medium text-gray-900 dark:text-white">
                        {opt.label}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Cores */}
              <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Cores
                </p>
                <div className="space-y-2">
                  <CompactColor
                    label="Botões"
                    value={loginPrimaryColor}
                    fallback={DEFAULT_PRIMARY}
                    onChange={setLoginPrimaryColor}
                  />
                  <CompactColor
                    label="Links"
                    value={loginLinkColor}
                    fallback={DEFAULT_LINK}
                    onChange={setLoginLinkColor}
                  />
                  <CompactColor
                    label="Fundo"
                    value={loginBgColor}
                    fallback={DEFAULT_BG}
                    onChange={setLoginBgColor}
                  />
                  <CompactColor
                    label="Box"
                    value={loginBoxColor}
                    fallback={DEFAULT_BOX}
                    onChange={setLoginBoxColor}
                  />
                  {(loginLayout === "lateral-left" ||
                    loginLayout === "lateral-right") && (
                    <CompactColor
                      label="Lateral"
                      value={loginSideColor}
                      fallback={DEFAULT_SIDE}
                      onChange={setLoginSideColor}
                    />
                  )}
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      Opacidade do box
                    </span>
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
                    onChange={(e) =>
                      setLoginBoxOpacity(Number(e.target.value) / 100)
                    }
                    className="w-full h-1 accent-blue-600"
                  />
                  <div
                    className="mt-1.5 h-6 rounded"
                    style={{
                      backgroundColor: hexToRgba(
                        HEX_RE.test(loginBoxColor) ? loginBoxColor : DEFAULT_BOX,
                        loginBoxOpacity
                      ),
                      backgroundImage:
                        "linear-gradient(45deg, rgba(127,127,127,0.15) 25%, transparent 25%, transparent 75%, rgba(127,127,127,0.15) 75%), linear-gradient(45deg, rgba(127,127,127,0.15) 25%, transparent 25%, transparent 75%, rgba(127,127,127,0.15) 75%)",
                      backgroundSize: "10px 10px",
                      backgroundPosition: "0 0, 5px 5px",
                    }}
                  />
                </div>
              </section>

              {/* Imagens */}
              <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Imagens
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">Fundo</p>
                    <div
                      className="w-full h-20 rounded-md bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 bg-cover bg-center mb-2"
                      style={
                        loginBgImageUrl
                          ? { backgroundImage: `url(${loginBgImageUrl})` }
                          : HEX_RE.test(loginBgColor)
                            ? { backgroundColor: loginBgColor }
                            : {}
                      }
                    />
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => bgFileRef.current?.click()}
                        disabled={uploadingBg}
                        className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded disabled:opacity-50"
                      >
                        {uploadingBg ? "Enviando..." : "Enviar"}
                      </button>
                      {loginBgImageUrl && (
                        <button
                          type="button"
                          onClick={() => setLoginBgImageUrl(null)}
                          className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded"
                        >
                          Remover
                        </button>
                      )}
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
                    <p className="text-[10px] text-gray-500 mt-1.5">1920×1080</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">Logo</p>
                    <div className="w-20 h-20 rounded-md bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden mb-2">
                      {loginLogoUrl ? (
                        <Image
                          src={loginLogoUrl}
                          alt=""
                          width={80}
                          height={80}
                          className="w-full h-full object-cover"
                        />
                      ) : logoUrl ? (
                        <Image
                          src={logoUrl}
                          alt=""
                          width={80}
                          height={80}
                          className="w-full h-full object-cover opacity-70"
                        />
                      ) : (
                        <span className="text-2xl font-bold text-gray-400">
                          {name.charAt(0).toUpperCase() || "W"}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => loginLogoFileRef.current?.click()}
                        disabled={uploadingLoginLogo}
                        className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded disabled:opacity-50"
                      >
                        {uploadingLoginLogo ? "Enviando..." : "Enviar"}
                      </button>
                      {loginLogoUrl && (
                        <button
                          type="button"
                          onClick={() => setLoginLogoUrl(null)}
                          className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded"
                        >
                          Remover
                        </button>
                      )}
                    </div>
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
                    <p className="text-[10px] text-gray-500 mt-1.5">200×200</p>
                  </div>
                </div>
              </section>

              {/* Textos */}
              <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Textos
                </p>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Título
                    </label>
                    <input
                      type="text"
                      value={loginTitle}
                      onChange={(e) => setLoginTitle(e.target.value)}
                      placeholder="Bem-vindo"
                      maxLength={80}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Subtítulo
                    </label>
                    <input
                      type="text"
                      value={loginSubtitle}
                      onChange={(e) => setLoginSubtitle(e.target.value)}
                      placeholder="Acesse sua conta"
                      maxLength={120}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </section>

              {error && (
                <p className="text-sm text-red-500" role="alert">
                  {error}
                </p>
              )}

              <div className="flex flex-row justify-end items-center gap-2 pt-1 whitespace-nowrap">
                <Link
                  href="/admin/workspaces"
                  className="px-3 py-2 text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md whitespace-nowrap"
                >
                  Cancelar
                </Link>
                <button
                  type="submit"
                  disabled={saving || !name.trim()}
                  className="px-3 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md whitespace-nowrap"
                >
                  {saving ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>
            </div>

            {/* RIGHT COLUMN — sticky preview */}
            <aside
              ref={previewRef}
              className="order-1 lg:order-none lg:sticky lg:top-20 self-start w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-3 shadow-sm"
            >
              <p className="text-xs font-semibold text-gray-900 dark:text-white mb-2">
                Pré-visualização
              </p>
              <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
                <div className="h-8 px-3 bg-gray-200 dark:bg-gray-800 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                    <div className="w-2 h-2 rounded-full bg-yellow-400" />
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 mx-2 h-5 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center px-3 overflow-hidden">
                    <span className="text-xs text-gray-500 truncate">
                      applyfy-mvp.vercel.app/w/{ws?.slug || ""}/login
                    </span>
                  </div>
                </div>
                <LoginPreview
                  layout={loginLayout}
                  bgColor={
                    HEX_RE.test(loginBgColor) ? loginBgColor : DEFAULT_BG
                  }
                  primaryColor={
                    HEX_RE.test(loginPrimaryColor)
                      ? loginPrimaryColor
                      : DEFAULT_PRIMARY
                  }
                  boxColor={
                    HEX_RE.test(loginBoxColor) ? loginBoxColor : DEFAULT_BOX
                  }
                  boxOpacity={loginBoxOpacity}
                  sideColor={
                    HEX_RE.test(loginSideColor) ? loginSideColor : DEFAULT_SIDE
                  }
                  linkColor={
                    HEX_RE.test(loginLinkColor) ? loginLinkColor : DEFAULT_LINK
                  }
                  bgImageUrl={loginBgImageUrl}
                  logoUrl={previewLogo}
                  logoFallback={name.charAt(0).toUpperCase() || "W"}
                  title={previewTitle}
                  subtitle={previewSubtitle}
                />
              </div>
              <p className="text-[11px] text-gray-500 mt-2 text-center">
                Atualiza automaticamente conforme você edita
              </p>
            </aside>
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

      {tab === "login" && !previewVisible && (
        <button
          type="button"
          onClick={scrollToPreview}
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium shadow-xl transition"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"
            />
            <circle cx="12" cy="12" r="3" strokeWidth={2} />
          </svg>
          Ver preview
        </button>
      )}
    </div>
  );
}

function CompactColor({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string;
  value: string;
  fallback: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-gray-600 dark:text-gray-400 w-20 flex-shrink-0">
        {label}
      </label>
      <input
        type="color"
        value={HEX_RE.test(value) ? value : fallback}
        onChange={(e) => onChange(e.target.value)}
        className="w-7 h-7 rounded border border-gray-300 dark:border-gray-700 bg-transparent cursor-pointer flex-shrink-0"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={fallback}
        className="flex-1 min-w-[100px] px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-xs font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function LayoutMini({ kind }: { kind: LoginLayout }) {
  if (kind === "central") {
    return (
      <div className="w-full h-full rounded-sm bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
        <div className="w-5 h-5 rounded-sm bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500" />
      </div>
    );
  }
  if (kind === "lateral-left") {
    return (
      <div className="w-full h-full rounded-sm border border-gray-200 dark:border-gray-700 flex overflow-hidden">
        <div className="w-1/2 bg-white dark:bg-gray-600 border-r border-gray-300 dark:border-gray-500" />
        <div className="w-1/2 bg-gray-200 dark:bg-gray-800" />
      </div>
    );
  }
  return (
    <div className="w-full h-full rounded-sm border border-gray-200 dark:border-gray-700 flex overflow-hidden">
      <div className="w-1/2 bg-gray-200 dark:bg-gray-800" />
      <div className="w-1/2 bg-white dark:bg-gray-600 border-l border-gray-300 dark:border-gray-500" />
    </div>
  );
}

function LoginPreview({
  layout,
  bgColor,
  primaryColor,
  boxColor,
  boxOpacity,
  sideColor,
  linkColor,
  bgImageUrl,
  logoUrl,
  logoFallback,
  title,
  subtitle,
}: {
  layout: LoginLayout;
  bgColor: string;
  primaryColor: string;
  boxColor: string;
  boxOpacity: number;
  sideColor: string;
  linkColor: string;
  bgImageUrl: string | null;
  logoUrl: string | null;
  logoFallback: string;
  title: string;
  subtitle: string;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.7);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => {
      const w = el.offsetWidth;
      if (w > 0) setScale(w / 900);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const bgStyle: React.CSSProperties = bgImageUrl
    ? {
        backgroundImage: `url(${bgImageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : { backgroundColor: bgColor };

  const boxBg = hexToRgba(boxColor, boxOpacity);

  const form = (
    <div
      className="backdrop-blur-xl rounded-2xl p-7 w-[400px] shadow-2xl border border-white/10"
      style={{ backgroundColor: boxBg }}
    >
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center overflow-hidden mb-3 border border-white/10">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-2xl font-bold text-white">
              {logoFallback}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-white leading-tight break-words">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-white/70 mt-1.5 break-words">
            {subtitle}
          </p>
        )}
      </div>
      <div className="space-y-4">
        <div>
          <div className="block text-sm font-medium text-white/80 mb-1">
            Email
          </div>
          <div className="w-full h-[46px] bg-white/10 border border-white/15 rounded-lg" />
        </div>
        <div>
          <div className="block text-sm font-medium text-white/80 mb-1">
            Senha
          </div>
          <div className="w-full h-[46px] bg-white/10 border border-white/15 rounded-lg" />
        </div>
        <div
          className="w-full h-[46px] rounded-lg flex items-center justify-center text-white font-medium shadow-lg"
          style={{ backgroundColor: primaryColor }}
        >
          Entrar
        </div>
        <div className="flex items-center justify-between text-sm pt-1">
          <span className="underline" style={{ color: linkColor }}>
            Esqueci minha senha
          </span>
          <span className="underline" style={{ color: linkColor }}>
            Criar conta
          </span>
        </div>
      </div>
    </div>
  );

  let scene: React.ReactNode;
  if (layout === "central") {
    scene = (
      <div
        className="w-[900px] h-[560px] flex items-center justify-center relative"
        style={bgStyle}
      >
        {bgImageUrl && (
          <div className="absolute inset-0 bg-black/55" aria-hidden />
        )}
        <div className="relative">{form}</div>
      </div>
    );
  } else {
    const formPane = (
      <div
        className="w-[450px] h-full flex items-center justify-center relative"
        style={{ backgroundColor: sideColor }}
      >
        {form}
      </div>
    );
    const imagePane = (
      <div className="w-[450px] h-full relative" style={bgStyle}>
        {bgImageUrl && (
          <div className="absolute inset-0 bg-black/30" aria-hidden />
        )}
      </div>
    );
    scene = (
      <div className="w-[900px] h-[560px] flex">
        {layout === "lateral-left" ? (
          <>
            {formPane}
            {imagePane}
          </>
        ) : (
          <>
            {imagePane}
            {formPane}
          </>
        )}
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className="w-full overflow-hidden bg-gray-100 dark:bg-gray-950"
      style={{ height: 560 * scale }}
    >
      <div
        style={{
          width: 900,
          height: 560,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {scene}
      </div>
    </div>
  );
}

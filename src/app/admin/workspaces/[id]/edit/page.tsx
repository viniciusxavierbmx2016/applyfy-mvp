"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

interface Workspace {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  loginBgColor: string | null;
  isActive: boolean;
}

export default function EditWorkspacePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [ws, setWs] = useState<Workspace | null>(null);
  const [name, setName] = useState("");
  const [loginBgColor, setLoginBgColor] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/workspaces")
      .then((r) => (r.ok ? r.json() : { workspaces: [] }))
      .then((d) => {
        const found = (d.workspaces || []).find((w: Workspace) => w.id === id);
        if (found) {
          setWs(found);
          setName(found.name);
          setLoginBgColor(found.loginBgColor || "");
          setLogoUrl(found.logoUrl || null);
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
    setUploading(true);
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
      setUploading(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspaces/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          loginBgColor: loginBgColor.trim() || null,
        }),
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
      <div className="max-w-xl mx-auto">
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
    <div className="max-w-xl mx-auto">
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

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 sm:p-6 mb-4">
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

      <form
        onSubmit={save}
        className="space-y-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 sm:p-6"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Logo
          </label>
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden"
              style={loginBgColor ? { backgroundColor: loginBgColor } : {}}
            >
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-gray-700 dark:text-gray-300">
                  {name.charAt(0).toUpperCase() || "W"}
                </span>
              )}
            </div>
            <div className="flex-1">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="px-3.5 py-2 text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg disabled:opacity-50"
              >
                {uploading ? "Enviando..." : "Enviar nova logo"}
              </button>
              <p className="text-[11px] text-gray-500 mt-1">Tamanho ideal: 200x200px. PNG/JPG até 2MB.</p>
              <input
                ref={fileRef}
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
            Cor de fundo da tela de login
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={loginBgColor || "#0b0f19"}
              onChange={(e) => setLoginBgColor(e.target.value)}
              className="w-12 h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent cursor-pointer"
            />
            <input
              type="text"
              value={loginBgColor}
              onChange={(e) => setLoginBgColor(e.target.value)}
              placeholder="#0b0f19"
              className="flex-1 px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {loginBgColor && (
              <button
                type="button"
                onClick={() => setLoginBgColor("")}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
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
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-blue-600 text-white rounded-lg shadow-xl text-sm font-medium">
          {toast}
        </div>
      )}
    </div>
  );
}

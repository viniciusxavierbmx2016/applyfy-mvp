"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";

interface Settings {
  logoUrl: string | null;
  faviconUrl: string | null;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/platform-settings")
      .then((r) => r.json())
      .then((data) => setSettings(data.settings))
      .catch(() => setMessage({ type: "error", text: "Erro ao carregar configurações" }))
      .finally(() => setLoading(false));
  }, []);

  async function uploadFile(field: "logo" | "favicon") {
    const input = field === "logo" ? logoRef.current : faviconRef.current;
    const file = input?.files?.[0];
    if (!file) return;

    const setter = field === "logo" ? setUploadingLogo : setUploadingFavicon;
    setter(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("field", field);

      const res = await fetch("/api/admin/platform-settings/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const key = field === "logo" ? "logoUrl" : "faviconUrl";
      setSettings((prev) => (prev ? { ...prev, [key]: data.url } : prev));

      const saveRes = await fetch("/api/admin/platform-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: data.url }),
      });
      if (!saveRes.ok) throw new Error("Erro ao salvar");

      setMessage({ type: "success", text: `${field === "logo" ? "Logo" : "Favicon"} atualizado com sucesso` });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Erro no upload" });
    } finally {
      setter(false);
      if (input) input.value = "";
    }
  }

  async function removeImage(field: "logo" | "favicon") {
    setSaving(true);
    setMessage(null);
    const key = field === "logo" ? "logoUrl" : "faviconUrl";
    try {
      const res = await fetch("/api/admin/platform-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: null }),
      });
      if (!res.ok) throw new Error("Erro ao remover");
      setSettings((prev) => (prev ? { ...prev, [key]: null } : prev));
      setMessage({ type: "success", text: `${field === "logo" ? "Logo" : "Favicon"} removido` });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Erro" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Configurações da Plataforma
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Logo e favicon exibidos em toda a plataforma
        </p>
      </div>

      {message && (
        <div
          className={`px-4 py-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
              : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Logo da Plataforma
          </label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 dark:border-white/[0.08] flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-white/[0.04]">
              {settings?.logoUrl ? (
                <Image src={settings.logoUrl} alt="Logo" width={80} height={80} className="w-full h-full object-contain" />
              ) : (
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={logoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={() => uploadFile("logo")}
              />
              <button
                onClick={() => logoRef.current?.click()}
                disabled={uploadingLogo}
                className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
              >
                {uploadingLogo ? "Enviando..." : "Enviar logo"}
              </button>
              {settings?.logoUrl && (
                <button
                  onClick={() => removeImage("logo")}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                >
                  Remover
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Recomendado: PNG ou SVG, máximo 2MB
          </p>
        </div>

        <hr className="border-gray-200 dark:border-white/[0.06]" />

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Favicon
          </label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 dark:border-white/[0.08] flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-white/[0.04]">
              {settings?.faviconUrl ? (
                <Image src={settings.faviconUrl} alt="Favicon" width={64} height={64} className="w-full h-full object-contain" />
              ) : (
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={faviconRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={() => uploadFile("favicon")}
              />
              <button
                onClick={() => faviconRef.current?.click()}
                disabled={uploadingFavicon}
                className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
              >
                {uploadingFavicon ? "Enviando..." : "Enviar favicon"}
              </button>
              {settings?.faviconUrl && (
                <button
                  onClick={() => removeImage("favicon")}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                >
                  Remover
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Recomendado: ICO ou PNG 32x32, máximo 2MB
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Avatar } from "@/components/ui/avatar";
import { useUserStore } from "@/stores/user-store";

const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;

export function AvatarUploader() {
  const { user, setUser } = useUserStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  function pick() {
    inputRef.current?.click();
  }

  function onSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;

    if (!ALLOWED.includes(f.type)) {
      setError("Use JPG, PNG ou WebP.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setError("Arquivo muito grande (máx. 2MB).");
      return;
    }

    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function cancel() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setFile(null);
    setError("");
  }

  async function save() {
    if (!file) return;
    setSaving(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erro ao enviar avatar");
        return;
      }
      setUser(data.user);
      cancel();
    } catch {
      setError("Erro de conexão");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={pick}
        className="relative group rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Alterar avatar"
      >
        {preview ? (
          <Image
            src={preview}
            alt="Prévia"
            width={56}
            height={56}
            className="h-14 w-14 rounded-full object-cover"
          />
        ) : (
          <Avatar src={user.avatarUrl} name={user.name} size="lg" />
        )}
        <span className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onSelect}
        className="hidden"
      />

      <div className="flex-1 min-w-0">
        {preview ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
            >
              {saving ? "Enviando..." : "Salvar foto"}
            </button>
            <button
              type="button"
              onClick={cancel}
              disabled={saving}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium rounded-lg transition"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <div>
            <button
              type="button"
              onClick={pick}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Alterar foto
            </button>
            <p className="text-xs text-gray-500 mt-0.5">
              JPG, PNG ou WebP · máx. 2MB
            </p>
          </div>
        )}
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      </div>
    </div>
  );
}

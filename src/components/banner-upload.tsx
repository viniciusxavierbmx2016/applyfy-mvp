"use client";

import { useState } from "react";
import Image from "next/image";

interface BannerUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  uploadPath?: string;
}

export function BannerUpload({ value, onChange, uploadPath }: BannerUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (uploadPath) formData.append("path", uploadPath);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erro ao fazer upload");
        return;
      }
      onChange(data.url);
    } catch {
      setError("Erro ao fazer upload");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Banner do curso
      </label>
      {value ? (
        <div className="relative w-full bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700" style={{ aspectRatio: "1125/350" }}>
          <Image src={value} alt="Banner" fill className="object-cover" sizes="100vw" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-red-500/80 rounded-full text-white transition"
            aria-label="Remover banner"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <label
          className="relative block w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-750 border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-gray-500 dark:hover:border-gray-600 rounded-lg cursor-pointer transition"
          style={{ aspectRatio: "1125/350" }}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
            className="sr-only"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 px-4 text-center">
            {uploading ? (
              <>
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
                <span className="text-sm">Enviando...</span>
              </>
            ) : (
              <>
                <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium">Clique para enviar o banner</span>
              </>
            )}
          </div>
        </label>
      )}
      <p className="text-xs text-gray-500 mt-2">
        Tamanho ideal: 1125x350px. PNG, JPG ou WebP, máx. 5MB.
      </p>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}

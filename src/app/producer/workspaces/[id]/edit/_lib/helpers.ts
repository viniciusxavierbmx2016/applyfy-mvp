import type { ImagePosition } from "../_types";

export async function compressImage(file: File, maxSizeMB: number = 4, maxWidth: number = 1920): Promise<File> {
  if (file.size <= maxSizeMB * 1024 * 1024) return file;

  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas não suportado"));
      ctx.drawImage(img, 0, 0, width, height);

      let quality = 0.85;
      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("Falha na compressão"));
            if (blob.size > maxSizeMB * 1024 * 1024 && quality > 0.3) {
              quality -= 0.1;
              tryCompress();
            } else {
              resolve(new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }));
            }
          },
          "image/jpeg",
          quality
        );
      };
      tryCompress();
    };
    img.onerror = () => reject(new Error("Erro ao carregar imagem"));
    img.src = URL.createObjectURL(file);
  });
}

export const DEFAULT_BG = "#0f172a";
export const DEFAULT_PRIMARY = "#3b82f6";
export const DEFAULT_BOX = "#1e293b";
export const DEFAULT_BOX_OPACITY = 0.8;
export const DEFAULT_SIDE = "#0f172a";
export const DEFAULT_LINK = "#3b82f6";
export const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export const inputClass =
  "w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors text-sm";

export const labelClass = "block text-xs text-gray-500 dark:text-gray-400 mb-1.5";

export function hexToRgba(hex: string, alpha: number): string {
  if (!HEX_RE.test(hex)) return `rgba(30, 41, 59, ${alpha})`;
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function parsePosition(json: string | null | undefined): ImagePosition {
  if (!json) return { x: 50, y: 50 };
  try { const p = JSON.parse(json); return { x: p.x ?? 50, y: p.y ?? 50 }; } catch { return { x: 50, y: 50 }; }
}

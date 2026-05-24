export const PLATFORMS = [
  { value: "YOUTUBE_LIVE", label: "YouTube Live" },
  { value: "GOOGLE_MEET", label: "Google Meet" },
  { value: "ZOOM", label: "Zoom" },
  { value: "CUSTOM", label: "Outro link" },
];

export const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Agendada",
  LIVE: "Ao Vivo",
  ENDED: "Encerrada",
};

export const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-yellow-500/20 text-yellow-400",
  LIVE: "bg-red-500/20 text-red-400 animate-pulse",
  ENDED: "bg-gray-500/20 text-gray-400",
};

export const inputCls =
  "w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2.5 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors text-sm";

export const labelCls = "block text-xs text-gray-400 mb-1.5";

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function extractYouTubeEmbedUrl(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/)([a-zA-Z0-9_-]+)/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
  }
  return null;
}

export function toLocalDatetimeValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

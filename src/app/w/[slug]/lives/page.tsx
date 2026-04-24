"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface LiveItem {
  id: string;
  title: string;
  description: string | null;
  platform: string;
  status: string;
  scheduledAt: string;
  startedAt: string | null;
  endedAt: string | null;
  recordingUrl: string | null;
  thumbnailUrl: string | null;
  course: { id: string; title: string } | null;
}

const PLATFORM_LABELS: Record<string, string> = {
  YOUTUBE_LIVE: "YouTube Live",
  ZOOM: "Zoom",
  GOOGLE_MEET: "Google Meet",
  CUSTOM: "Outro",
};

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Agendada",
  LIVE: "Ao Vivo",
  ENDED: "Encerrada",
};

function formatDateFull(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getCountdown(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "em breve";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `em ${days}d ${hours}h`;
  if (hours > 0) return `em ${hours}h ${mins}min`;
  return `em ${mins}min`;
}

export default function WorkspaceLivesPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [lives, setLives] = useState<LiveItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/w/${slug}/lives`)
      .then((r) => (r.ok ? r.json() : { lives: [] }))
      .then((d) => setLives(d.lives || []))
      .finally(() => setLoading(false));
  }, [slug]);

  const liveLives = lives.filter((l) => l.status === "LIVE");
  const scheduled = lives.filter((l) => l.status === "SCHEDULED");
  const ended = lives.filter((l) => l.status === "ENDED");
  const sorted = [...liveLives, ...scheduled, ...ended];

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
        Lives
      </h2>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
        Transmissões ao vivo e gravações
      </p>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16">
          <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400">Nenhuma live disponível no momento</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {sorted.map((live) => (
            <Link
              key={live.id}
              href={`/w/${slug}/lives/${live.id}`}
              className="block bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-4 hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-all duration-300 lg:hover:scale-[1.02] lg:hover:shadow-xl lg:hover:shadow-black/20 lg:hover:border-gray-300 dark:lg:hover:border-white/20"
            >
              <div className="flex items-start gap-4">
                {live.thumbnailUrl && (
                  <div className="w-28 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-black/30">
                    <img src={live.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {live.status === "LIVE" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                        Ao Vivo
                      </span>
                    ) : live.status === "SCHEDULED" ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400">
                        {STATUS_LABELS.SCHEDULED}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400">
                        {STATUS_LABELS.ENDED}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {PLATFORM_LABELS[live.platform] || live.platform}
                    </span>
                  </div>

                  <h3 className="text-gray-900 dark:text-white font-medium truncate">
                    {live.title}
                  </h3>

                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {live.status === "SCHEDULED" && (
                      <span>{getCountdown(live.scheduledAt)} - {formatDateFull(live.scheduledAt)}</span>
                    )}
                    {live.status === "LIVE" && live.startedAt && (
                      <span>Iniciou {formatDateFull(live.startedAt)}</span>
                    )}
                    {live.status === "ENDED" && (
                      <>
                        <span>Encerrou {formatDateFull(live.endedAt || live.scheduledAt)}</span>
                        {live.recordingUrl && (
                          <span className="text-blue-500 dark:text-blue-400 font-medium">Gravação disponível</span>
                        )}
                      </>
                    )}
                    {live.course && (
                      <span className="text-blue-500 dark:text-blue-400">{live.course.title}</span>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0 text-gray-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

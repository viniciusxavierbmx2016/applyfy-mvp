"use client";

import { useEffect, useRef, useState, useCallback, useId } from "react";
import type { ParsedVideo } from "@/lib/video";

interface Props {
  video: ParsedVideo;
  onEnded?: () => void;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

declare global {
  interface Window {
    YT?: {
      Player: new (
        elOrId: string | HTMLElement,
        opts: YTPlayerOptions
      ) => YTPlayer;
      PlayerState: { ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
    Vimeo?: {
      Player: new (el: HTMLElement | HTMLIFrameElement) => VimeoPlayer;
    };
  }
}

interface YTPlayerOptions {
  videoId?: string;
  host?: string;
  width?: string | number;
  height?: string | number;
  playerVars?: Record<string, string | number>;
  events?: {
    onReady?: (e: { target: YTPlayer }) => void;
    onStateChange?: (e: { data: number; target: YTPlayer }) => void;
    onError?: (e: { data: number }) => void;
  };
}

interface YTPlayer {
  setPlaybackRate: (r: number) => void;
  getIframe: () => HTMLIFrameElement;
  destroy?: () => void;
}

interface VimeoPlayer {
  setPlaybackRate: (r: number) => Promise<number>;
  on: (evt: string, cb: () => void) => void;
  destroy?: () => Promise<void>;
}

// Singleton loaders
let ytScriptPromise: Promise<void> | null = null;
function loadYouTubeAPI(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject();
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (ytScriptPromise) return ytScriptPromise;

  ytScriptPromise = new Promise<void>((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    document.head.appendChild(script);
  });
  return ytScriptPromise;
}

let vimeoScriptPromise: Promise<void> | null = null;
function loadVimeoAPI(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject();
  if (window.Vimeo && window.Vimeo.Player) return Promise.resolve();
  if (vimeoScriptPromise) return vimeoScriptPromise;

  vimeoScriptPromise = new Promise<void>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://player.vimeo.com/api/player.js";
    script.async = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
  return vimeoScriptPromise;
}

export function VideoPlayer({ video, onEnded }: Props) {
  const reactId = useId();
  const playerElId = `player-${reactId.replace(/:/g, "")}`;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const ytPlayerRef = useRef<YTPlayer | null>(null);
  const vimeoPlayerRef = useRef<VimeoPlayer | null>(null);
  const [speed, setSpeed] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);

  // Keep onEnded callback stable across renders without triggering player rebuild
  const onEndedRef = useRef(onEnded);
  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  // Mount the appropriate player whenever the video changes
  useEffect(() => {
    if (!video.videoId) return;
    const mountEl = document.getElementById(playerElId);
    if (!mountEl) return;

    let cancelled = false;
    setPlayerError(null);

    if (video.provider === "youtube") {
      loadYouTubeAPI().then(() => {
        if (cancelled || !window.YT) return;
        const origin =
          typeof window !== "undefined" ? window.location.origin : undefined;

        try {
          const player = new window.YT.Player(playerElId, {
            videoId: video.videoId!,
            host: "https://www.youtube-nocookie.com",
            width: "100%",
            height: "100%",
            playerVars: {
              enablejsapi: 1,
              modestbranding: 1,
              rel: 0,
              playsinline: 1,
              ...(origin ? { origin } : {}),
            },
            events: {
              onStateChange: (e) => {
                if (e.data === window.YT!.PlayerState.ENDED) {
                  onEndedRef.current?.();
                }
              },
              onError: (e) => {
                // YouTube error codes: 2 invalid param, 5 HTML5 error,
                // 100 not found, 101/150 embedding disallowed
                const msg =
                  e.data === 101 || e.data === 150
                    ? "Este vídeo não permite ser incorporado."
                    : e.data === 100
                      ? "Vídeo não encontrado ou privado."
                      : e.data === 2
                        ? "ID do vídeo inválido."
                        : `Erro do player (código ${e.data}).`;
                setPlayerError(msg);
              },
            },
          });
          ytPlayerRef.current = player;
        } catch (err) {
          console.error("YT.Player init failed:", err);
          setPlayerError("Falha ao iniciar o player do YouTube.");
        }
      });
    } else if (video.provider === "vimeo") {
      loadVimeoAPI().then(() => {
        if (cancelled || !window.Vimeo) return;
        // Vimeo API reads data-* attributes on the mount element
        mountEl.setAttribute("data-vimeo-id", video.videoId!);
        mountEl.setAttribute("data-vimeo-dnt", "true");
        mountEl.setAttribute("data-vimeo-title", "0");
        mountEl.setAttribute("data-vimeo-byline", "0");
        mountEl.setAttribute("data-vimeo-portrait", "0");
        mountEl.setAttribute("data-vimeo-responsive", "true");
        const player = new window.Vimeo.Player(mountEl);
        player.on("ended", () => onEndedRef.current?.());
        vimeoPlayerRef.current = player;
      });
    }

    return () => {
      cancelled = true;
      if (ytPlayerRef.current?.destroy) {
        try {
          ytPlayerRef.current.destroy();
        } catch {}
      }
      if (vimeoPlayerRef.current?.destroy) {
        vimeoPlayerRef.current.destroy().catch(() => {});
      }
      ytPlayerRef.current = null;
      vimeoPlayerRef.current = null;
      // Clear the mount node so a new player can be built
      if (mountEl) mountEl.innerHTML = "";
    };
  }, [video.provider, video.videoId, playerElId]);

  const changeSpeed = useCallback((rate: number) => {
    setSpeed(rate);
    setMenuOpen(false);
    if (ytPlayerRef.current) {
      try {
        ytPlayerRef.current.setPlaybackRate(rate);
      } catch {}
    }
    if (vimeoPlayerRef.current) {
      vimeoPlayerRef.current.setPlaybackRate(rate).catch(() => {});
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      el.requestFullscreen().catch(() => {});
    }
  }, []);

  if (!video.videoId) {
    return (
      <div className="aspect-video w-full bg-gray-900 rounded-xl flex items-center justify-center border border-gray-800">
        <p className="text-gray-500 text-sm">Vídeo indisponível</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black rounded-xl overflow-hidden group"
    >
      <div className="aspect-video w-full relative">
        {/* YouTube/Vimeo API replaces this element with the iframe */}
        <div id={playerElId} className="absolute inset-0 w-full h-full" />
        {playerError && (
          <div className="absolute inset-0 bg-gray-950/90 flex items-center justify-center p-6 text-center">
            <p className="text-sm text-red-400">{playerError}</p>
          </div>
        )}
      </div>

      {/* Custom controls overlay */}
      <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="px-2.5 py-1.5 text-xs font-medium bg-black/70 hover:bg-black/90 text-white rounded-md backdrop-blur"
          >
            {speed}x
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-1 bg-gray-900 border border-gray-800 rounded-md shadow-lg overflow-hidden">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => changeSpeed(s)}
                  className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-800 ${
                    s === speed ? "text-blue-400" : "text-white"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={toggleFullscreen}
          className="p-1.5 bg-black/70 hover:bg-black/90 text-white rounded-md backdrop-blur"
          aria-label="Tela cheia"
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
              d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

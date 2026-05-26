"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// Minimum surface of YT.Player the custom controls drive. The video-player
// (Etapa 4) widens its own YTPlayer interface to match this shape.
export interface YTPlayerLike {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  getVideoLoadedFraction: () => number;
  setVolume: (volume: number) => void;
  getVolume: () => number;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
}

// YouTube PlayerState (https://developers.google.com/youtube/iframe_api_reference#Playback_status)
const YT_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const;

interface Props {
  player: YTPlayerLike | null;
  onEnded?: () => void;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function YouTubeCustomControls({ player, onEnded }: Props) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(100);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [seeking, setSeeking] = useState(false);
  const [showPulse, setShowPulse] = useState(false);

  const scrubRef = useRef<HTMLDivElement | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endedFiredRef = useRef(false);

  // Stable onEnded reference (avoid re-subscribing the polling effect)
  const onEndedRef = useRef(onEnded);
  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  // Polling: refresh state/time/buffer every 250ms. Pauses when tab is hidden
  // to spare battery on mobile (visibilitychange listener).
  useEffect(() => {
    if (!player) return;
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    function tick() {
      if (!player || cancelled) return;
      try {
        const state = player.getPlayerState();
        setPlaying(state === YT_STATE.PLAYING);
        if (!seeking) {
          setCurrentTime(player.getCurrentTime());
        }
        const dur = player.getDuration();
        if (dur > 0) setDuration(dur);
        setBuffered(player.getVideoLoadedFraction());

        if (state === YT_STATE.ENDED && !endedFiredRef.current) {
          endedFiredRef.current = true;
          onEndedRef.current?.();
        }
        if (state !== YT_STATE.ENDED) {
          endedFiredRef.current = false;
        }
      } catch {
        // Player may not be ready or already destroyed — ignore.
      }
    }

    function start() {
      if (interval !== null) return;
      tick();
      interval = setInterval(tick, 250);
    }
    function stop() {
      if (interval !== null) {
        clearInterval(interval);
        interval = null;
      }
    }
    function onVis() {
      if (document.hidden) stop();
      else start();
    }
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [player, seeking]);

  // Volume / mute snapshot once the player is available.
  useEffect(() => {
    if (!player) return;
    try {
      setVolume(player.getVolume());
      setMuted(player.isMuted());
    } catch {}
  }, [player]);

  // Auto-hide controls 3s after the last interaction, but only while playing.
  // Paused state always keeps controls visible.
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  useEffect(() => {
    if (!playing) {
      setShowControls(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      return;
    }
    resetHideTimer();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [playing, resetHideTimer]);

  function togglePlay() {
    if (!player) return;
    try {
      const state = player.getPlayerState();
      if (state === YT_STATE.PLAYING) player.pauseVideo();
      else player.playVideo();
    } catch {}
    setShowPulse(true);
    setTimeout(() => setShowPulse(false), 400);
  }

  function toggleMute() {
    if (!player) return;
    try {
      if (player.isMuted()) {
        player.unMute();
        setMuted(false);
      } else {
        player.mute();
        setMuted(true);
      }
    } catch {}
  }

  function changeVolume(v: number) {
    if (!player) return;
    const clamped = Math.max(0, Math.min(100, v));
    try {
      player.setVolume(clamped);
      setVolume(clamped);
      if (clamped > 0 && player.isMuted()) {
        player.unMute();
        setMuted(false);
      }
    } catch {}
  }

  // Scrub bar — unified mouse + touch via Pointer Events.
  function seekFromPointer(clientX: number) {
    const el = scrubRef.current;
    if (!el || !player || duration <= 0) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const t = ratio * duration;
    setCurrentTime(t);
    try {
      player.seekTo(t, true);
    } catch {}
  }

  function onScrubPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    setSeeking(true);
    seekFromPointer(e.clientX);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  }

  function onScrubPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!seeking) return;
    seekFromPointer(e.clientX);
  }

  function onScrubPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!seeking) return;
    setSeeking(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  }

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = Math.min(100, buffered * 100);

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      onMouseMove={resetHideTimer}
      onTouchStart={resetHideTimer}
    >
      {/* Click-to-play overlay — covers the whole player area. The bottom bar
          rendered after this sits on top via source order, so clicks on the
          bar reach its own buttons instead of toggling play. */}
      <button
        type="button"
        aria-label={playing ? "Pausar" : "Reproduzir"}
        onClick={togglePlay}
        className="absolute inset-0 pointer-events-auto bg-transparent cursor-pointer"
      />

      {/* Centered play/pause pulse on toggle */}
      {showPulse && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-20 h-20 rounded-full bg-black/40 flex items-center justify-center animate-in fade-in zoom-in-50 duration-300">
            {playing ? (
              <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg className="w-10 h-10 text-white ml-1" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Bottom controls bar */}
      <div
        className={`absolute left-0 right-0 bottom-0 pointer-events-auto bg-gradient-to-t from-black/80 to-transparent px-4 pt-6 pb-3 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
        onMouseMove={resetHideTimer}
      >
        {/* Scrub bar */}
        <div
          ref={scrubRef}
          role="slider"
          aria-label="Posição do vídeo"
          aria-valuemin={0}
          aria-valuemax={Math.floor(duration)}
          aria-valuenow={Math.floor(currentTime)}
          tabIndex={0}
          onPointerDown={onScrubPointerDown}
          onPointerMove={onScrubPointerMove}
          onPointerUp={onScrubPointerUp}
          onPointerCancel={onScrubPointerUp}
          className="relative h-2 bg-gray-600/70 rounded-full cursor-pointer group/scrub mb-3 touch-none"
        >
          <div
            className="absolute inset-y-0 left-0 bg-gray-400/60 rounded-full"
            style={{ width: `${bufferedPct}%` }}
          />
          <div
            className="absolute inset-y-0 left-0 bg-[var(--member-primary,#3b82f6)] rounded-full"
            style={{ width: `${progressPct}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white rounded-full opacity-0 group-hover/scrub:opacity-100 transition-opacity shadow"
            style={{ left: `${progressPct}%` }}
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Play / pause */}
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Pausar" : "Reproduzir"}
            className="text-white hover:text-gray-200 transition"
          >
            {playing ? (
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Time */}
          <div className="text-xs font-mono text-white tabular-nums select-none">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>

          <div className="flex-1" />

          {/* Volume */}
          <div className="flex items-center gap-1.5 group/vol">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? "Reativar som" : "Silenciar"}
              className="text-white hover:text-gray-200 transition"
            >
              {muted || volume === 0 ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={muted ? 0 : volume}
              onChange={(e) => changeVolume(Number(e.target.value))}
              aria-label="Volume"
              className="w-0 group-hover/vol:w-20 transition-all duration-200 h-1 accent-white cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

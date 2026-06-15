"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

export interface BannerSlide {
  url: string;
  position: { x: number; y: number };
}

/**
 * Normaliza capa (bannerUrl + bannerPosition string JSON) + extras (bannerExtra
 * objeto {x,y}) numa lista uniforme de slides. Capa = slide 1. Sem capa → [].
 */
export function toBannerSlides(
  bannerUrl: string | null,
  bannerPosition: string | null,
  bannerExtra: BannerSlide[] | null | undefined
): BannerSlide[] {
  if (!bannerUrl) return [];
  let coverPos = { x: 50, y: 50 };
  try {
    const p = JSON.parse(bannerPosition || "");
    coverPos = { x: p?.x ?? 50, y: p?.y ?? 50 };
  } catch {}
  const extras = Array.isArray(bannerExtra)
    ? bannerExtra
        .filter((e) => e && typeof e.url === "string" && e.position)
        .map((e) => ({ url: e.url, position: { x: e.position?.x ?? 50, y: e.position?.y ?? 50 } }))
    : [];
  return [{ url: bannerUrl, position: coverPos }, ...extras];
}

const INTERVAL_MS = 6000;
const SWIPE_THRESHOLD = 40;

/**
 * Render do banner do curso. 1 slide → EXATAMENTE o <Image> de hoje (sem dots,
 * sem timer, sem wrapper extra — caminho byte-idêntico). 2+ → crossfade + dots +
 * swipe. Renderiza DENTRO do wrapper existente do banner (aspect + gradientes
 * ficam no pai, intocados).
 */
export function CourseBannerCarousel({
  slides,
  alt,
  sizes,
}: {
  slides: BannerSlide[];
  alt: string;
  sizes: string;
}) {
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const multi = slides.length > 1;

  // Autoplay: pausa em document.hidden e em prefers-reduced-motion.
  // `current` nas deps faz a navegação manual (e o auto-advance) resetarem o timer.
  useEffect(() => {
    if (!multi) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let id: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      id = setInterval(() => {
        setCurrent((c) => (c + 1) % slides.length);
      }, INTERVAL_MS);
    };
    const stop = () => {
      if (id) clearInterval(id);
    };
    const onVis = () => {
      stop();
      if (!document.hidden) start();
    };
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [multi, slides.length, current]);

  if (slides.length === 0) return null;

  // 1 slide → byte-idêntico ao de hoje (fill, object-cover, objectPosition, priority).
  if (!multi) {
    const s = slides[0];
    return (
      <Image
        src={s.url}
        alt={alt}
        fill
        sizes={sizes}
        className="object-cover"
        style={{ objectPosition: `${s.position.x}% ${s.position.y}%` }}
        priority
      />
    );
  }

  function go(i: number) {
    setCurrent(((i % slides.length) + slides.length) % slides.length);
  }
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    go(dx < 0 ? current + 1 : current - 1); // swipe esquerda = próximo
  }

  // 2+ → imagens empilhadas (absolute) com crossfade + dots. SEM overflow-x.
  return (
    <div className="absolute inset-0" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {slides.map((s, i) => (
        <Image
          key={s.url}
          src={s.url}
          alt={alt}
          fill
          sizes={sizes}
          className="object-cover transition-opacity duration-700 ease-in-out"
          style={{ objectPosition: `${s.position.x}% ${s.position.y}%`, opacity: i === current ? 1 : 0 }}
          priority={i === 0}
          aria-hidden={i === current ? undefined : true}
        />
      ))}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
        {slides.map((s, i) => (
          <button
            key={s.url}
            type="button"
            onClick={() => go(i)}
            aria-label={`Ir para banner ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${
              i === current ? "w-5 bg-white" : "w-1.5 bg-white/60 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

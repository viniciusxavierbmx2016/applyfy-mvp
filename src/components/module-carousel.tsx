"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";

export interface CarouselModule {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  lessonsTotal: number;
  lessonsDone: number;
  progressPct: number;
  locked: boolean;
  empty?: boolean;
  hideTitle?: boolean;
  releaseAt?: Date;
  href: string;
  clickable: boolean;
}

interface Props {
  title?: string;
  modules: CarouselModule[];
}

export function ModuleCarousel({ title, modules }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [maxOffset, setMaxOffset] = useState(0);
  const [isMd, setIsMd] = useState(false);
  // Mobile: touch-driven transform (same mechanic as desktop) instead of a
  // native overflow-x scroller. iOS PWA captures any touch that starts on a
  // native horizontal scroller and locks it to the x-axis, blocking the
  // page's vertical scroll. With overflow-hidden + translateX there is no
  // native scroll container to capture, so vertical gestures bubble to <main>.
  const [mobileOffset, setMobileOffset] = useState(0);
  const [mobileMaxOffset, setMobileMaxOffset] = useState(0);
  // currentOffset mirrors the live (DOM-driven) position; lastX/lastTime feed
  // the release-velocity (momentum) calc. The track's transition is toggled
  // directly on the DOM during a drag — there is no isDragging state, since a
  // setState per touchmove would re-render every card and defeat the purpose.
  const touchRef = useRef<{
    startX: number;
    startY: number;
    startOffset: number;
    axis: "x" | "y" | null;
    currentOffset: number;
    lastX: number;
    lastTime: number;
  }>({
    startX: 0,
    startY: 0,
    startOffset: 0,
    axis: null,
    currentOffset: 0,
    lastX: 0,
    lastTime: 0,
  });

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsMd(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMd(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const measure = useCallback(() => {
    const container = containerRef.current;
    const track = trackRef.current;
    if (!container || !track) return;
    const max = Math.max(0, track.scrollWidth - (container.clientWidth - (parseFloat(getComputedStyle(container).paddingLeft) || 0) - (parseFloat(getComputedStyle(container).paddingRight) || 0)));
    setMaxOffset(max);
    setOffset((prev) => Math.min(prev, max));
    // Mobile uses the same transform mechanic — and the SAME max formula as
    // desktop: subtract the container's lateral padding (px-5/7/11). The padding
    // insets the track content inside the overflow-clip box, so it shrinks the
    // visible content area and therefore the scroll range. Without subtracting
    // it, mMax is ~40px too small and the last cover stops cut off past the edge.
    // Computed unconditionally so we don't need isMd as a measure() dependency.
    const mMax = Math.max(0, track.scrollWidth - (container.clientWidth - (parseFloat(getComputedStyle(container).paddingLeft) || 0) - (parseFloat(getComputedStyle(container).paddingRight) || 0)));
    setMobileMaxOffset(mMax);
    setMobileOffset((prev) => Math.min(prev, mMax));
  }, []);

  useEffect(() => {
    measure();
    // Re-measure after paint: the last carousel (bottom of page) can measure
    // before layout settles, leaving maxOffset stale (0) and the right arrow
    // wrongly disabled.
    const raf = requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    if (trackRef.current) ro.observe(trackRef.current);
    // Re-measure when the carousel scrolls into view: a below-the-fold carousel
    // may have laid out with stale dimensions before it was visible.
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) measure();
      },
      { threshold: 0.1 }
    );
    if (containerRef.current) io.observe(containerRef.current);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [modules.length, measure]);

  function scrollByDir(dir: 1 | -1) {
    const container = containerRef.current;
    if (!container) return;

    if (isMd) {
      // Measure live: don't trust a possibly-stale maxOffset state.
      const track = trackRef.current;
      const liveMax = track
        ? Math.max(0, track.scrollWidth - (container.clientWidth - (parseFloat(getComputedStyle(container).paddingLeft) || 0) - (parseFloat(getComputedStyle(container).paddingRight) || 0)))
        : maxOffset;
      if (liveMax !== maxOffset) setMaxOffset(liveMax);
      const step = (container.clientWidth - (parseFloat(getComputedStyle(container).paddingLeft) || 0) - (parseFloat(getComputedStyle(container).paddingRight) || 0)) * 0.85;
      setOffset((prev) => {
        const next = prev + step * dir;
        return Math.max(0, Math.min(liveMax, next));
      });
    } else {
      container.scrollBy({ left: container.clientWidth * 0.85 * dir, behavior: "smooth" });
    }
  }

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      if (!isMd) return;
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) return;
      if (Math.abs(e.deltaX) > 0) {
        e.preventDefault();
        setOffset((prev) => Math.max(0, Math.min(maxOffset, prev + e.deltaX)));
      }
    },
    [isMd, maxOffset]
  );

  // ── Mobile touch handlers (touch-driven transform, no native scroller) ──
  // Direct-DOM drag: transform/transition are written straight to the track
  // during the gesture (no setState per frame → cards don't re-render). React
  // state (mobileOffset) is committed once on release so the next gesture and
  // any future render stay in sync. touchmove itself lives in a non-passive
  // listener below (preventDefault needs it).
  const onMobileTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const t = e.touches[0];
      touchRef.current = {
        startX: t.clientX,
        startY: t.clientY,
        startOffset: mobileOffset,
        axis: null,
        currentOffset: mobileOffset,
        lastX: t.clientX,
        lastTime: Date.now(),
      };
    },
    [mobileOffset]
  );

  const onMobileTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const draggedX = touchRef.current.axis === "x";
      touchRef.current.axis = null;
      if (!draggedX) return; // vertical gesture or tap — nothing to settle

      // Release velocity (px/ms): only counts when the finger was still moving
      // at lift-off (dt < 100ms). Carried into the final offset as inertia.
      const dt = Date.now() - touchRef.current.lastTime;
      const releaseX = e.changedTouches[0].clientX;
      const velocity =
        dt > 0 && dt < 100 ? (touchRef.current.lastX - releaseX) / dt : 0;
      let finalOffset = touchRef.current.currentOffset + velocity * 150;
      finalOffset = Math.max(0, Math.min(mobileMaxOffset, finalOffset));

      // Snap to the nearest card. Measure the real card stride (width + gap-3
      // = 12px); fall back to the 42%-width approximation if not measurable.
      const firstCard = trackRef.current
        ?.firstElementChild as HTMLElement | null;
      const stride = firstCard
        ? firstCard.offsetWidth + 12
        : containerRef.current
          ? containerRef.current.clientWidth * 0.42 + 12
          : 200;
      if (stride > 0) {
        finalOffset = Math.round(finalOffset / stride) * stride;
        finalOffset = Math.max(0, Math.min(mobileMaxOffset, finalOffset));
      }

      // Animate to the snap target directly (fires immediately), then commit
      // to state so React's next render matches.
      if (trackRef.current) {
        trackRef.current.style.transition = "transform 300ms ease";
        trackRef.current.style.transform = `translateX(-${finalOffset}px)`;
      }
      touchRef.current.currentOffset = finalOffset;
      setMobileOffset(finalOffset);
    },
    [mobileMaxOffset]
  );

  // touchmove runs in a NON-PASSIVE listener so preventDefault genuinely stops
  // the page from also scrolling vertically during a horizontal swipe. (React
  // registers onTouchMove passively at the root, where preventDefault no-ops.)
  // Mobile only — desktop never registers this.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || isMd) return;
    const onMove = (e: TouchEvent) => {
      const t = e.touches[0];
      const dx = t.clientX - touchRef.current.startX;
      const dy = t.clientY - touchRef.current.startY;
      // Lock the axis once, after 8px.
      if (!touchRef.current.axis) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        touchRef.current.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        // Horizontal → kill the settle transition so the track tracks the
        // finger 1:1 (otherwise the 300ms ease lags every frame).
        if (touchRef.current.axis === "x" && trackRef.current) {
          trackRef.current.style.transition = "none";
        }
      }
      if (touchRef.current.axis === "y") return; // let <main> scroll
      e.preventDefault();
      const newOffset = Math.max(
        0,
        Math.min(mobileMaxOffset, touchRef.current.startOffset - dx)
      );
      touchRef.current.currentOffset = newOffset;
      touchRef.current.lastX = t.clientX;
      touchRef.current.lastTime = Date.now();
      if (trackRef.current) {
        trackRef.current.style.transform = `translateX(-${newOffset}px)`;
      }
    };
    el.addEventListener("touchmove", onMove, { passive: false });
    return () => el.removeEventListener("touchmove", onMove);
  }, [isMd, mobileMaxOffset]);

  const canLeft = isMd ? offset > 0 : false;
  const canRight = isMd ? offset < maxOffset - 4 : false;

  // Fade SÓ na direita (Netflix): a última capa some suave em vez de clipe seco.
  // `to right` = eixo horizontal só → opaco em toda a altura na zona não-fade, então
  // NÃO corta a sombra (vertical) do hover. Opaco até (100% - 44px); fade nos últimos
  // 44px = px-11 (respiro lateral do track no lg) → última capa 100% nítida no fim do
  // scroll desktop. Esquerda intocada (black 0) → 1ª capa nítida, alinhada com o título.
  const fadeMask =
    "linear-gradient(to right, black 0, black calc(100% - 44px), transparent 100%)";
  // Mobile: fade de 20px = gutter px-5. Pós-fix do scroll-range (714749a) a última
  // capa assenta em W-20 (gutter de 20px à direita). Fade de 20px = [W-20, W] = só o
  // respiro vazio → capa 100% opaca, fade nunca a cobre. Regra: fade ≤ gutter (mesma
  // lógica do desktop lg: 44px = px-11). No sm (640-768, gutter 28px) o fade de 20px
  // < gutter → também seguro. NÃO usar 44px aqui (cobriria a capa em 24px).
  const fadeMaskMobile =
    "linear-gradient(to right, black 0, black calc(100% - 20px), transparent 100%)";

  return (
    <section className="mb-12">
      {(title || (isMd && maxOffset > 0)) && (
        <div className="flex items-center gap-4 mb-5 px-1">
          {title && (
            <>
              <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white whitespace-nowrap">
                {title}
              </h2>
              <div className="flex-1 h-px bg-gradient-to-r from-gray-200 via-gray-200 to-transparent dark:from-white/10 dark:via-white/10" />
            </>
          )}
          {!title && <div className="flex-1" />}
          <div className="hidden md:flex gap-2">
            <button
              onClick={() => scrollByDir(-1)}
              aria-disabled={!canLeft}
              aria-label="Anterior"
              className="p-2 rounded-full bg-gray-100 dark:bg-white/10 backdrop-blur text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/20 aria-disabled:opacity-30 aria-disabled:cursor-not-allowed transition-colors duration-200"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => scrollByDir(1)}
              aria-disabled={!canRight}
              aria-label="Próximo"
              className="p-2 rounded-full bg-gray-100 dark:bg-white/10 backdrop-blur text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/20 aria-disabled:opacity-30 aria-disabled:cursor-not-allowed transition-colors duration-200"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        onWheel={handleWheel}
        {...(!isMd && {
          onTouchStart: onMobileTouchStart,
          onTouchEnd: onMobileTouchEnd,
          onTouchCancel: onMobileTouchEnd,
        })}
        // Full-bleed (padrão Netflix): -mx cancela o px do sub-wrapper da page
        // (4/6/10) → as capas sangram até a borda do conteúdo; px re-padda em
        // (sub-wrapper px + 1) = posição do px-1 do título → a 1ª capa alinha SOB
        // o título e a sombra do hover tem folga lateral. O vertical (paddingBlock/
        // marginBlock 16) preserva a folga da sombra no desktop sem corte do overflow.
        // measure() lê paddingLeft/Right via getComputedStyle → o scroll se adapta.
        className={
          isMd
            ? "overflow-hidden -mx-4 sm:-mx-6 lg:-mx-10 px-5 sm:px-7 lg:px-11"
            : "overflow-hidden pb-2 -mx-4 sm:-mx-6 lg:-mx-10 px-5 sm:px-7 lg:px-11"
        }
        style={
          isMd
            ? {
                paddingBlock: "16px",
                marginBlock: "-16px",
                maskImage: fadeMask,
                WebkitMaskImage: fadeMask,
              }
            : // Mobile: fade de 20px (fadeMaskMobile), casado com o gutter px-5 → o
              // respiro dissolve suave (acabamento Netflix) sem cobrir a última capa.
              { maskImage: fadeMaskMobile, WebkitMaskImage: fadeMaskMobile }
        }
      >
        <div
          ref={trackRef}
          className="flex gap-3 sm:gap-4"
          style={
            isMd
              ? { transform: `translateX(-${offset}px)`, transition: "transform 300ms ease" }
              : {
                  transform: `translateX(-${mobileOffset}px)`,
                  // Transition is toggled directly on the DOM during a drag
                  // (none while dragging, 300ms on release/snap). This static
                  // value is what applies between gestures + after a re-render.
                  transition: "transform 300ms ease",
                  willChange: "transform",
                }
          }
        >
          {modules.map((m) => (
            <ModuleCard key={m.id} mod={m} />
          ))}
        </div>
      </div>
    </section>
  );
}

const ModuleCard = React.memo(function ModuleCard({
  mod,
}: {
  mod: CarouselModule;
}) {
  const content = (
    <div className="relative w-full aspect-[9/16] rounded-xl overflow-hidden bg-gray-900 shadow-md shadow-black/10 dark:shadow-black/40 ring-1 ring-black/5 dark:ring-white/5 group-hover:shadow-xl group-hover:shadow-black/20 dark:group-hover:shadow-black/60 transition-[transform,box-shadow] duration-300">
      {mod.thumbnailUrl ? (
        <Image
          src={mod.thumbnailUrl}
          alt={mod.title}
          fill
          sizes="(max-width: 640px) 40vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 via-gray-900 to-black">
          <svg className="w-12 h-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
      )}

      {mod.progressPct >= 100 && !mod.locked && (
        <div className="absolute top-3 right-3 w-7 h-7 sm:w-7 sm:h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg ring-2 ring-white/30">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {!mod.hideTitle && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 px-2.5 py-[3px] rounded-full bg-black/40 backdrop-blur-md text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
          Módulo
        </div>
      )}

      {mod.locked && (
        <div className="absolute inset-0 bg-black/65 flex flex-col items-center justify-center gap-2 text-white">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          {mod.releaseAt && (
            <span className="text-xs font-medium">
              Libera em{" "}
              {mod.releaseAt.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
              })}
            </span>
          )}
        </div>
      )}

      {!mod.locked && mod.empty && (
        <div className="absolute inset-0 bg-black/55 flex items-center justify-center text-white">
          <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur text-[11px] font-semibold uppercase tracking-[0.14em]">
            Em breve
          </span>
        </div>
      )}

      {mod.hideTitle ? (
        mod.progressPct > 0 && mod.progressPct < 100 && !mod.locked ? (
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <div className="h-1 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500"
                style={{ width: `${mod.progressPct}%` }}
              />
            </div>
          </div>
        ) : null
      ) : (
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-12 sm:pt-20">
          <p className="text-sm sm:text-base font-bold tracking-tight text-white line-clamp-2 drop-shadow-lg">
            {mod.title}
          </p>
          <p className="text-xs text-gray-300/90 mt-1">
            {mod.lessonsTotal > 0
              ? `${mod.lessonsDone}/${mod.lessonsTotal} aulas`
              : "Sem aulas"}
          </p>
          {mod.progressPct > 0 && mod.progressPct < 100 && !mod.locked && (
            <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500"
                style={{ width: `${mod.progressPct}%` }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );

  const className = `group shrink-0 basis-[42%] sm:basis-[45%] md:basis-[35%] lg:basis-[28%] xl:basis-[22%] rounded-xl overflow-hidden isolate will-change-transform transition-[transform,box-shadow] duration-300 ease-out ${
    mod.clickable ? "hover:scale-[1.05] hover:shadow-2xl hover:shadow-black/30 hover:z-10" : "cursor-not-allowed"
  }`;

  if (!mod.clickable) {
    return <div className={className}>{content}</div>;
  }
  return (
    <Link href={mod.href} className={className}>
      {content}
    </Link>
  );
});

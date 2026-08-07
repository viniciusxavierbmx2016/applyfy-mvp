"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  /** As abas, prontas. Este componente não decide aparência nem sabe o que elas são. */
  children: React.ReactNode;
  className?: string;
  /**
   * Índice do filho ativo. Quando muda — e no mount — o componente traz esse
   * filho para dentro da viewport se ele estiver fora. `undefined`/-1 = não faz
   * nada. É índice, e não seletor, para o chamador não precisar marcar o botão
   * ativo com um atributo: o JSX das abas fica intocado.
   */
  activeIndex?: number;
}

/**
 * Barra de abas rolável horizontalmente, SEM scroller nativo.
 *
 * ⚠️ Existe por causa do iOS em PWA standalone: ele captura qualquer toque que
 * comece sobre um scroller horizontal nativo e trava o gesto no eixo X,
 * bloqueando a rolagem vertical da página. `touch-pan-x` e alternar overflowX
 * no meio do gesto NÃO resolvem. Sem container de scroll nativo não há o que
 * capturar, e o gesto vertical volta a subir para o <main>.
 *
 * A mecânica de toque é a do module-carousel (as 3 peças que se aplicam a
 * abas): trava de eixo aos 8px, listener não-passivo e escrita direta no DOM
 * durante o arrasto. ⚠️ Inércia e snap NÃO foram copiados de propósito — abas
 * têm largura variável e não têm passo, então snap deixaria a barra "puxando"
 * para posições arbitrárias.
 *
 * Desktop e toque são caminhos separados, decididos por `isMd`, como no
 * carrossel: o listener de toque nunca é registrado no desktop.
 */
export function ScrollableTabs({ children, className, activeIndex }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [maxOffset, setMaxOffset] = useState(0);
  const [isMd, setIsMd] = useState(false);

  // Espelha a posição viva durante o arrasto. Não é estado porque um setState
  // por touchmove re-renderizaria todas as abas e mataria o 1:1 com o dedo.
  const touchRef = useRef<{
    startX: number;
    startY: number;
    startOffset: number;
    axis: "x" | "y" | null;
    currentOffset: number;
  }>({ startX: 0, startY: 0, startOffset: 0, axis: null, currentOffset: 0 });

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
    const max = Math.max(0, track.scrollWidth - container.clientWidth);
    setMaxOffset(max);
    setOffset((prev) => Math.min(prev, max));
  }, []);

  useEffect(() => {
    measure();
    const raf = requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    if (trackRef.current) ro.observe(trackRef.current);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [measure, children]);

  // ── Trazer a aba ativa para a viewport ──
  // Lógica NOVA (o carrossel não tem item selecionado, então não precisava).
  // Sem isto, um curso cujo grupo padrão é a oitava aba abre com a seleção fora
  // da tela e a barra parece vazia.
  useEffect(() => {
    if (activeIndex == null || activeIndex < 0) return;
    const container = containerRef.current;
    const track = trackRef.current;
    if (!container || !track) return;
    const el = track.children[activeIndex] as HTMLElement | undefined;
    if (!el) return;
    const left = el.offsetLeft;
    const right = left + el.offsetWidth;
    // Funcional para ler a posição atual sem depender de `offset` nas deps —
    // depender dele faria o efeito rodar a cada arrasto.
    setOffset((prev) => {
      const viewRight = prev + container.clientWidth;
      if (left < prev) return Math.max(0, left - 12);
      if (right > viewRight) {
        return Math.min(maxOffset, right - container.clientWidth + 12);
      }
      return prev;
    });
  }, [activeIndex, maxOffset]);

  // ── Desktop ──
  const step = () => (containerRef.current?.clientWidth || 300) * 0.7;

  const scrollByDir = (dir: 1 | -1) => {
    setOffset((prev) => Math.max(0, Math.min(maxOffset, prev + step() * dir)));
  };

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      if (!isMd) return;
      // ⚠️ Sem este guard, rolar a página verticalmente com trackpad
      // horizontalizaria a barra.
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) return;
      if (Math.abs(e.deltaX) > 0) {
        e.preventDefault();
        setOffset((prev) => Math.max(0, Math.min(maxOffset, prev + e.deltaX)));
      }
    },
    [isMd, maxOffset]
  );

  // ── Toque (mobile) ──
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const t = e.touches[0];
      touchRef.current = {
        startX: t.clientX,
        startY: t.clientY,
        startOffset: offset,
        axis: null,
        currentOffset: offset,
      };
    },
    [offset]
  );

  const onTouchEnd = useCallback(() => {
    const dragged = touchRef.current.axis === "x";
    touchRef.current.axis = null;
    if (trackRef.current) trackRef.current.style.transition = "";
    if (!dragged) return; // gesto vertical ou toque simples — nada a assentar
    // Sem inércia e sem snap: onde o dedo largou é onde fica.
    setOffset(touchRef.current.currentOffset);
  }, []);

  // touchmove precisa ser NÃO-PASSIVO para o preventDefault valer. O
  // onTouchMove do JSX é registrado passivamente pelo React na raiz, onde
  // preventDefault é no-op. Mobile apenas — no desktop nunca é registrado.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || isMd) return;
    const onMove = (e: TouchEvent) => {
      const t = e.touches[0];
      const dx = t.clientX - touchRef.current.startX;
      const dy = t.clientY - touchRef.current.startY;
      // Trava o eixo uma vez, após 8px.
      if (!touchRef.current.axis) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        touchRef.current.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        if (touchRef.current.axis === "x" && trackRef.current) {
          trackRef.current.style.transition = "none";
        }
      }
      // ⭐ O coração do fix: no eixo Y não fazemos nada e não prevenimos —
      // o gesto sobe para a página e a rolagem vertical continua funcionando.
      if (touchRef.current.axis === "y") return;
      e.preventDefault();
      const next = Math.max(
        0,
        Math.min(maxOffset, touchRef.current.startOffset - dx)
      );
      touchRef.current.currentOffset = next;
      if (trackRef.current) {
        trackRef.current.style.transform = `translateX(-${next}px)`;
      }
    };
    el.addEventListener("touchmove", onMove, { passive: false });
    return () => el.removeEventListener("touchmove", onMove);
  }, [isMd, maxOffset]);

  const canLeft = offset > 1;
  const canRight = offset < maxOffset - 1;

  // Véu só do lado que tem conteúdo escondido. 24px casa com o `pr-6` do track,
  // então quando a barra chega ao fim o véu cai sobre respiro vazio e nunca
  // cobre a última aba (a regra `fade ≤ gutter` do carrossel).
  const mask =
    canLeft && canRight
      ? "linear-gradient(to right, transparent 0, black 24px, black calc(100% - 24px), transparent 100%)"
      : canLeft
        ? "linear-gradient(to right, transparent 0, black 24px, black 100%)"
        : canRight
          ? "linear-gradient(to right, black 0, black calc(100% - 24px), transparent 100%)"
          : undefined;

  const arrow =
    "hidden md:flex items-center justify-center w-7 h-7 shrink-0 rounded-full bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-0 disabled:pointer-events-none transition-colors";

  return (
    <div className={`flex items-center gap-2 ${className || ""}`}>
      {isMd && maxOffset > 0 && (
        <button
          type="button"
          onClick={() => scrollByDir(-1)}
          disabled={!canLeft}
          aria-label="Anterior"
          className={arrow}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      <div
        ref={containerRef}
        onWheel={handleWheel}
        {...(!isMd && {
          onTouchStart,
          onTouchEnd,
          onTouchCancel: onTouchEnd,
        })}
        className="flex-1 min-w-0 overflow-hidden"
        style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
      >
        <div
          ref={trackRef}
          className="flex gap-1 pr-6 w-max transition-transform duration-200 ease-out"
          style={{ transform: `translateX(-${offset}px)` }}
        >
          {children}
        </div>
      </div>

      {isMd && maxOffset > 0 && (
        <button
          type="button"
          onClick={() => scrollByDir(1)}
          disabled={!canRight}
          aria-label="Próximo"
          className={arrow}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}

"use client";

import { useRef, useState, useEffect } from "react";
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
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const update = () => {
      setCanLeft(el.scrollLeft > 4);
      setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [modules.length]);

  function scrollBy(dir: 1 | -1) {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.85 * dir;
    el.scrollBy({ left: amount, behavior: "smooth" });
  }

  return (
    <section className="mb-12">
      {title && (
        <div className="flex items-center gap-4 mb-5 px-1">
          <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white whitespace-nowrap">
            {title}
          </h2>
          <div className="flex-1 h-px bg-gradient-to-r from-gray-200 via-gray-200 to-transparent dark:from-white/10 dark:via-white/10" />
          <div className="flex gap-2">
            <button
              onClick={() => scrollBy(-1)}
              disabled={!canLeft}
              aria-label="Anterior"
              className="p-2 rounded-full bg-gray-100 dark:bg-white/10 backdrop-blur text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => scrollBy(1)}
              disabled={!canRight}
              aria-label="Próximo"
              className="p-2 rounded-full bg-gray-100 dark:bg-white/10 backdrop-blur text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div
        ref={scrollerRef}
        className="flex gap-3 sm:gap-4 overflow-x-hidden pb-2 -mx-4 px-4 sm:mx-0 sm:px-0"
      >
        {modules.map((m) => (
          <ModuleCard key={m.id} mod={m} />
        ))}
      </div>
    </section>
  );
}

function ModuleCard({ mod }: { mod: CarouselModule }) {
  const content = (
    <div className="relative w-full aspect-[9/16] rounded-xl overflow-hidden bg-gray-900 shadow-md shadow-black/10 dark:shadow-black/40 ring-1 ring-black/5 dark:ring-white/5 group-hover:shadow-xl group-hover:shadow-black/20 dark:group-hover:shadow-black/60 transition-all duration-300">
      {mod.thumbnailUrl ? (
        <Image
          src={mod.thumbnailUrl}
          alt={mod.title}
          fill
          sizes="(max-width: 640px) 65vw, (max-width: 1024px) 33vw, 20vw"
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
        <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg ring-2 ring-white/30">
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
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-20">
          <p className="text-base font-bold tracking-tight text-white line-clamp-2 drop-shadow-lg">
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

  const className = `group shrink-0 snap-start basis-[75%] sm:basis-[45%] md:basis-[35%] lg:basis-[28%] xl:basis-[22%] transition-[transform,box-shadow] duration-300 ease-out ${
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
}

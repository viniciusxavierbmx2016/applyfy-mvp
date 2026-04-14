"use client";

import Link from "next/link";
import Image from "next/image";
import { ProgressBar } from "./progress-bar";
import { cn } from "@/lib/utils";

interface CourseCardProps {
  slug: string;
  title: string;
  description: string;
  thumbnail?: string | null;
  locked?: boolean;
  expired?: boolean;
  progress?: number;
  ratingAverage?: number;
  ratingCount?: number;
  checkoutUrl?: string | null;
  expiresAt?: string | Date | null;
  className?: string;
  manageHref?: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysUntil(date: Date) {
  return Math.ceil((date.getTime() - Date.now()) / MS_PER_DAY);
}

export function CourseCard({
  slug,
  title,
  description,
  thumbnail,
  locked = false,
  expired = false,
  progress,
  ratingAverage,
  ratingCount,
  checkoutUrl,
  expiresAt,
  className,
  manageHref,
}: CourseCardProps) {
  const showRating =
    typeof ratingAverage === "number" &&
    typeof ratingCount === "number" &&
    ratingCount > 0;
  const expiresAtDate =
    expiresAt instanceof Date
      ? expiresAt
      : expiresAt
        ? new Date(expiresAt)
        : null;
  const daysLeft = expiresAtDate ? daysUntil(expiresAtDate) : null;
  const wrapperClassName = cn(
    "group block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden hover:border-gray-400 dark:hover:border-gray-700 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200",
    expired && "opacity-75 grayscale-[0.4]",
    className
  );
  const inner = (
    <>
      {/* Thumbnail 16:9 */}
      <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 overflow-hidden">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className={cn(
              "object-cover transition-transform duration-300 group-hover:scale-105",
              locked && "opacity-60"
            )}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="w-12 h-12 text-gray-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-2 right-2">
          {expired ? (
            <div className="flex items-center gap-1 px-2 py-1 bg-red-500/90 backdrop-blur-sm rounded-full text-xs text-white font-medium">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Expirado
            </div>
          ) : locked ? (
            <div className="flex items-center gap-1 px-2 py-1 bg-black/70 backdrop-blur-sm rounded-full text-xs text-white font-medium">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Bloqueado
            </div>
          ) : daysLeft !== null ? (
            daysLeft <= 30 ? (
              <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/90 backdrop-blur-sm rounded-full text-xs text-white font-medium">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Expira em {daysLeft}d
              </div>
            ) : (
              <div className="flex items-center gap-1 px-2 py-1 bg-green-500/90 backdrop-blur-sm rounded-full text-xs text-white font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                {daysLeft}d restantes
              </div>
            )
          ) : typeof progress === "number" ? (
            <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/90 backdrop-blur-sm rounded-full text-xs text-white font-medium">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Vitalício
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2 py-1 bg-green-500/90 backdrop-blur-sm rounded-full text-xs text-white font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              Liberado
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1 mb-1">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2 min-h-[2.5rem]">
          {description}
        </p>
        {showRating && (
          <div className="flex items-center gap-1 text-xs text-amber-400 font-medium mb-2">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 17.27l6.18 3.73-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
            <span>{ratingAverage!.toFixed(1)}</span>
            <span className="text-gray-500 font-normal">
              ({ratingCount})
            </span>
          </div>
        )}

        {!locked && !expired && typeof progress === "number" && (
          <ProgressBar value={progress} showLabel />
        )}

        {expired && (
          <>
            <p className="text-xs text-red-500 dark:text-red-400 font-medium mb-2">
              Seu acesso expirou. Renove para continuar assistindo.
            </p>
            {checkoutUrl && (
              <a
                href={checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center justify-center w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition"
              >
                Renovar acesso
              </a>
            )}
          </>
        )}

        {locked && !expired && !manageHref && (
          <p className="text-xs text-blue-400 font-medium flex items-center gap-1">
            Ver detalhes
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </p>
        )}

      </div>
    </>
  );

  if (manageHref) {
    return (
      <div className={wrapperClassName}>
        <Link href={`/course/${slug}`} className="block">
          {inner}
        </Link>
        <div className="px-4 pb-4 -mt-1 grid grid-cols-2 gap-2">
          <Link
            href={`/course/${slug}`}
            className="inline-flex items-center justify-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition"
          >
            Acessar
          </Link>
          <Link
            href={manageHref}
            className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-lg transition"
          >
            Editar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Link href={`/course/${slug}`} className={wrapperClassName}>
      {inner}
    </Link>
  );
}

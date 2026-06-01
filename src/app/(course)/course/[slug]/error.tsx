"use client";

import { useEffect } from "react";
import Link from "next/link";

// Segment-scoped error boundary. Mirrors src/app/error.tsx visually but
// uses the member-area CSS variables (--member-bg, --member-text, …) so
// the producer's customized course palette stays consistent. Catches
// anything that escapes the try/catch blocks in layout.tsx or in the
// nested page/lesson server components.
export default function CourseError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[course-segment-error]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[var(--member-bg,#0a0a1a)] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-6 flex justify-center">
          <svg
            className="w-20 h-20 text-red-500/60"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-[var(--member-text,#ffffff)] mb-3">
          Não foi possível carregar o curso
        </h1>
        <p className="text-gray-400 mb-8">
          Ocorreu um erro inesperado. Tente novamente em alguns instantes.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
          >
            Tentar novamente
          </button>
          <Link
            href="/"
            className="px-6 py-3 border border-gray-700 hover:bg-gray-800 text-gray-300 font-medium rounded-lg transition"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

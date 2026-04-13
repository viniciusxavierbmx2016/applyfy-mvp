"use client";

import { useEffect, useState } from "react";

interface Props {
  nextLessonTitle: string;
  seconds?: number;
  onComplete: () => void;
  onCancel: () => void;
}

export function AutoplayCountdown({
  nextLessonTitle,
  seconds = 5,
  onComplete,
  onCancel,
}: Props) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) {
      onComplete();
      return;
    }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, onComplete]);

  const progress = ((seconds - remaining) / seconds) * 100;

  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center backdrop-blur-sm z-10">
      <div className="text-center px-6 max-w-md">
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Próxima aula em</p>
        <div className="relative w-24 h-24 mx-auto mb-4">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="rgb(31 41 55)"
              strokeWidth="6"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="rgb(59 130 246)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-3xl font-bold text-gray-900 dark:text-white">
            {remaining}
          </div>
        </div>
        <p className="text-gray-900 dark:text-white font-semibold mb-4 line-clamp-2">
          {nextLessonTitle}
        </p>
        <div className="flex gap-2 justify-center">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onComplete}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            Assistir agora
          </button>
        </div>
      </div>
    </div>
  );
}

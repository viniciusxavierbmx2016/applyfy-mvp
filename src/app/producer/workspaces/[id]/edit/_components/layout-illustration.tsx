"use client";

import type { LoginLayout } from "../_types";

export function LayoutIllustration({ kind }: { kind: LoginLayout }) {
  if (kind === "central") {
    return (
      <div className="w-full h-full rounded-md bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-white/10 flex items-center justify-center">
        <div className="w-10 h-12 rounded bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 shadow-sm flex flex-col items-center justify-center gap-0.5 p-1">
          <div className="w-full h-1 rounded bg-gray-300 dark:bg-gray-500" />
          <div className="w-full h-1 rounded bg-gray-300 dark:bg-gray-500" />
          <div className="w-full h-1.5 rounded bg-primary" />
        </div>
      </div>
    );
  }
  if (kind === "lateral-left") {
    return (
      <div className="w-full h-full rounded-md border border-gray-200 dark:border-white/10 flex overflow-hidden">
        <div className="w-1/2 bg-gray-800 dark:bg-gray-950 flex items-center justify-center">
          <div className="w-7 h-9 rounded-sm bg-white/80 flex flex-col items-center justify-center gap-0.5 p-0.5">
            <div className="w-full h-0.5 rounded bg-gray-300" />
            <div className="w-full h-0.5 rounded bg-gray-300" />
            <div className="w-full h-1 rounded bg-primary" />
          </div>
        </div>
        <div className="w-1/2 bg-gradient-to-br from-blue-400 to-purple-500" />
      </div>
    );
  }
  return (
    <div className="w-full h-full rounded-md border border-gray-200 dark:border-white/10 flex overflow-hidden">
      <div className="w-1/2 bg-gradient-to-br from-blue-400 to-purple-500" />
      <div className="w-1/2 bg-gray-800 dark:bg-gray-950 flex items-center justify-center">
        <div className="w-7 h-9 rounded-sm bg-white/80 flex flex-col items-center justify-center gap-0.5 p-0.5">
          <div className="w-full h-0.5 rounded bg-gray-300" />
          <div className="w-full h-0.5 rounded bg-gray-300" />
          <div className="w-full h-1 rounded bg-primary" />
        </div>
      </div>
    </div>
  );
}

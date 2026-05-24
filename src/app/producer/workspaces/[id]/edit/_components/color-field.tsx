"use client";

import { HEX_RE } from "../_lib/helpers";

export function ColorField({
  label,
  description,
  value,
  fallback,
  onChange,
}: {
  label: string;
  description: string;
  value: string;
  fallback: string;
  onChange: (v: string) => void;
}) {
  const displayHex = HEX_RE.test(value) ? value : fallback;
  return (
    <label className="flex items-center gap-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-3 cursor-pointer hover:border-gray-300 dark:hover:border-white/20 transition-colors">
      <span
        className="w-7 h-7 rounded-md shrink-0 border border-gray-200 dark:border-white/10 relative overflow-hidden"
        style={{ backgroundColor: displayHex }}
      >
        <input
          type="color"
          value={displayHex}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-tight">{label}</p>
        <p className="text-xs font-mono text-gray-400 dark:text-gray-500">
          {HEX_RE.test(value) ? value : "padrão"}
        </p>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{description}</p>
      </div>
    </label>
  );
}

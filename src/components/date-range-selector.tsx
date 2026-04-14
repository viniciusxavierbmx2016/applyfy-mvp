"use client";

import { useEffect, useRef, useState } from "react";

export type DateRangeOption =
  | "today"
  | "yesterday"
  | "last_week"
  | "current_month"
  | "previous_month"
  | "last_30_days"
  | "last_3_months"
  | "last_6_months"
  | "last_year"
  | "total"
  | "custom";

export interface DateRangeValue {
  option: DateRangeOption;
  startDate: string;
  endDate: string;
  label: string;
}

const OPTIONS: Array<{ id: DateRangeOption; label: string }> = [
  { id: "today", label: "Hoje" },
  { id: "yesterday", label: "Ontem" },
  { id: "last_week", label: "Última semana" },
  { id: "current_month", label: "Mês atual" },
  { id: "previous_month", label: "Mês anterior" },
  { id: "last_30_days", label: "Últimos 30 dias" },
  { id: "last_3_months", label: "Últimos 3 meses" },
  { id: "last_6_months", label: "Últimos 6 meses" },
  { id: "last_year", label: "Último ano" },
  { id: "total", label: "Total" },
  { id: "custom", label: "Personalizado" },
];

const LABEL_OF = new Map(OPTIONS.map((o) => [o.id, o.label]));

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function computeRange(
  option: DateRangeOption,
  customStart?: string,
  customEnd?: string
): DateRangeValue {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  let start = todayStart;
  let end = todayEnd;

  switch (option) {
    case "today":
      start = todayStart;
      end = todayEnd;
      break;
    case "yesterday": {
      const y = new Date(todayStart);
      y.setDate(y.getDate() - 1);
      start = y;
      end = endOfDay(y);
      break;
    }
    case "last_week": {
      const s = new Date(todayStart);
      s.setDate(s.getDate() - 6);
      start = s;
      end = todayEnd;
      break;
    }
    case "current_month": {
      start = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      end = todayEnd;
      break;
    }
    case "previous_month": {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0);
      start = startOfDay(s);
      end = endOfDay(e);
      break;
    }
    case "last_30_days": {
      const s = new Date(todayStart);
      s.setDate(s.getDate() - 29);
      start = s;
      end = todayEnd;
      break;
    }
    case "last_3_months": {
      const s = new Date(todayStart);
      s.setMonth(s.getMonth() - 3);
      start = s;
      end = todayEnd;
      break;
    }
    case "last_6_months": {
      const s = new Date(todayStart);
      s.setMonth(s.getMonth() - 6);
      start = s;
      end = todayEnd;
      break;
    }
    case "last_year": {
      const s = new Date(todayStart);
      s.setFullYear(s.getFullYear() - 1);
      start = s;
      end = todayEnd;
      break;
    }
    case "total": {
      const s = new Date(todayStart);
      s.setFullYear(s.getFullYear() - 10);
      start = s;
      end = todayEnd;
      break;
    }
    case "custom": {
      if (customStart) start = startOfDay(new Date(customStart));
      if (customEnd) end = endOfDay(new Date(customEnd));
      break;
    }
  }

  let label = LABEL_OF.get(option) || "Período";
  if (option === "custom" && customStart && customEnd) {
    label = `${formatShort(start)} – ${formatShort(end)}`;
  }

  return {
    option,
    startDate: isoDay(start),
    endDate: isoDay(end),
    label,
  };
}

function formatShort(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function FunnelIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}
function ChevronDown({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

interface DateRangeSelectorProps {
  value: DateRangeValue;
  onChange: (v: DateRangeValue) => void;
}

export function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [customStart, setCustomStart] = useState(
    value.option === "custom" ? value.startDate : ""
  );
  const [customEnd, setCustomEnd] = useState(
    value.option === "custom" ? value.endDate : ""
  );
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function pick(opt: DateRangeOption) {
    if (opt === "custom") {
      if (customStart && customEnd) {
        onChange(computeRange("custom", customStart, customEnd));
        setOpen(false);
      } else {
        onChange({ ...value, option: "custom" });
      }
      return;
    }
    onChange(computeRange(opt));
    setOpen(false);
  }

  function applyCustom() {
    if (!customStart || !customEnd) return;
    onChange(computeRange("custom", customStart, customEnd));
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm font-medium text-gray-900 dark:text-white hover:border-gray-300 dark:hover:border-gray-700 transition min-w-[180px]"
      >
        <FunnelIcon className="w-4 h-4 text-gray-500" />
        <span className="flex-1 text-left truncate">{value.label}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl z-50 overflow-hidden">
          <ul className="py-1 max-h-[min(70vh,480px)] overflow-y-auto">
            {OPTIONS.map((o) => {
              const active = value.option === o.id;
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => pick(o.id)}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition ${
                      active ? "text-blue-600 dark:text-blue-400 font-medium" : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <span className="w-4 inline-flex justify-center">
                      {active && <CheckIcon className="w-4 h-4" />}
                    </span>
                    {o.label}
                  </button>
                </li>
              );
            })}
          </ul>

          {value.option === "custom" && (
            <div className="border-t border-gray-200 dark:border-gray-800 p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wider text-gray-500">
                  De
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-md px-2 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>
                <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wider text-gray-500">
                  Até
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-md px-2 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={applyCustom}
                disabled={!customStart || !customEnd}
                className="w-full py-2 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition"
              >
                Aplicar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

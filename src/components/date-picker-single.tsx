"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const DAY_NAMES = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function fmt(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function todayStr(): string {
  const d = new Date();
  return fmt(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseYmd(s: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]) - 1, d: Number(m[3]) };
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minDate?: string;
}

export function DatePickerSingle({
  value,
  onChange,
  placeholder = "Selecionar data",
  minDate,
}: Props) {
  const [open, setOpen] = useState(false);
  const today = useMemo(() => todayStr(), []);
  const minimum = minDate ?? today;

  const initial = useMemo(() => {
    const parsed = parseYmd(value) || parseYmd(today);
    return parsed!;
  }, [value, today]);

  const [year, setYear] = useState(initial.y);
  const [month, setMonth] = useState(initial.m);

  useEffect(() => {
    if (!open) return;
    const parsed = parseYmd(value) || parseYmd(today);
    if (parsed) {
      setYear(parsed.y);
      setMonth(parsed.m);
    }
  }, [open, value, today]);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = (new Date(year, month, 1).getDay() + 6) % 7;
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length < 42) cells.push(null);

  function prev() {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }
  function next() {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  function pickDay(d: number) {
    const date = fmt(year, month, d);
    if (date < minimum) return;
    onChange(date);
    setOpen(false);
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
    setOpen(false);
  }

  const displayLabel = value
    ? new Date(value + "T12:00:00Z").toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "UTC",
      })
    : placeholder;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span
          className={
            value
              ? "text-gray-900 dark:text-white"
              : "text-gray-500 dark:text-gray-400"
          }
        >
          {displayLabel}
        </span>
        <span className="flex items-center gap-1 ml-2">
          {value && (
            <span
              role="button"
              tabIndex={0}
              onClick={clear}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange("");
                  setOpen(false);
                }
              }}
              className="text-gray-400 hover:text-red-500 p-0.5 cursor-pointer"
              title="Limpar data"
              aria-label="Limpar data"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>
          )}
          <svg
            className="w-4 h-4 text-gray-400 dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-3 w-[252px] select-none">
          <div className="flex items-center justify-between mb-2 px-1">
            <button
              type="button"
              onClick={prev}
              className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              aria-label="Mês anterior"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {MONTH_NAMES[month]} {year}
            </span>
            <button
              type="button"
              onClick={next}
              className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              aria-label="Próximo mês"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 mb-1 px-1">
            {DAY_NAMES.map((d) => (
              <span
                key={d}
                className="text-[10px] font-semibold text-center text-gray-500 dark:text-gray-400 py-1"
              >
                {d}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((d, i) => {
              if (d == null) return <span key={`e-${i}`} />;
              const dateStr = fmt(year, month, d);
              const isPast = dateStr < minimum;
              const isToday = dateStr === today;
              const isSelected = dateStr === value;
              const base =
                "w-8 h-8 flex items-center justify-center text-xs rounded-full transition-colors";
              const cls = isSelected
                ? "bg-blue-600 text-white font-semibold"
                : isPast
                  ? "text-gray-400 dark:text-gray-600 cursor-not-allowed"
                  : isToday
                    ? "ring-1 ring-blue-400 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                    : "text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5";
              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => !isPast && pickDay(d)}
                  disabled={isPast}
                  className={`${base} ${cls}`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

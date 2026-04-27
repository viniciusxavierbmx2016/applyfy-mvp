"use client";

import { useEffect, useRef, useState } from "react";
import { MiniCalendar } from "./mini-calendar";

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
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
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
      if (customStart) start = startOfDay(parseLocalDate(customStart));
      if (customEnd) end = endOfDay(parseLocalDate(customEnd));
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

function calcMonths(startDate: string, endDate: string) {
  const startD = parseLocalDate(startDate);
  const endD = parseLocalDate(endDate);
  const left = { year: startD.getFullYear(), month: startD.getMonth() };
  const sameMonth = endD.getMonth() === startD.getMonth() && endD.getFullYear() === startD.getFullYear();
  const right = sameMonth
    ? startD.getMonth() + 1 > 11
      ? { year: startD.getFullYear() + 1, month: 0 }
      : { year: startD.getFullYear(), month: startD.getMonth() + 1 }
    : { year: endD.getFullYear(), month: endD.getMonth() };
  return { left, right };
}

function navigateMonth(prev: { year: number; month: number }, delta: number) {
  let m = prev.month + delta;
  let y = prev.year;
  if (m < 0) { m = 11; y--; }
  if (m > 11) { m = 0; y++; }
  return { year: y, month: m };
}

interface DateRangeSelectorProps {
  value: DateRangeValue;
  onChange: (v: DateRangeValue) => void;
}

export function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [tempOption, setTempOption] = useState<DateRangeOption>(value.option);
  const [tempStart, setTempStart] = useState(value.startDate);
  const [tempEnd, setTempEnd] = useState(value.endDate);
  const [selectingStart, setSelectingStart] = useState(true);
  const [leftMonth, setLeftMonth] = useState(() => calcMonths(value.startDate, value.endDate).left);
  const [rightMonth, setRightMonth] = useState(() => calcMonths(value.startDate, value.endDate).right);
  const [mobileCustomStart, setMobileCustomStart] = useState("");
  const [mobileCustomEnd, setMobileCustomEnd] = useState("");

  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setTempOption(value.option);
    setTempStart(value.startDate);
    setTempEnd(value.endDate);
    setSelectingStart(true);
    const months = calcMonths(value.startDate, value.endDate);
    setLeftMonth(months.left);
    setRightMonth(months.right);
    setMobileCustomStart(value.option === "custom" ? value.startDate : "");
    setMobileCustomEnd(value.option === "custom" ? value.endDate : "");
  }, [open]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function handlePresetClick(opt: DateRangeOption) {
    if (opt === "custom") {
      setTempOption("custom");
      setSelectingStart(true);
      setMobileCustomStart(tempStart);
      setMobileCustomEnd(tempEnd);
      return;
    }
    onChange(computeRange(opt));
    setOpen(false);
  }

  function handleDayClick(date: string) {
    setTempOption("custom");
    if (selectingStart) {
      setTempStart(date);
      setTempEnd(date);
      setSelectingStart(false);
    } else {
      let s = tempStart;
      let e = date;
      if (e < s) { [s, e] = [e, s]; }
      setTempStart(s);
      setTempEnd(e);
      setSelectingStart(true);
    }
  }

  function handleApply() {
    if (tempOption === "custom") {
      onChange(computeRange("custom", tempStart, tempEnd));
    } else {
      onChange(computeRange(tempOption));
    }
    setOpen(false);
  }

  function handleMobileApply() {
    if (tempOption === "custom") {
      const s = mobileCustomStart || tempStart;
      const e = mobileCustomEnd || tempEnd;
      onChange(computeRange("custom", s, e));
    } else {
      onChange(computeRange(tempOption));
    }
    setOpen(false);
  }

  function handleCancel() {
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm font-medium text-gray-900 dark:text-white hover:border-gray-300 dark:hover:border-white/20 transition min-w-[180px]"
      >
        <FunnelIcon className="w-4 h-4 text-gray-500" />
        <span className="flex-1 text-left truncate">{value.label}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-gray-950 border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden sm:min-w-[720px]">
          {/* Mobile: presets only */}
          <div className="sm:hidden">
            <div className="py-2 max-h-[60vh] overflow-y-auto">
              {OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => handlePresetClick(o.id)}
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                    tempOption === o.id
                      ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    tempOption === o.id ? "border-blue-500" : "border-gray-300 dark:border-gray-600"
                  }`}>
                    {tempOption === o.id && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                  </div>
                  {o.label}
                </button>
              ))}
            </div>
            {tempOption === "custom" && (
              <div className="border-t border-gray-200 dark:border-white/10 p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wider text-gray-500">
                    De
                    <input
                      type="date"
                      value={mobileCustomStart}
                      onChange={(e) => setMobileCustomStart(e.target.value)}
                      className="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-white/10 rounded-md px-2 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wider text-gray-500">
                    Até
                    <input
                      type="date"
                      value={mobileCustomEnd}
                      onChange={(e) => setMobileCustomEnd(e.target.value)}
                      className="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-white/10 rounded-md px-2 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                    />
                  </label>
                </div>
              </div>
            )}
            <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-gray-200 dark:border-white/5">
              <button type="button" onClick={handleCancel} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                Cancelar
              </button>
              <button type="button" onClick={handleMobileApply} className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
                Aplicar
              </button>
            </div>
          </div>

          {/* Desktop: presets + calendars */}
          <div className="hidden sm:flex sm:flex-col">
            <div className="flex">
              {/* Presets */}
              <div className="w-[180px] border-r border-gray-200 dark:border-white/5 py-2 max-h-[400px] overflow-y-auto">
                {OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => handlePresetClick(o.id)}
                    className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors ${
                      tempOption === o.id
                        ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      tempOption === o.id ? "border-blue-500" : "border-gray-300 dark:border-gray-600"
                    }`}>
                      {tempOption === o.id && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                    </div>
                    {o.label}
                  </button>
                ))}
              </div>

              {/* Calendars */}
              <div className="flex gap-0 p-4">
                <MiniCalendar
                  year={leftMonth.year}
                  month={leftMonth.month}
                  rangeStart={tempStart}
                  rangeEnd={tempEnd}
                  onDayClick={handleDayClick}
                  onPrevMonth={() => setLeftMonth((p) => navigateMonth(p, -1))}
                  onNextMonth={() => setLeftMonth((p) => navigateMonth(p, 1))}
                />
                <div className="w-px bg-gray-200 dark:bg-white/5 mx-3" />
                <MiniCalendar
                  year={rightMonth.year}
                  month={rightMonth.month}
                  rangeStart={tempStart}
                  rangeEnd={tempEnd}
                  onDayClick={handleDayClick}
                  onPrevMonth={() => setRightMonth((p) => navigateMonth(p, -1))}
                  onNextMonth={() => setRightMonth((p) => navigateMonth(p, 1))}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-gray-200 dark:border-white/5">
              <button type="button" onClick={handleCancel} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                Cancelar
              </button>
              <button type="button" onClick={handleApply} className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

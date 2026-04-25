"use client";

import { useEffect, useRef, useState } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  icon?: React.ReactNode;
  className?: string;
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

export function CustomSelect({ value, onChange, options, placeholder, icon, className = "" }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleClose() {
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("scroll", handleClose, true);
    window.addEventListener("resize", handleClose);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("scroll", handleClose, true);
      window.removeEventListener("resize", handleClose);
    };
  }, [open]);

  function handleToggle() {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setOpen((v) => !v);
  }

  const selected = options.find((o) => o.value === value);
  const label = selected?.label || placeholder || "Selecione...";

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className="inline-flex items-center gap-2 w-full bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white hover:border-gray-300 dark:hover:border-white/20 transition"
      >
        {icon && <span className="text-gray-500 flex-shrink-0">{icon}</span>}
        <span className="flex-1 text-left truncate">{label}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
          className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-950 shadow-xl overflow-hidden"
        >
          <ul className="py-1 max-h-[min(60vh,320px)] overflow-y-auto">
            {options.map((o) => {
              const active = value === o.value;
              return (
                <li key={o.value}>
                  <button
                    type="button"
                    onClick={() => { onChange(o.value); setOpen(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                      active
                        ? "text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-500/5"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                    }`}
                  >
                    <span className="w-4 inline-flex justify-center flex-shrink-0">
                      {active && <CheckIcon className="w-3.5 h-3.5" />}
                    </span>
                    <span className="truncate">{o.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

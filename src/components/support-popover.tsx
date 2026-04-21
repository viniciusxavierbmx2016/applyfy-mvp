"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { formatPhoneDisplay, formatWhatsappLink } from "@/lib/utils";

interface Props {
  email?: string | null;
  whatsapp?: string | null;
  triggerClassName?: string;
  label?: string;
  align?: "left" | "right";
  collapsed?: boolean;
  openUpward?: boolean;
}

export function SupportPopover({
  email,
  whatsapp,
  triggerClassName,
  label = "Suporte",
  align = "left",
  collapsed = false,
  openUpward = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (!email && !whatsapp) return null;

  const waHref = formatWhatsappLink(whatsapp);
  const waDisplay = formatPhoneDisplay(whatsapp);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "group relative inline-flex items-center gap-3 rounded-[10px] text-[14px] font-medium transition-colors duration-200",
          triggerClassName
        )}
      >
        <span className={cn(
          "flex-shrink-0 transition-colors duration-200 text-gray-400 dark:text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white",
          collapsed && "lg:mx-auto"
        )}>
          <HeadphonesIcon className="w-[18px] h-[18px]" />
        </span>
        <span className={cn("truncate", collapsed && "lg:hidden")}>{label}</span>
        {collapsed && (
          <span className="hidden lg:group-hover:block absolute left-full ml-2 px-2 py-1 text-xs rounded-md bg-gray-900 dark:bg-gray-800 text-white whitespace-nowrap z-50 pointer-events-none shadow-lg">
            {label}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute z-50 min-w-[250px] max-w-[300px] rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-xl overflow-hidden",
            collapsed
              ? "left-full ml-2 bottom-0"
              : openUpward
                ? cn("bottom-full mb-2", align === "right" ? "right-0" : "left-0")
                : cn("top-full mt-2", align === "right" ? "right-0" : "left-0")
          )}
        >
          <div className="px-3 py-2 text-[11px] font-semibold tracking-[0.14em] uppercase text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-white/5">
            Canais de suporte
          </div>
          <ul className="py-1">
            {email && (
              <li>
                <a
                  href={`mailto:${email}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition"
                >
                  <span className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 inline-flex items-center justify-center flex-shrink-0">
                    <EmailIcon />
                  </span>
                  <span className="min-w-0 truncate" title={email}>{email}</span>
                </a>
              </li>
            )}
            {waHref && (
              <li>
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition"
                >
                  <span className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 inline-flex items-center justify-center flex-shrink-0">
                    <PhoneIcon />
                  </span>
                  <span className="min-w-0 truncate" title={waDisplay}>{waDisplay}</span>
                </a>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export function HeadphonesIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
    >
      <path d="M4 4h16c1.1 0 2 .9 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

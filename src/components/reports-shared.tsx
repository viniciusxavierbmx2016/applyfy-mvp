"use client";

import type { ReactNode } from "react";

/* ─────────────────────────────────────────────────────────────
   Shared visual primitives for the analytics redesign.
   Light/dark switchable to match the rest of the producer
   dashboard (bg-white dark:bg-card etc.). Icons are passed
   as ReactNode — codebase convention is inline SVGs.
───────────────────────────────────────────────────────────── */

// Respect producer theme. Components inside the producer dashboard inherit
// --producer-primary; the hex fallback covers anywhere the var isn't set.
const ACCENT = "var(--producer-primary, #3b82f6)";

// ─── Helpers ───

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function daysSince(date: string | Date | null | undefined): number {
  if (!date) return 0;
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    const t = d.getTime();
    if (Number.isNaN(t)) return 0;
    return Math.max(0, Math.floor((Date.now() - t) / 86400000));
  } catch {
    return 0;
  }
}

export function getInitials(name: string): string {
  if (!name) return "?";
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

const AVATAR_PALETTE = [
  "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
  "bg-amber-500/20 text-amber-700 dark:text-amber-300",
  "bg-purple-500/20 text-purple-700 dark:text-purple-300",
  "bg-rose-500/20 text-rose-700 dark:text-rose-300",
  "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300",
  "bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-300",
  "bg-orange-500/20 text-orange-700 dark:text-orange-300",
] as const;

export function getAvatarColor(index: number): string {
  const i = ((index % AVATAR_PALETTE.length) + AVATAR_PALETTE.length) %
    AVATAR_PALETTE.length;
  return AVATAR_PALETTE[i];
}

// ─── Default icons ───

function DownloadIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

// ─── Section ───

interface SectionProps {
  title: string;
  icon?: ReactNode;
  iconColor?: string;
  description?: string;
  children: ReactNode;
  onExport?: () => void;
  exportLabel?: string;
}

export function Section({
  title,
  icon,
  iconColor = ACCENT,
  description,
  children,
  onExport,
  exportLabel = "Exportar CSV",
}: SectionProps) {
  return (
    <section className="rounded-2xl border bg-white dark:bg-card border-gray-200 dark:border-white/[0.06] p-6 sm:p-7">
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div className="flex items-start gap-3 min-w-0">
          {icon ? (
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{
                backgroundColor: `color-mix(in oklab, ${iconColor} 10%, transparent)`,
                color: iconColor,
              }}
            >
              {icon}
            </div>
          ) : null}
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
              {title}
            </h2>
            {description ? (
              <p className="text-sm mt-1 leading-relaxed text-gray-600 dark:text-gray-400">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {onExport ? (
          <button
            type="button"
            onClick={onExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition border shrink-0 self-start sm:self-auto text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/[0.06] hover:bg-gray-50 dark:hover:bg-white/[0.02] hover:text-gray-900 dark:hover:text-white"
          >
            <DownloadIcon />
            {exportLabel}
          </button>
        ) : null}
      </header>
      <div>{children}</div>
    </section>
  );
}

// ─── KpiCard ───

interface KpiCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  sub?: string;
  valueColor?: string;
}

export function KpiCard({
  label,
  value,
  icon,
  sub,
  valueColor,
}: KpiCardProps) {
  return (
    <div className="rounded-xl border bg-white dark:bg-card border-gray-200 dark:border-white/[0.06] p-5">
      <div className="flex items-center gap-2 mb-3">
        {icon ? (
          <span className="w-5 h-5 inline-flex items-center justify-center text-gray-600 dark:text-gray-400">
            {icon}
          </span>
        ) : null}
        <span className="text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400">
          {label}
        </span>
      </div>
      <div
        className="text-3xl font-bold tabular-nums tracking-tight leading-none text-gray-900 dark:text-white"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </div>
      {sub ? (
        <div className="text-xs mt-2 text-gray-400 dark:text-gray-500">
          {sub}
        </div>
      ) : null}
    </div>
  );
}

// ─── AlertRow ───

interface AlertRowProps {
  label: string;
  description: string;
  count: number;
  dotColor: string;
}

export function AlertRow({ label, description, count, dotColor }: AlertRowProps) {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5 rounded-lg border bg-gray-50 dark:bg-white/[0.02] border-gray-200 dark:border-white/[0.06]">
      <span
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ backgroundColor: dotColor, boxShadow: `0 0 12px ${dotColor}` }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold truncate text-gray-900 dark:text-white">
          {label}
        </div>
        <div className="text-xs mt-0.5 text-gray-600 dark:text-gray-400">
          {description}
        </div>
      </div>
      <div
        className="text-2xl font-bold tabular-nums tracking-tight shrink-0"
        style={{ color: dotColor }}
      >
        {count}
      </div>
    </div>
  );
}

// ─── ProgressRow ───

interface ProgressRowProps {
  label: string;
  value: number;
  max: number;
  color?: string;
  displayValue?: string;
}

export function ProgressRow({
  label,
  value,
  max,
  color = ACCENT,
  displayValue,
}: ProgressRowProps) {
  const safeMax = max > 0 ? max : 1;
  const pct = Math.max(0, Math.min(100, (value / safeMax) * 100));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium truncate text-gray-900 dark:text-white">
          {label}
        </span>
        <span
          className="text-sm font-semibold tabular-nums shrink-0"
          style={{ color }}
        >
          {displayValue ?? `${value}/${max}`}
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-white/[0.05]">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${Math.max(2, pct)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ─── StudentRow ───

type BadgeVariant = "success" | "warning" | "danger" | "neutral";

interface StudentRowProps {
  name: string;
  email: string;
  avatarColor?: string;
  stats?: { label: string; value: string }[];
  badge?: { text: string; variant: BadgeVariant };
  actions?: ReactNode;
}

const BADGE_STYLES: Record<BadgeVariant, string> = {
  success:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20",
  warning:
    "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20",
  danger:
    "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20",
  neutral:
    "bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10",
};

export function StudentRow({
  name,
  email,
  avatarColor,
  stats,
  badge,
  actions,
}: StudentRowProps) {
  const initials = getInitials(name);
  const avatarCls = avatarColor ?? AVATAR_PALETTE[0];
  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-4 px-4 py-3.5 rounded-lg border border-gray-200 dark:border-white/[0.06] transition hover:bg-gray-50 dark:hover:bg-white/[0.02]">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span
          className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm shrink-0 ${avatarCls}`}
        >
          {initials}
        </span>
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate text-gray-900 dark:text-white">
            {name}
          </div>
          <div className="text-xs truncate text-gray-600 dark:text-gray-400">
            {email}
          </div>
        </div>
      </div>
      {stats && stats.length > 0 ? (
        <div className="flex items-center gap-5 sm:gap-6 lg:gap-8 shrink-0 lg:ml-auto">
          {stats.map((s) => (
            <div key={s.label} className="min-w-0">
              <div className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {s.label}
              </div>
              <div className="text-sm font-semibold tabular-nums mt-0.5 truncate text-gray-900 dark:text-white">
                {s.value}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {badge ? (
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide shrink-0 ${BADGE_STYLES[badge.variant]}`}
        >
          {badge.text}
        </span>
      ) : null}
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}

// ─── LessonRow ───

interface LessonRowProps {
  title: string;
  moduleName: string;
  percentage: number;
  barColor?: string;
}

export function LessonRow({
  title,
  moduleName,
  percentage,
  barColor = ACCENT,
}: LessonRowProps) {
  const pct = Math.max(0, Math.min(100, percentage));
  return (
    <div className="flex items-center gap-4 px-4 py-3 rounded-lg transition hover:bg-gray-50 dark:hover:bg-white/[0.02]">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold truncate text-gray-900 dark:text-white">
          {title}
        </div>
        <div className="text-xs truncate mt-0.5 text-gray-600 dark:text-gray-400">
          {moduleName}
        </div>
        <div className="h-1 mt-2 rounded-full overflow-hidden bg-gray-200 dark:bg-white/[0.05]">
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{ width: `${Math.max(2, pct)}%`, backgroundColor: barColor }}
          />
        </div>
      </div>
      <span
        className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold tabular-nums shrink-0 border"
        style={{
          backgroundColor: `color-mix(in oklab, ${barColor} 10%, transparent)`,
          color: barColor,
          borderColor: `color-mix(in oklab, ${barColor} 20%, transparent)`,
        }}
      >
        {pct}%
      </span>
    </div>
  );
}

// ─── EmptyState ───

interface EmptyStateProps {
  icon?: ReactNode;
  message: string;
}

export function EmptyState({ icon, message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      {icon ? (
        <div className="w-12 h-12 mb-3 inline-flex items-center justify-center text-gray-400 dark:text-gray-500">
          {icon}
        </div>
      ) : null}
      <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
    </div>
  );
}

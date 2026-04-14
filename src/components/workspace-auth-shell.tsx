"use client";

import { ReactNode } from "react";

export type LoginLayout = "central" | "lateral-left" | "lateral-right";

export interface WorkspaceAuthInfo {
  slug: string;
  name: string;
  logoUrl: string | null;
  loginLayout?: LoginLayout | null;
  loginBgImageUrl?: string | null;
  loginBgColor?: string | null;
  loginPrimaryColor?: string | null;
  loginLogoUrl?: string | null;
  loginTitle?: string | null;
  loginSubtitle?: string | null;
  loginBoxColor?: string | null;
  loginBoxOpacity?: number | null;
  loginSideColor?: string | null;
}

const DEFAULT_BG = "#0f172a";
const DEFAULT_PRIMARY = "#3b82f6";
const DEFAULT_BOX = "#1e293b";
const DEFAULT_BOX_OPACITY = 0.8;
const DEFAULT_SIDE = "#0f172a";
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function hexToRgba(hex: string, alpha: number): string {
  if (!HEX_RE.test(hex)) return `rgba(30, 41, 59, ${alpha})`;
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function darken(hex: string, amount = 0.1): string {
  if (!HEX_RE.test(hex)) return hex;
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((n >> 16) & 0xff) * (1 - amount));
  const g = clamp(((n >> 8) & 0xff) * (1 - amount));
  const b = clamp((n & 0xff) * (1 - amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export function getLoginTheme(ws: WorkspaceAuthInfo | null) {
  const layout: LoginLayout =
    (ws?.loginLayout as LoginLayout) || "central";
  const bgColor =
    ws?.loginBgColor && HEX_RE.test(ws.loginBgColor)
      ? ws.loginBgColor
      : DEFAULT_BG;
  const primaryColor =
    ws?.loginPrimaryColor && HEX_RE.test(ws.loginPrimaryColor)
      ? ws.loginPrimaryColor
      : DEFAULT_PRIMARY;
  const primaryHover = darken(primaryColor, 0.12);
  const boxColor =
    ws?.loginBoxColor && HEX_RE.test(ws.loginBoxColor)
      ? ws.loginBoxColor
      : DEFAULT_BOX;
  const boxOpacity =
    typeof ws?.loginBoxOpacity === "number" &&
    ws.loginBoxOpacity >= 0 &&
    ws.loginBoxOpacity <= 1
      ? ws.loginBoxOpacity
      : DEFAULT_BOX_OPACITY;
  const sideColor =
    ws?.loginSideColor && HEX_RE.test(ws.loginSideColor)
      ? ws.loginSideColor
      : DEFAULT_SIDE;
  const boxBackground = hexToRgba(boxColor, boxOpacity);
  return {
    layout,
    bgColor,
    primaryColor,
    primaryHover,
    boxColor,
    boxOpacity,
    boxBackground,
    sideColor,
    bgImageUrl: ws?.loginBgImageUrl || null,
    logoUrl: ws?.loginLogoUrl || ws?.logoUrl || null,
    name: ws?.name || "Workspace",
  };
}

export function WorkspaceAuthShell({
  ws,
  title,
  subtitle,
  children,
  footer,
}: {
  ws: WorkspaceAuthInfo | null;
  title?: string | null;
  subtitle?: string | null;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const theme = getLoginTheme(ws);
  const displayTitle = title || ws?.loginTitle || theme.name;
  const displaySubtitle =
    subtitle || ws?.loginSubtitle || "Acesse sua conta";

  const bgStyle: React.CSSProperties = theme.bgImageUrl
    ? {
        backgroundImage: `url(${theme.bgImageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : { backgroundColor: theme.bgColor };

  const sidePaneStyle: React.CSSProperties = {
    backgroundColor: theme.sideColor,
  };

  const formCard = (
    <FormCard
      logoUrl={theme.logoUrl}
      name={theme.name}
      title={displayTitle}
      subtitle={displaySubtitle}
      boxBackground={theme.boxBackground}
    >
      {children}
      {footer}
    </FormCard>
  );

  if (theme.layout === "central") {
    return (
      <ThemedRoot primary={theme.primaryColor} hover={theme.primaryHover}>
        <div
          className="relative min-h-screen flex items-center justify-center px-4 py-10"
          style={bgStyle}
        >
          {theme.bgImageUrl && (
            <div className="absolute inset-0 bg-black/55" aria-hidden />
          )}
          <div className="relative w-full max-w-md">{formCard}</div>
        </div>
      </ThemedRoot>
    );
  }

  const formOnLeft = theme.layout === "lateral-left";
  const imagePane = (
    <div
      className="relative hidden lg:block lg:w-1/2 min-h-screen"
      style={bgStyle}
    >
      {theme.bgImageUrl && (
        <div className="absolute inset-0 bg-black/30" aria-hidden />
      )}
    </div>
  );

  const formPane = (
    <div
      className="relative flex items-center justify-center w-full lg:w-1/2 min-h-screen px-4 py-10"
      style={sidePaneStyle}
    >
      {/* On mobile, show bg image behind form for visual consistency */}
      {theme.bgImageUrl && (
        <div
          className="lg:hidden absolute inset-0"
          style={bgStyle}
          aria-hidden
        />
      )}
      {theme.bgImageUrl && (
        <div className="lg:hidden absolute inset-0 bg-black/55" aria-hidden />
      )}
      <div className="relative w-full max-w-md">{formCard}</div>
    </div>
  );

  return (
    <ThemedRoot primary={theme.primaryColor} hover={theme.primaryHover}>
      <div className="min-h-screen flex flex-col lg:flex-row">
        {formOnLeft ? (
          <>
            {formPane}
            {imagePane}
          </>
        ) : (
          <>
            {imagePane}
            {formPane}
          </>
        )}
      </div>
    </ThemedRoot>
  );
}

function ThemedRoot({
  primary,
  hover,
  children,
}: {
  primary: string;
  hover: string;
  children: ReactNode;
}) {
  return (
    <div
      style={
        {
          ["--wa-primary" as string]: primary,
          ["--wa-primary-hover" as string]: hover,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}

function FormCard({
  logoUrl,
  name,
  title,
  subtitle,
  boxBackground,
  children,
}: {
  logoUrl: string | null;
  name: string;
  title: string;
  subtitle: string;
  boxBackground: string;
  children: ReactNode;
}) {
  return (
    <div
      className="backdrop-blur-xl border border-white/10 text-white shadow-2xl rounded-2xl p-7 sm:p-8"
      style={{ backgroundColor: boxBackground }}
    >
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center overflow-hidden mb-3 border border-white/10">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-2xl font-bold text-white">
              {name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-white/70 mt-1.5">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

export const authInputCls =
  "w-full px-4 py-3 bg-white/10 border border-white/15 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:bg-white/15 transition";

export const authInputStyle: React.CSSProperties = {
  // ring uses primary via tailwind focus — override with style
};

export const authLabelCls =
  "block text-sm font-medium text-white/80 mb-1";

export const authErrorCls =
  "mb-4 p-3 rounded-lg bg-red-500/15 border border-red-400/30 text-red-200 text-sm";

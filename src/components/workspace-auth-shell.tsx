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
  loginLinkColor?: string | null;
}

const DEFAULT_BG = "#0a0a1a";
const DEFAULT_PRIMARY = "#3b82f6";
const DEFAULT_BOX = "#1a1a2e";
const DEFAULT_BOX_OPACITY = 0.85;
const DEFAULT_SIDE = "#0a0a1a";
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

function lighten(hex: string, amount = 0.15): string {
  if (!HEX_RE.test(hex)) return hex;
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((n >> 16) & 0xff) + (255 - ((n >> 16) & 0xff)) * amount);
  const g = clamp(((n >> 8) & 0xff) + (255 - ((n >> 8) & 0xff)) * amount);
  const b = clamp((n & 0xff) + (255 - (n & 0xff)) * amount);
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
  const primaryLight = lighten(primaryColor, 0.18);
  const bgDeep = darken(bgColor, 0.35);
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
  const linkColor =
    ws?.loginLinkColor && HEX_RE.test(ws.loginLinkColor)
      ? ws.loginLinkColor
      : primaryColor;
  const boxBackground = hexToRgba(boxColor, boxOpacity);
  return {
    layout,
    bgColor,
    bgDeep,
    primaryColor,
    primaryHover,
    primaryLight,
    boxColor,
    boxOpacity,
    boxBackground,
    sideColor,
    linkColor,
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
    : {
        backgroundColor: theme.bgDeep,
        backgroundImage: `radial-gradient(ellipse 80% 60% at 20% 10%, ${theme.bgColor} 0%, transparent 55%), radial-gradient(ellipse 70% 60% at 85% 90%, ${theme.bgColor} 0%, transparent 55%), radial-gradient(ellipse 90% 90% at 50% 50%, ${theme.bgColor} 0%, ${theme.bgDeep} 90%)`,
      };

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
      <ThemedRoot
        primary={theme.primaryColor}
        hover={theme.primaryHover}
        light={theme.primaryLight}
      >
        <div
          className="relative min-h-screen flex items-center justify-center px-4 py-10"
          style={bgStyle}
        >
          {theme.bgImageUrl ? (
            <div className="absolute inset-0 bg-black/55" aria-hidden />
          ) : (
            <DotGrid />
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
      {!theme.bgImageUrl && <DotGrid />}
      <div className="relative w-full max-w-md">{formCard}</div>
    </div>
  );

  return (
    <ThemedRoot
      primary={theme.primaryColor}
      hover={theme.primaryHover}
      light={theme.primaryLight}
    >
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
  light,
  children,
}: {
  primary: string;
  hover: string;
  light: string;
  children: ReactNode;
}) {
  return (
    <div
      style={
        {
          ["--wa-primary" as string]: primary,
          ["--wa-primary-hover" as string]: hover,
          ["--wa-primary-light" as string]: light,
        } as React.CSSProperties
      }
    >
      <style>{`
        .wa-input {
          background-color: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .wa-input::placeholder { color: rgba(255,255,255,0.35); }
        .wa-input:focus {
          border-color: ${primary};
          box-shadow: 0 0 0 4px ${primary}33;
          background-color: rgba(255,255,255,0.08);
        }
        .wa-submit {
          background-image: linear-gradient(135deg, ${light}, ${primary});
        }
        .wa-submit:hover:not(:disabled) { filter: brightness(1.1); }
        .wa-submit:active:not(:disabled) { transform: scale(0.98); }
        .wa-link { color: ${primary}; }
        .wa-link:hover { text-decoration: underline; filter: brightness(1.15); }
      `}</style>
      {children}
    </div>
  );
}

function DotGrid() {
  return (
    <div
      className="absolute inset-0 pointer-events-none opacity-[0.15]"
      style={{
        backgroundImage:
          "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
        maskImage:
          "radial-gradient(ellipse 70% 60% at 50% 50%, black 40%, transparent 85%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 70% 60% at 50% 50%, black 40%, transparent 85%)",
      }}
      aria-hidden
    />
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
      className="text-white rounded-2xl p-8"
      style={{
        backgroundColor: boxBackground,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow:
          "0 25px 50px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.03) inset",
      }}
    >
      <div className="flex flex-col items-center text-center mb-6 gap-4">
        {logoUrl ? (
          <div
            className="w-16 h-16 rounded-2xl overflow-hidden border border-white/10"
            style={{ boxShadow: "0 8px 20px rgba(0,0,0,0.25)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt={name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
            style={{
              backgroundImage:
                "linear-gradient(135deg, var(--wa-primary-light), var(--wa-primary))",
              boxShadow:
                "0 10px 25px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.08) inset",
            }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-white leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

export const authInputCls =
  "wa-input w-full h-12 px-4 rounded-xl text-white text-sm focus:outline-none transition";

export const authInputStyle: React.CSSProperties = {};

export const authLabelCls =
  "block text-sm font-medium text-white/75 mb-1.5";

export const authErrorCls =
  "mb-4 p-3 rounded-xl bg-red-500/10 border border-red-400/25 text-red-200 text-sm";

export const authSubmitCls =
  "wa-submit w-full h-12 rounded-xl text-white font-semibold shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed";

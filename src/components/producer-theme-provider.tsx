"use client";

import { useEffect, useRef, createContext, useContext, useState, useCallback } from "react";
import { useTheme } from "next-themes";
import { darkenHex } from "@/lib/color-utils";

interface ThemeConfig {
  mode: string;
  primaryColor: string;
  secondaryColor: string;
  bgColor: string;
  headerColor: string;
  sidebarColor: string;
  cardColor: string;
  buttonTextColor: string;
}

const DEFAULTS: ThemeConfig = {
  mode: "dark",
  primaryColor: "#3b82f6",
  secondaryColor: "#1a1e2e",
  bgColor: "#0a0a1a",
  headerColor: "#0a0a1a",
  sidebarColor: "#0a0a1a",
  cardColor: "#111827",
  buttonTextColor: "#ffffff",
};

interface ThemeContextValue {
  theme: ThemeConfig;
  refresh: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULTS,
  refresh: () => {},
});

export function useProducerTheme() {
  return useContext(ThemeContext);
}

function applyTheme(t: ThemeConfig) {
  const root = document.documentElement;
  root.style.setProperty("--producer-primary", t.primaryColor);
  root.style.setProperty("--producer-primary-hover", darkenHex(t.primaryColor, 0.15));
  root.style.setProperty("--producer-secondary", t.secondaryColor);
  root.style.setProperty("--producer-bg", t.bgColor);
  root.style.setProperty("--producer-header", t.headerColor);
  root.style.setProperty("--producer-sidebar", t.sidebarColor);
  root.style.setProperty("--producer-card", t.cardColor);
  root.style.setProperty("--producer-button-text", t.buttonTextColor);
}

export function ProducerThemeProvider({
  children,
  initialTheme,
}: {
  children: React.ReactNode;
  initialTheme?: ThemeConfig;
}) {
  const [theme, setTheme] = useState<ThemeConfig>(initialTheme || DEFAULTS);
  const fetched = useRef(false);
  const { setTheme: setNextTheme } = useTheme();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/producer/theme");
      if (res.ok) {
        const data = await res.json();
        setTheme(data.theme);
        applyTheme(data.theme);
        if (data.theme.mode === "light" || data.theme.mode === "dark") {
          setNextTheme(data.theme.mode);
        }
      }
    } catch {}
  }, [setNextTheme]);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    // Se já recebeu tema do server, não precisa buscar de novo
    if (initialTheme && Object.keys(initialTheme).length > 2) return;
    refresh();
  }, [refresh, initialTheme]);

  return (
    <ThemeContext.Provider value={{ theme, refresh }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `:root{--producer-primary:${theme.primaryColor};--producer-primary-hover:${darkenHex(theme.primaryColor, 0.15)};--producer-secondary:${theme.secondaryColor};--producer-bg:${theme.bgColor};--producer-header:${theme.headerColor};--producer-sidebar:${theme.sidebarColor};--producer-card:${theme.cardColor};--producer-button-text:${theme.buttonTextColor};}`,
        }}
      />
      {children}
    </ThemeContext.Provider>
  );
}

"use client";

import { useEffect, useRef, createContext, useContext, useState, useCallback } from "react";

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
  primaryColor: "#6366F1",
  secondaryColor: "#1a1e2e",
  bgColor: "#0a0a1a",
  headerColor: "#0a0a1a",
  sidebarColor: "#0a0a1a",
  cardColor: "#0a0e19",
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
  root.style.setProperty("--producer-secondary", t.secondaryColor);
  root.style.setProperty("--producer-bg", t.bgColor);
  root.style.setProperty("--producer-header", t.headerColor);
  root.style.setProperty("--producer-sidebar", t.sidebarColor);
  root.style.setProperty("--producer-card", t.cardColor);
  root.style.setProperty("--producer-button-text", t.buttonTextColor);
}

export function ProducerThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULTS);
  const fetched = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/producer/theme");
      if (res.ok) {
        const data = await res.json();
        setTheme(data.theme);
        applyTheme(data.theme);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    refresh();
  }, [refresh]);

  return (
    <ThemeContext.Provider value={{ theme, refresh }}>
      {children}
    </ThemeContext.Provider>
  );
}

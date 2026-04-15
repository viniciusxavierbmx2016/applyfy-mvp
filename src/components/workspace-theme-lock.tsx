"use client";

import { createContext, useContext } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

const Ctx = createContext<{ locked: boolean }>({ locked: false });

export function useWorkspaceThemeLock() {
  return useContext(Ctx);
}

export function WorkspaceThemeLock({
  forceTheme,
  children,
}: {
  forceTheme: string | null;
  children: React.ReactNode;
}) {
  const locked = forceTheme === "light" || forceTheme === "dark";

  // When locked, nest a NextThemesProvider with `forcedTheme` so the forced
  // value is applied without touching localStorage — preserves the student's
  // own preference for non-locked workspaces. When unlocked, render children
  // unchanged so the root ThemeProvider (defaultTheme="dark") keeps control.
  const content = locked ? (
    <NextThemesProvider
      attribute="class"
      enableSystem={false}
      storageKey="applyfy-theme"
      forcedTheme={forceTheme as "light" | "dark"}
    >
      {children}
    </NextThemesProvider>
  ) : (
    children
  );

  return <Ctx.Provider value={{ locked }}>{content}</Ctx.Provider>;
}

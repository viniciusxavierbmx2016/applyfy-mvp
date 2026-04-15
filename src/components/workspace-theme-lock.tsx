"use client";

import { createContext, useContext, useEffect } from "react";
import { useTheme } from "next-themes";

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
  const { setTheme, resolvedTheme } = useTheme();
  const locked = forceTheme === "light" || forceTheme === "dark";

  useEffect(() => {
    if (locked && resolvedTheme !== forceTheme) {
      setTheme(forceTheme as "light" | "dark");
    }
  }, [locked, forceTheme, resolvedTheme, setTheme]);

  return <Ctx.Provider value={{ locked }}>{children}</Ctx.Provider>;
}

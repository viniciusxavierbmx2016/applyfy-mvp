"use client";

import { createContext, useContext, useEffect } from "react";

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

  useEffect(() => {
    if (!locked) return;
    const theme = forceTheme as "light" | "dark";
    const html = document.documentElement;

    // next-themes manages "class" (adds "light"/"dark"), "data-theme", and
    // `style.color-scheme`. We mirror all three so the forced theme wins
    // regardless of which hook the rest of the app reads from.
    const apply = () => {
      if (!html.classList.contains(theme)) {
        html.classList.remove("light", "dark");
        html.classList.add(theme);
      }
      if (html.getAttribute("data-theme") !== theme) {
        html.setAttribute("data-theme", theme);
      }
      if (html.style.colorScheme !== theme) {
        html.style.colorScheme = theme;
      }
    };

    apply();

    // Root ThemeProvider re-applies its own class on hydration, storage events,
    // and any setTheme call. Watch the <html> element and re-force on any
    // mutation to class / data-theme / style so the lock wins every round.
    const observer = new MutationObserver(() => apply());
    observer.observe(html, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "style"],
    });

    return () => {
      observer.disconnect();
      // Don't restore the previous class manually — the root ThemeProvider
      // will re-apply its own state (from localStorage) on the next render
      // when the lock unmounts, so any DOM change triggers its effect.
      html.classList.remove(theme);
    };
  }, [locked, forceTheme]);

  return <Ctx.Provider value={{ locked }}>{children}</Ctx.Provider>;
}

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/stores/user-store";
import { ThemeToggle } from "@/components/theme-toggle";
import { InstallPrompt } from "@/components/install-prompt";
import { NotificationsBell } from "@/components/notifications-bell";
import { PushOptIn } from "@/components/push-opt-in";

interface WorkspaceInfo {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  accentColor: string | null;
}

const COLLAPSED_KEY = "student_sidebar_collapsed";

const tooltipCls =
  "hidden lg:group-hover:block absolute left-full ml-2 px-2 py-1 text-xs rounded-md bg-gray-900 dark:bg-gray-800 text-white whitespace-nowrap z-50 pointer-events-none shadow-lg";

export function WorkspaceShell({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUserStore();
  const [ws, setWs] = useState<WorkspaceInfo | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [liveCount, setLiveCount] = useState(0);

  useEffect(() => {
    fetch(`/api/w/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setWs(d.workspace);
      });
  }, [slug]);

  useEffect(() => {
    const link = document.querySelector('link[rel="manifest"]');
    if (link) link.setAttribute("href", `/api/manifest/${slug}`);
    return () => {
      const link = document.querySelector('link[rel="manifest"]');
      if (link) link.setAttribute("href", "/manifest.json");
    };
  }, [slug]);

  useEffect(() => {
    if (!ws?.name) return;
    const meta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (meta) {
      const prev = meta.getAttribute("content");
      meta.setAttribute("content", ws.name);
      return () => { meta.setAttribute("content", prev || "Members Club"); };
    }
  }, [ws?.name]);

  useEffect(() => {
    if (!ws?.logoUrl) return;
    const icons = document.querySelectorAll('link[rel="apple-touch-icon"]');
    const originals = Array.from(icons).map((el) => ({
      el,
      href: el.getAttribute("href"),
    }));
    icons.forEach((el) => el.setAttribute("href", ws.logoUrl!));
    return () => {
      originals.forEach(({ el, href }) => {
        if (href) el.setAttribute("href", href);
      });
    };
  }, [ws?.logoUrl]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(COLLAPSED_KEY);
      if (saved === "1") setCollapsed(true);
    } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;
    function fetchLiveCount() {
      fetch(`/api/w/${slug}/lives`)
        .then((r) => (r.ok ? r.json() : { lives: [] }))
        .then((d) => {
          if (!cancelled) {
            const count = (d.lives || []).filter((l: { status: string }) => l.status === "LIVE").length;
            setLiveCount(count);
          }
        })
        .catch(() => {});
    }
    fetchLiveCount();
    const interval = setInterval(fetchLiveCount, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [slug]);

  function toggleCollapsed() {
    setCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  }

  const isAuthRoute =
    /^\/w\/[^/]+\/(login|register|forgot-password|reset-password)\/?$/.test(
      pathname || ""
    );

  if (isAuthRoute) {
    return <>{children}</>;
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace(`/w/${slug}/login`);
  }

  const displayName = ws?.name || "Workspace";
  const vitrineHref = `/w/${slug}`;
  const profileHref = `/w/${slug}/profile`;
  const isVitrine = pathname === vitrineHref || pathname === `${vitrineHref}/`;
  const isProfile = !!pathname?.startsWith(profileHref);

  const iconHome = (
    <svg
      width="18"
      height="18"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0h6"
      />
    </svg>
  );
  const iconProfile = (
    <svg
      width="18"
      height="18"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );

  const livesHref = `/w/${slug}/lives`;
  const isLives = !!pathname?.startsWith(livesHref);
  const iconLives = (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );

  const items = [
    { href: vitrineHref, label: "Vitrine", icon: iconHome, active: !!isVitrine, badge: 0 },
    { href: livesHref, label: "Lives", icon: iconLives, active: isLives, badge: liveCount },
    { href: profileHref, label: "Meu Perfil", icon: iconProfile, active: isProfile, badge: 0 },
  ];

  const accent = ws?.accentColor || null;

  function linkCls(active: boolean) {
    return cn(
      "group relative flex items-center gap-3 rounded-lg text-sm font-medium transition-colors duration-200",
      collapsed ? "lg:justify-center lg:p-2.5 py-2.5 px-3" : "py-2.5 px-3",
      active
        ? accent ? "" : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-white/5 dark:hover:text-white"
    );
  }

  function linkStyle(active: boolean): React.CSSProperties | undefined {
    if (!active || !accent) return undefined;
    return { color: accent, backgroundColor: `${accent}15` };
  }

  function iconWrapCls(active: boolean) {
    return cn(
      "flex-shrink-0 transition-colors duration-200",
      collapsed && "lg:mx-auto",
      active
        ? accent ? "" : "text-blue-600 dark:text-blue-400"
        : "text-gray-400 dark:text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white"
    );
  }

  function iconStyle(active: boolean): React.CSSProperties | undefined {
    if (!active || !accent) return undefined;
    return { color: accent };
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-white/5">
        <div className="px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="lg:hidden p-2 -ml-2 text-gray-600 dark:text-gray-300"
              aria-label="Menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
              {ws?.logoUrl ? (
                <Image
                  src={ws.logoUrl}
                  alt={displayName}
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm font-bold text-gray-800 dark:text-white">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <h1 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {displayName}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationsBell />
            <Link
              href={profileHref}
              className="hidden sm:flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white max-w-[180px]"
            >
              {user?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt={user.name || ""}
                  className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <span className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-xs font-semibold text-gray-700 dark:text-gray-200 flex-shrink-0">
                  {(user?.name || "?").charAt(0).toUpperCase()}
                </span>
              )}
              <span className="truncate">{user?.name?.split(" ")[0] || ""}</span>
            </Link>
            <button
              onClick={handleLogout}
              className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-2 sm:px-3 py-1.5 rounded-lg"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        {menuOpen && (
          <div
            className="fixed inset-0 top-14 z-30 bg-black/40 lg:hidden"
            onClick={() => setMenuOpen(false)}
          />
        )}
        <aside
          className={cn(
            "fixed lg:sticky top-14 lg:top-14 left-0 z-40 flex flex-col",
            "h-[calc(100vh-3.5rem)]",
            "border-r border-gray-200 dark:border-white/5",
            "bg-white dark:bg-gray-900",
            "transform transition-[width,transform] duration-300 ease-in-out",
            "lg:translate-x-0",
            "w-64",
            collapsed ? "lg:w-16" : "lg:w-56",
            menuOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {/* Topo da sidebar com botão de colapsar */}
          <div
            className={cn(
              "relative border-b border-gray-200 dark:border-white/5",
              collapsed ? "lg:h-12 h-12" : "h-12"
            )}
          >
            {!collapsed && (
              <button
                onClick={toggleCollapsed}
                aria-label="Recolher menu"
                className={cn(
                  "hidden lg:flex absolute top-1/2 -translate-y-1/2 right-3 items-center justify-center w-6 h-6 rounded-full",
                  "bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10",
                  "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white",
                  "transition-colors duration-200"
                )}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            {collapsed && (
              <div className="hidden lg:flex items-center justify-center h-full">
                <button
                  onClick={toggleCollapsed}
                  aria-label="Expandir menu"
                  className={cn(
                    "group relative flex items-center justify-center w-7 h-7 rounded-full",
                    "bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10",
                    "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white",
                    "transition-colors duration-200"
                  )}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className={tooltipCls}>Expandir menu</span>
                </button>
              </div>
            )}
            <button
              onClick={() => setMenuOpen(false)}
              className="lg:hidden absolute top-1/2 -translate-y-1/2 right-3 text-gray-500 hover:text-gray-900 dark:hover:text-white"
              aria-label="Fechar menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Nav */}
          <nav
            className={cn(
              "flex-1 flex flex-col gap-1 py-3 overflow-y-auto",
              collapsed ? "lg:px-2 px-3" : "px-3"
            )}
          >
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                title={item.label}
                className={linkCls(item.active)}
                style={linkStyle(item.active)}
              >
                <span className={cn("relative", iconWrapCls(item.active))} style={iconStyle(item.active)}>
                  {item.icon}
                  {item.badge > 0 && collapsed && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </span>
                <span className={cn("truncate", collapsed && "lg:hidden")}>
                  {item.label}
                </span>
                {item.badge > 0 && !collapsed && (
                  <span className="ml-auto w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center animate-pulse flex-shrink-0">
                    {item.badge}
                  </span>
                )}
                {collapsed && <span className={tooltipCls}>{item.label}</span>}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-w-0">
          <PushOptIn />
          {children}
        </main>
      </div>
      <InstallPrompt />
    </div>
  );
}

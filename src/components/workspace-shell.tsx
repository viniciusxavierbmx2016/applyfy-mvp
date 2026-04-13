"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUserStore } from "@/stores/user-store";

interface WorkspaceInfo {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
}

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

  useEffect(() => {
    fetch(`/api/w/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setWs(d.workspace));
  }, [slug]);

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
  const isVitrine = pathname === vitrineHref || pathname === `${vitrineHref}/`;
  const isProfile = pathname?.startsWith("/profile");

  const navLink = (href: string, label: string, icon: React.ReactNode, active: boolean) => (
    <Link
      href={href}
      onClick={() => setMenuOpen(false)}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
        active
          ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
      }`}
    >
      <span className="w-5 h-5 flex-shrink-0">{icon}</span>
      {label}
    </Link>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
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
            <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
              {ws?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ws.logoUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-gray-800 dark:text-white">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <h1 className="text-base font-semibold text-gray-900 dark:text-white truncate">
              {displayName}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="p-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white rounded-lg"
              aria-label="Notificações"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .53-.21 1.04-.59 1.41L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            <div className="hidden sm:block text-sm text-gray-700 dark:text-gray-300 truncate max-w-[140px]">
              {user?.name?.split(" ")[0] || ""}
            </div>
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
        <aside
          className={`fixed lg:static inset-y-0 left-0 top-16 lg:top-0 z-20 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-transform lg:transform-none ${
            menuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <nav className="p-3 space-y-1 lg:sticky lg:top-16">
            {navLink(
              vitrineHref,
              "Vitrine",
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0h6" />
              </svg>,
              !!isVitrine
            )}
            {navLink(
              "/profile",
              "Meu Perfil",
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>,
              !!isProfile
            )}
          </nav>
        </aside>

        {menuOpen && (
          <div
            className="fixed inset-0 top-16 z-10 bg-black/40 lg:hidden"
            onClick={() => setMenuOpen(false)}
          />
        )}

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/stores/user-store";
import { useActiveWorkspace } from "@/hooks/use-active-workspace";
import { WorkspaceSwitcher } from "./workspace-switcher";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

type NavLink = {
  href: string;
  label: string;
  icon: React.ReactNode;
  requires?: string;
};

const COLLAPSED_KEY = "admin_sidebar_collapsed";

const iconCls = "w-[18px] h-[18px]";

const iconHome = (
  <svg className={iconCls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);
const iconProfile = (
  <svg className={iconCls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);
const iconDashboard = (
  <svg className={iconCls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);
const iconCourses = (
  <svg className={iconCls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);
const iconUsers = (
  <svg className={iconCls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);
const iconAnalytics = (
  <svg className={iconCls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3v18h18M7 15l3-3 3 3 5-5" />
  </svg>
);
const iconCommunity = (
  <svg className={iconCls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
  </svg>
);
const iconIntegrations = (
  <svg className={iconCls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);
const iconWorkspaces = (
  <svg className={iconCls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const iconBriefcase = (
  <svg className={iconCls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);
const iconSettings = (
  <svg className={iconCls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <circle cx="12" cy="12" r="3" strokeWidth={2} />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const studentLinks: NavLink[] = [
  { href: "/", label: "Vitrine", icon: iconHome },
  { href: "/profile", label: "Meu Perfil", icon: iconProfile },
];

const producerLinks: NavLink[] = [
  { href: "/producer", label: "Dashboard", icon: iconDashboard },
  { href: "/producer/workspaces", label: "Workspaces", icon: iconWorkspaces },
  { href: "/producer/courses", label: "Meus Cursos", icon: iconCourses },
  { href: "/producer/users", label: "Meus Alunos", icon: iconUsers },
  { href: "/producer/community", label: "Comunidade", icon: iconCommunity },
  { href: "/producer/analytics", label: "Relatórios", icon: iconAnalytics },
  { href: "/producer/collaborators", label: "Colaboradores", icon: iconUsers },
  { href: "/producer/integrations", label: "Integrações", icon: iconIntegrations },
  { href: "/producer/settings", label: "Configurações", icon: iconSettings },
];

const collaboratorLinks: NavLink[] = [
  { href: "/producer", label: "Dashboard", icon: iconDashboard },
  {
    href: "/producer/courses",
    label: "Cursos",
    icon: iconCourses,
    requires: "MANAGE_LESSONS",
  },
  {
    href: "/producer/users",
    label: "Alunos",
    icon: iconUsers,
    requires: "MANAGE_STUDENTS",
  },
  {
    href: "/producer/community",
    label: "Comunidade",
    icon: iconCommunity,
    requires: "MANAGE_COMMUNITY",
  },
  {
    href: "/producer/analytics",
    label: "Relatórios",
    icon: iconAnalytics,
    requires: "VIEW_ANALYTICS",
  },
];

const adminLinks: NavLink[] = [
  { href: "/admin", label: "Dashboard", icon: iconDashboard },
  { href: "/admin/producers", label: "Produtores", icon: iconBriefcase },
  { href: "/admin/integrations", label: "Integrações", icon: iconIntegrations },
];

const tooltipCls =
  "hidden lg:group-hover:block absolute left-full ml-2 px-2 py-1 text-xs rounded-md bg-gray-900 dark:bg-gray-800 text-white whitespace-nowrap z-50 pointer-events-none shadow-lg";

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, collaborator } = useUserStore();
  const isAdmin = user?.role === "ADMIN";
  const isProducer = user?.role === "PRODUCER";
  const isCollaborator = user?.role === "COLLABORATOR";
  const activeWorkspace = useActiveWorkspace();
  const showVitrine = (isProducer || isCollaborator) && !!activeWorkspace;

  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(COLLAPSED_KEY);
      if (saved === "1") setCollapsed(true);
    } catch {}
  }, []);
  function toggleCollapsed() {
    setCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  }

  const collabPerms = collaborator?.permissions ?? [];
  const filteredCollabLinks = collaboratorLinks.filter(
    (l) => !l.requires || collabPerms.includes(l.requires)
  );

  const staffLinks = isAdmin
    ? adminLinks
    : isProducer
      ? producerLinks
      : isCollaborator
        ? filteredCollabLinks
        : null;
  const staffLabel = isAdmin
    ? "Admin"
    : isProducer
      ? "Produtor"
      : isCollaborator
        ? "Colaborador"
        : null;

  const isActive = (href: string) =>
    pathname === href ||
    (href !== "/admin" && href !== "/producer" && href !== "/" && pathname.startsWith(href));

  function linkCls(active: boolean) {
    return cn(
      "group relative flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200",
      collapsed ? "lg:justify-center lg:p-2.5 py-2.5 px-3" : "py-2.5 px-3",
      active
        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-white/5 dark:hover:text-white"
    );
  }

  function iconWrapCls(active: boolean) {
    return cn(
      "flex-shrink-0 transition-colors duration-200",
      collapsed && "lg:mx-auto",
      active
        ? "text-blue-600 dark:text-blue-400"
        : "text-gray-400 dark:text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white"
    );
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen w-64 flex flex-col",
          "bg-white dark:bg-gray-950",
          "border-r border-gray-200 dark:border-white/5",
          "transform transition-all duration-300 ease-in-out",
          "lg:translate-x-0 lg:sticky lg:top-0 lg:z-auto",
          collapsed ? "lg:w-16" : "lg:w-56",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Topo: logo/workspace switcher */}
        <div
          className={cn(
            "relative transition-all duration-300",
            collapsed
              ? "lg:flex lg:flex-col lg:items-center lg:gap-2 lg:pt-4 lg:px-2 flex h-16 items-center justify-between px-4"
              : "flex items-center pt-4 px-2.5 pb-2 justify-between gap-1.5"
          )}
        >
          {isProducer ? (
            <div
              className={cn(
                "min-w-0",
                collapsed ? "lg:flex lg:justify-center" : "flex-1 min-w-0"
              )}
            >
              <WorkspaceSwitcher
                collapsed={collapsed}
                onExpand={collapsed ? toggleCollapsed : undefined}
              />
            </div>
          ) : (
            <Link
              href="/"
              onClick={onClose}
              className={cn(
                "flex items-center",
                collapsed ? "lg:justify-center" : "flex-1"
              )}
              title="Applyfy"
            >
              {collapsed ? (
                <span className="hidden lg:flex w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white items-center justify-center text-sm font-bold shadow-sm">
                  A
                </span>
              ) : null}
              <span
                className={cn(
                  "text-xl font-bold text-gray-900 dark:text-white",
                  collapsed && "lg:hidden"
                )}
              >
                Applyfy
              </span>
            </Link>
          )}

          {/* Fechar mobile */}
          <button
            onClick={onClose}
            className={cn(
              "lg:hidden text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors flex-shrink-0",
              collapsed && "hidden"
            )}
            aria-label="Fechar menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Colapsar/expandir (desktop) */}
          <button
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
            className={cn(
              "group relative hidden lg:flex items-center justify-center w-7 h-7 rounded-md flex-shrink-0",
              "text-gray-400 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white",
              "hover:bg-gray-100 dark:hover:bg-white/5 transition-colors duration-200"
            )}
          >
            <svg
              className="w-[18px] h-[18px]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M9 4v16" strokeLinecap="round" />
            </svg>
            {collapsed && (
              <span className={tooltipCls}>Expandir menu</span>
            )}
          </button>
        </div>

        {/* Nav */}
        <nav
          className={cn(
            "flex-1 flex flex-col gap-0.5 pt-2 pb-4 overflow-y-auto px-3",
            collapsed && "lg:px-2"
          )}
        >
          {showVitrine && activeWorkspace && (
            <a
              href={`/w/${activeWorkspace.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              title="Ver vitrine"
              className={linkCls(false)}
            >
              <span className={iconWrapCls(false)}>
                <svg className={iconCls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </span>
              <span className={cn("truncate", collapsed && "lg:hidden")}>
                Ver vitrine
              </span>
              {collapsed && <span className={tooltipCls}>Ver vitrine</span>}
            </a>
          )}

          {!isCollaborator && !isAdmin && !isProducer && (
            <>
              <p
                className={cn(
                  "text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1 px-1",
                  collapsed && "lg:hidden"
                )}
              >
                Menu
              </p>
              {studentLinks.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={onClose}
                    title={link.label}
                    className={linkCls(active)}
                  >
                    <span className={iconWrapCls(active)}>{link.icon}</span>
                    <span className={cn("truncate", collapsed && "lg:hidden")}>
                      {link.label}
                    </span>
                    {collapsed && <span className={tooltipCls}>{link.label}</span>}
                  </Link>
                );
              })}
            </>
          )}

          {staffLinks && (
            <>
              {isProducer ? (
                <div
                  className={cn(
                    "my-2 border-t border-gray-200 dark:border-white/5",
                    !isCollaborator && !isAdmin ? "" : "hidden"
                  )}
                />
              ) : (
                <div
                  className={cn(
                    "pt-4 pb-1",
                    !isCollaborator && !isAdmin
                      ? "mt-2 border-t border-gray-200 dark:border-white/5"
                      : ""
                  )}
                >
                  <p
                    className={cn(
                      "text-xs font-semibold uppercase tracking-wider text-gray-500 px-1",
                      collapsed && "lg:hidden"
                    )}
                  >
                    {staffLabel}
                  </p>
                </div>
              )}

              {staffLinks.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={onClose}
                    title={link.label}
                    className={linkCls(active)}
                  >
                    <span className={iconWrapCls(active)}>{link.icon}</span>
                    <span className={cn("truncate", collapsed && "lg:hidden")}>
                      {link.label}
                    </span>
                    {collapsed && <span className={tooltipCls}>{link.label}</span>}
                  </Link>
                );
              })}
            </>
          )}
        </nav>
      </aside>
    </>
  );
}

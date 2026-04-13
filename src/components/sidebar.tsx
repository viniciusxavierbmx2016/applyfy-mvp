"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/stores/user-store";
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

const iconHome = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);
const iconProfile = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);
const iconDashboard = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);
const iconCourses = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);
const iconUsers = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);
const iconAnalytics = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3v18h18M7 15l3-3 3 3 5-5" />
  </svg>
);
const iconCommunity = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
  </svg>
);
const iconIntegrations = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);
const iconWorkspaces = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const studentLinks: NavLink[] = [
  { href: "/", label: "Vitrine", icon: iconHome },
  { href: "/profile", label: "Meu Perfil", icon: iconProfile },
];

const producerLinks: NavLink[] = [
  { href: "/admin", label: "Dashboard", icon: iconDashboard },
  { href: "/admin/workspaces", label: "Workspaces", icon: iconWorkspaces },
  { href: "/admin/courses", label: "Meus Cursos", icon: iconCourses },
  { href: "/admin/users", label: "Meus Alunos", icon: iconUsers },
  { href: "/admin/community", label: "Comunidade", icon: iconCommunity },
  { href: "/admin/collaborators", label: "Colaboradores", icon: iconUsers },
  { href: "/admin/integrations", label: "Integrações", icon: iconIntegrations },
];

const collaboratorLinks: NavLink[] = [
  { href: "/admin", label: "Dashboard", icon: iconDashboard },
  {
    href: "/admin/courses",
    label: "Cursos",
    icon: iconCourses,
    requires: "MANAGE_LESSONS",
  },
  {
    href: "/admin/users",
    label: "Alunos",
    icon: iconUsers,
    requires: "MANAGE_STUDENTS",
  },
  {
    href: "/admin/community",
    label: "Comunidade",
    icon: iconCommunity,
    requires: "MANAGE_COMMUNITY",
  },
  {
    href: "/admin/analytics",
    label: "Analytics",
    icon: iconAnalytics,
    requires: "VIEW_ANALYTICS",
  },
];

const adminLinks: NavLink[] = [
  { href: "/admin", label: "Dashboard", icon: iconDashboard },
  { href: "/admin/workspaces", label: "Workspaces", icon: iconWorkspaces },
  { href: "/admin/courses", label: "Cursos", icon: iconCourses },
  { href: "/admin/users", label: "Usuários", icon: iconUsers },
  { href: "/admin/analytics", label: "Analytics", icon: iconAnalytics },
  { href: "/admin/community", label: "Comunidade", icon: iconCommunity },
  { href: "/admin/integrations", label: "Integrações", icon: iconIntegrations },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, collaborator } = useUserStore();
  const isAdmin = user?.role === "ADMIN";
  const isProducer = user?.role === "PRODUCER";
  const isCollaborator = user?.role === "COLLABORATOR";

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
          "fixed top-0 left-0 z-50 h-full w-64 bg-gray-100 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-800">
          <Link href="/" className="text-xl font-bold text-gray-900 dark:text-white">
            Applyfy
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Menu
          </p>
          {!isCollaborator && studentLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                pathname === link.href
                  ? "bg-blue-600/10 text-blue-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800"
              )}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}

          {staffLinks && (
            <>
              <div className="pt-4 pb-2">
                <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {staffLabel}
                </p>
              </div>
              {isProducer && <WorkspaceSwitcher />}
              {staffLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    pathname === link.href ||
                      (link.href !== "/admin" && pathname.startsWith(link.href))
                      ? "bg-blue-600/10 text-blue-400"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800"
                  )}
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}
            </>
          )}
        </nav>
      </aside>
    </>
  );
}

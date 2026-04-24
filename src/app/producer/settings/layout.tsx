"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const tabs = [
  {
    key: "panel",
    label: "Personalizar Painel",
    href: "/producer/settings",
    exact: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M12 2a10 10 0 0 0 0 20 2 2 0 0 0 2-2v-1a2 2 0 0 1 2-2h1a2 2 0 0 0 2-2 10 10 0 0 0-7-13z" />
        <circle cx="8" cy="8" r="1" /><circle cx="12" cy="6" r="1" /><circle cx="16" cy="8" r="1" /><circle cx="9" cy="12" r="1" />
      </svg>
    ),
  },
  {
    key: "billing",
    label: "Assinatura",
    href: "/producer/settings/billing",
    exact: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
  {
    key: "collaborators",
    label: "Colaboradores",
    href: "/producer/settings/collaborators",
    exact: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    key: "integrations",
    label: "Integrações",
    href: "/producer/settings/integrations",
    exact: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
        <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
      </svg>
    ),
  },
];

const baseCls = "flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors";
const activeCls = "border-indigo-500 text-gray-900 dark:text-white";
const inactiveCls = "border-transparent text-gray-600 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-300";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  function isActive(tab: (typeof tabs)[number]) {
    if (tab.exact) return pathname === tab.href;
    return pathname.startsWith(tab.href);
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mb-1">
        Configurações
      </h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Gerencie seu painel, assinatura, colaboradores e integrações
      </p>

      <nav className="-mx-4 sm:mx-0 mb-6 border-b border-gray-200 dark:border-white/[0.06]">
        <div className="flex gap-1 px-4 sm:px-0 overflow-x-auto">
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              href={tab.href}
              className={`${baseCls} ${isActive(tab) ? activeCls : inactiveCls}`}
            >
              {tab.icon}
              {tab.label}
            </Link>
          ))}
        </div>
      </nav>

      {children}
    </div>
  );
}

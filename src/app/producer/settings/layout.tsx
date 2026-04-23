"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/producer/settings", label: "Geral", exact: true },
  { href: "/producer/settings/theme", label: "Tema" },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">
        Configurações
      </h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Gerencie seu workspace e personalize o visual do painel.
      </p>

      <div className="border-b border-gray-200 dark:border-white/[0.06] mb-6 flex gap-6">
        {TABS.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative px-0.5 py-2.5 text-sm font-medium transition-colors duration-200 ${
                active
                  ? "text-gray-900 dark:text-white"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {tab.label}
              {active && (
                <span className="absolute inset-x-0 -bottom-px h-[2px] bg-indigo-500 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/admin/settings", label: "Geral" },
  { href: "/admin/settings/security", label: "Segurança" },
];

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <div className="border-b border-gray-200 dark:border-white/[0.06] mb-6">
      <nav className="flex gap-6 -mb-px">
        {tabs.map((tab) => {
          const active =
            tab.href === "/admin/settings"
              ? pathname === "/admin/settings"
              : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "px-1 py-3 text-sm font-medium border-b-2 transition-colors",
                active
                  ? "border-blue-500 text-gray-900 dark:text-white"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { MenuIcon } from "./menu-icons";

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  url: string;
  isDefault: boolean;
  enabled: boolean;
}

interface CourseSummary {
  id: string;
  slug: string;
  title: string;
  workspaceName?: string | null;
  workspaceLogo?: string | null;
}

interface Props {
  course: CourseSummary;
  mobileOpen: boolean;
  onMobileClose: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function CourseSidebar({
  course,
  mobileOpen,
  onMobileClose,
  collapsed,
  onToggleCollapsed,
}: Props) {
  const pathname = usePathname();
  const [items, setItems] = useState<MenuItem[]>([]);

  useEffect(() => {
    fetch(`/api/courses/${course.id}/menu`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setItems(d.items || []))
      .catch(() => setItems([]));
  }, [course.id]);

  const widthClass = collapsed ? "lg:w-16" : "lg:w-60";

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-60 flex flex-col",
          "bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl",
          "border-r border-gray-200/70 dark:border-white/5",
          "transform transition-all duration-300 ease-in-out",
          "lg:translate-x-0 lg:static lg:z-auto",
          widthClass,
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "h-16 flex items-center relative",
            collapsed ? "lg:justify-center lg:px-2 px-5" : "px-5 justify-between"
          )}
        >
          <Link
            href={`/course/${course.slug}`}
            className={cn(
              "flex items-center gap-3 min-w-0 group",
              collapsed && "lg:justify-center lg:gap-0"
            )}
            onClick={onMobileClose}
            title={course.workspaceName || course.title}
          >
            {course.workspaceLogo ? (
              <Image
                src={course.workspaceLogo}
                alt={course.workspaceName || course.title}
                width={32}
                height={32}
                className="rounded-lg object-cover flex-shrink-0 ring-1 ring-black/5 dark:ring-white/10"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0 shadow-sm">
                {(course.workspaceName || course.title).charAt(0).toUpperCase()}
              </div>
            )}
            <span
              className={cn(
                "text-[15px] font-semibold tracking-tight text-gray-900 dark:text-white truncate",
                collapsed && "lg:hidden"
              )}
            >
              {course.workspaceName || course.title}
            </span>
          </Link>
          <button
            onClick={onMobileClose}
            className={cn(
              "lg:hidden text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors duration-200",
              collapsed && "hidden"
            )}
            aria-label="Fechar menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Desktop collapse toggle — discreet, top-right edge */}
        <button
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          className="hidden lg:flex absolute top-[52px] -right-3 z-50 items-center justify-center w-6 h-6 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 text-gray-500 hover:text-gray-900 dark:hover:text-white shadow-sm hover:shadow transition-all duration-200"
        >
          <svg
            className={cn("w-3 h-3 transition-transform duration-300", collapsed && "rotate-180")}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Voltar à vitrine */}
        <div className={cn("pt-3 pb-2", collapsed ? "lg:px-2 px-3" : "px-3")}>
          <Link
            href="/"
            onClick={onMobileClose}
            title="Voltar à vitrine"
            className={cn(
              "group relative flex items-center gap-2.5 rounded-[10px] text-[13px] font-medium text-gray-500 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-all duration-200",
              collapsed ? "lg:justify-center lg:p-2.5 px-3 py-2" : "px-3 py-2"
            )}
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className={cn(collapsed && "lg:hidden")}>Voltar à vitrine</span>
            {collapsed && (
              <span className="hidden lg:group-hover:block absolute left-full ml-2 px-2 py-1 text-xs rounded-md bg-gray-900 dark:bg-gray-800 text-white whitespace-nowrap z-50 pointer-events-none shadow-lg">
                Voltar à vitrine
              </span>
            )}
          </Link>
        </div>

        {/* Divider */}
        <div
          className={cn(
            "h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-white/10 to-transparent",
            collapsed ? "lg:mx-3 mx-4" : "mx-4"
          )}
        />

        {/* Nav */}
        <nav
          className={cn(
            "flex-1 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden",
            collapsed ? "lg:px-2 px-3" : "px-3"
          )}
        >
          {items
            .filter((i) => i.enabled)
            .map((item) => {
              const isExternal = /^https?:\/\//i.test(item.url);
              const href = isExternal
                ? item.url
                : item.url.startsWith("/")
                  ? item.url.replace(/\/:slug/g, course.slug)
                  : `/course/${course.slug}/${item.url}`;
              const isActive =
                !isExternal &&
                (pathname === href ||
                  (href !== `/course/${course.slug}` && pathname.startsWith(href)));
              const baseCls = cn(
                "group relative flex items-center gap-3 rounded-[10px] text-[14px] font-medium transition-all duration-200",
                collapsed ? "lg:justify-center lg:p-2.5 px-4 py-2.5" : "px-4 py-2.5",
                isActive
                  ? "bg-gray-900/5 dark:bg-white/10 text-gray-900 dark:text-white"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
              );
              const iconCls = cn(
                "flex-shrink-0 transition-colors duration-200",
                isActive
                  ? "text-gray-900 dark:text-white"
                  : "text-gray-400 dark:text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white"
              );
              const labelEl = (
                <span className={cn("truncate", collapsed && "lg:hidden")}>
                  {item.label}
                </span>
              );
              const tooltipEl = collapsed ? (
                <span className="hidden lg:group-hover:block absolute left-full ml-2 px-2 py-1 text-xs rounded-md bg-gray-900 dark:bg-gray-800 text-white whitespace-nowrap z-50 pointer-events-none shadow-lg">
                  {item.label}
                </span>
              ) : null;
              if (isExternal) {
                return (
                  <a
                    key={item.id}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={item.label}
                    className={baseCls}
                  >
                    <span className={iconCls}>
                      <MenuIcon name={item.icon} />
                    </span>
                    {labelEl}
                    {tooltipEl}
                  </a>
                );
              }
              return (
                <Link
                  key={item.id}
                  href={href}
                  onClick={onMobileClose}
                  title={item.label}
                  className={baseCls}
                >
                  <span className={iconCls}>
                    <MenuIcon name={item.icon} />
                  </span>
                  {labelEl}
                  {tooltipEl}
                </Link>
              );
            })}
        </nav>
      </aside>
    </>
  );
}
